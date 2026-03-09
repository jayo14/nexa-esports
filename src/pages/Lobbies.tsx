import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addMinutes, formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  room_link: z.string().url("Enter a valid room link"),
  expiry_minutes: z.coerce.number().min(1).max(1440).default(30),
});

type LobbyInput = z.infer<typeof schema>;

export const Lobbies: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<LobbyInput>({
    resolver: zodResolver(schema),
    defaultValues: { room_link: "", expiry_minutes: 30 },
  });

  const { data: lobbies = [], isLoading } = useQuery({
    queryKey: ["lobbies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lobbies" as any)
        .select("id, creator_id, room_link, expires_at, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const createLobby = useMutation({
    mutationFn: async (values: LobbyInput) => {
      if (!user?.id) throw new Error("Not authenticated");
      const expiresAt = addMinutes(new Date(), values.expiry_minutes).toISOString();
      const { error } = await supabase.from("lobbies" as any).insert({
        creator_id: user.id,
        room_link: values.room_link,
        expires_at: expiresAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Lobby created", description: "Your room is now available." });
      form.reset({ room_link: "", expiry_minutes: 30 });
      queryClient.invalidateQueries({ queryKey: ["lobbies"] });
    },
    onError: (error: any) => {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
    },
  });

  const activeLobbies = useMemo(
    () => lobbies.filter((lobby: any) => new Date(lobby.expires_at) > new Date()),
    [lobbies]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Create Lobby</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((values) => createLobby.mutate(values))} className="grid md:grid-cols-3 gap-3">
            <Input placeholder="In-game room link" {...form.register("room_link")} />
            <Input type="number" placeholder="Expiry minutes" {...form.register("expiry_minutes")} />
            <Button type="submit" disabled={createLobby.isPending}>Create Lobby</Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">Default expiry: 30 minutes.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Available Lobbies</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p>Loading lobbies...</p> : (
            <div className="grid gap-3">
              {activeLobbies.length === 0 ? <p className="text-sm text-muted-foreground">No active lobbies right now.</p> : activeLobbies.map((lobby: any) => (
                <div key={lobby.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Creator: {lobby.creator_id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">Expires {formatDistanceToNow(new Date(lobby.expires_at), { addSuffix: true })}</p>
                  </div>
                  <Button asChild variant="outline"><a href={lobby.room_link} target="_blank" rel="noreferrer">Join</a></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
