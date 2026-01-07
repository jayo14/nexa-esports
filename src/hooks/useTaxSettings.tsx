import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useTaxSettings = () => {
    const [taxAmount, setTaxAmount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchTaxSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('taxes' as any)
                    .select('amount')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                setTaxAmount(data && typeof (data as any).amount === 'number' ? (data as any).amount : 0);
            } catch (error) {
                console.error('Error fetching tax settings:', error);
                toast({
                    title: "Error",
                    description: "Failed to fetch tax settings.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchTaxSettings();
    }, []);

    const updateTaxAmount = async (newAmount: number) => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('taxes' as any)
                .insert({ amount: newAmount });

            if (error) {
                throw error;
            }

            setTaxAmount(newAmount);
            toast({
                title: "Success",
                description: "Tax amount updated successfully.",
            });
        } catch (error) {
            console.error('Error updating tax amount:', error);
            toast({
                title: "Error",
                description: "Failed to update tax amount.",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return { taxAmount, loading, isUpdating, updateTaxAmount };
};
