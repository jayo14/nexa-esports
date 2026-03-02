import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';

type ErrorLogRow = {
  id: string;
  created_at: string;
  error_type: string;
  message: string;
  path: string | null;
};

export const Health: React.FC = () => {
  const telemetryClient = supabase as any;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['health-error-logs'],
    queryFn: async () => {
      const { data, error } = await telemetryClient
        .from('app_error_logs')
        .select('id, created_at, error_type, message, path')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as ErrorLogRow[];
    },
  });

  return (
    <div className="space-y-6 p-1">
      <div>
        <h1 className="text-3xl font-bold text-white">System Health</h1>
        <p className="text-muted-foreground mt-1">Crash telemetry overview</p>
      </div>

      <Card className="bg-card/60 border-border/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-white text-base">Latest 20 Crash Logs</CardTitle>
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No crash logs recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg border border-border/40 bg-background/40 p-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-1">
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                    <span className="uppercase tracking-wide text-red-300">{log.error_type}</span>
                    {log.path && <span className="text-blue-300">{log.path}</span>}
                  </div>
                  <p className="text-sm text-white break-words">{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
