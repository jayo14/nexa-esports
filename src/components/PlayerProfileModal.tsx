import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PlayerProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    player: {name:string; id:string} | null;
}

const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({open, onOpenChange, player}) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Update URL when modal opens with a player
    useEffect(() => {
      if (open && player?.id) {
        const currentPath = window.location.pathname;
        navigate(`${currentPath}?playerId=${player.id}`, { replace: true });
      } else if (!open) {
        // Remove query param when modal closes
        const currentPath = window.location.pathname;
        navigate(currentPath, { replace: true });
      }
    }, [open, player?.id, navigate]);

    // Handle direct URL access with playerId param
    useEffect(() => {
      const playerId = searchParams.get('playerId');
      if (playerId && !open) {
        // If there's a playerId in URL but modal is closed, we might need to fetch player data
        // For now, this is handled by the parent component
      }
    }, [searchParams, open]);

    if (!player) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-2 border-border text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-2xl">Player Profile</DialogTitle>
          <DialogDescription className="font-rajdhani text-base">
            You're viewing the profile for <strong>{player.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 font-rajdhani space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Player Name</p>
            <p className="text-lg font-semibold">{player.name}</p>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Player ID</p>
            <p className="text-base font-mono">{player.id}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button 
            onClick={() => onOpenChange(false)} 
            className="font-rajdhani flex-1 h-12"
            size="lg"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
)};

export default PlayerProfileModal;