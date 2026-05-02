import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TransactionMonitorStatus = 'idle' | 'processing' | 'success' | 'failed' | 'expired' | 'error';

export interface TransactionMonitorState {
  status: TransactionMonitorStatus;
  message: string;
  newBalance: number | null;
  reference: string | null;
  transactionId: string | null;
}

const DEFAULT_STATE: TransactionMonitorState = {
  status: 'idle',
  message: '',
  newBalance: null,
  reference: null,
  transactionId: null,
};

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 5 * 60 * 1000;

export function useTransactionMonitor({
  enabled,
  transactionId,
  reference,
  checkoutOpen = true,
}: {
  enabled: boolean;
  transactionId: string | null;
  reference: string | null;
  checkoutOpen?: boolean;
}) {
  const [state, setState] = useState<TransactionMonitorState>(DEFAULT_STATE);

  useEffect(() => {
    if (!enabled || (!transactionId && !reference)) {
      setState(DEFAULT_STATE);
      return;
    }

    if (!checkoutOpen) {
      if (enabled) {
        setState({
          status: 'expired',
          message: 'Checkout was closed before confirmation.',
          newBalance: null,
          reference,
          transactionId,
        });
      }
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const updateState = (next: Partial<TransactionMonitorState>) => {
      if (cancelled) return;
      setState((prev) => ({ ...prev, ...next }));
    };

    const finish = (next: Partial<TransactionMonitorState>) => {
      if (cancelled) return;
      updateState(next);
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const poll = async () => {
      if (cancelled || !reference) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke('paga-verify-payment', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: {
          referenceNumber: reference,
          tx_ref: reference,
        },
      });

      if (cancelled) return;

      if (error) {
        finish({
          status: 'error',
          message: 'Unable to verify payment right now.',
          reference,
          transactionId,
        });
        return;
      }

      if (data?.status === 'success' || data?.status === 'completed') {
        finish({
          status: 'success',
          message: 'Deposit confirmed.',
          newBalance: typeof data.newBalance === 'number' ? data.newBalance : null,
          reference: data.reference || reference,
          transactionId: data.transactionId || transactionId,
        });
        return;
      }

      if (['failed', 'reversed', 'expired'].includes(data?.status)) {
        finish({
          status: data.status,
          message: data.message || 'Payment was not completed.',
          reference: data.reference || reference,
          transactionId: data.transactionId || transactionId,
        });
        return;
      }

      updateState({
        status: 'processing',
        message: 'Payment is still processing.',
        reference: data?.reference || reference,
        transactionId: data?.transactionId || transactionId,
        newBalance: typeof data?.newBalance === 'number' ? data.newBalance : null,
      });
    };

    void poll();
    intervalId = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);
    timeoutId = setTimeout(() => {
      finish({
        status: 'expired',
        message: 'Payment timed out while waiting for confirmation.',
        reference,
        transactionId,
      });
    }, MAX_WAIT_MS);

    if (transactionId) {
      const channel = supabase
        .channel(`wallet-tx-${transactionId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions', filter: `id=eq.${transactionId}` },
          (payload) => {
            const nextRow = payload.new as Record<string, unknown> | undefined;
            const nextState = String(nextRow?.wallet_state || nextRow?.status || '').toLowerCase();
            if (nextState === 'success' || nextState === 'completed') {
              finish({
                status: 'success',
                message: 'Deposit confirmed.',
                reference: reference || String(nextRow?.reference || nextRow?.paga_reference || ''),
                transactionId,
              });
            } else if (['failed', 'reversed', 'expired'].includes(nextState)) {
              finish({
                status: nextState as TransactionMonitorStatus,
                message: 'Payment was not completed.',
                reference: reference || String(nextRow?.reference || nextRow?.paga_reference || ''),
                transactionId,
              });
            } else {
              updateState({
                status: 'processing',
                message: 'Payment is still processing.',
                reference: reference || String(nextRow?.reference || nextRow?.paga_reference || ''),
                transactionId,
              });
            }
          }
        )
        .subscribe();

      return () => {
        cancelled = true;
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
        void supabase.removeChannel(channel);
      };
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkoutOpen, enabled, reference, transactionId]);

  return state;
}
