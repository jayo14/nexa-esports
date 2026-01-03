import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus,
  Search,
  Copy,
  Eye,
  User,
  Zap,
  Shield,
  Target,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Loadout {
  id: string;
  player_id: string;
  weapon_name: string;
  weapon_type: string;
  mode: string;
  attachments: any;
  description?: string;
  is_public: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    username: string;
    ign: string;
    status: string;
  };
}

export const Loadouts: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [selectedLoadout, setSelectedLoadout] = useState<Loadout | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<string>("all");
  const [showCommunity, setShowCommunity] = useState(false);
  const [viewFilter, setViewFilter] = useState<'my' | 'all'>('my'); // New filter for my/all loadouts

  const [formData, setFormData] = useState({
    weapon_name: "",
    weapon_type: "Assault Rifle",
    mode: "MP",
    description: "",
    attachments: {
      primary: "",
      secondary: "",
      optic: "",
      barrel: "",
      stock: "",
      underbarrel: "",
      magazine: "",
      rearGrip: "",
      laser: "",
      muzzle: "",
    },
    is_public: true,
  });

  // Fetch loadouts
  const { data: loadouts = [], isLoading } = useQuery({
    queryKey: ["loadouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loadouts")
        .select(
          `
          *,
          profiles (
            id,
            username,
            ign,
            status
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Loadout[];
    },
  });

  // Save loadout mutation
  const saveLoadoutMutation = useMutation({
    mutationFn: async (loadoutData: typeof formData) => {
      const { error } = await supabase.from("loadouts").insert([
        {
          ...loadoutData,
          player_id: profile?.id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loadouts"] });
      setIsCreating(false);
      setFormData({
        weapon_name: "",
        weapon_type: "Assault Rifle",
        mode: "MP",
        description: "",
        attachments: {
          primary: "",
          secondary: "",
          optic: "",
          barrel: "",
          stock: "",
          underbarrel: "",
          magazine: "",
          rearGrip: "",
          laser: "",
          muzzle: "",
        },
        is_public: true,
      });
      toast({
        title: "Loadout Created",
        description: "Your loadout has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Copy loadout mutation
  const copyLoadoutMutation = useMutation({
    mutationFn: async (loadout: Loadout) => {
      const { error } = await supabase.from("loadouts").insert([
        {
          weapon_name: loadout.weapon_name,
          weapon_type: loadout.weapon_type,
          mode: loadout.mode,
          attachments: loadout.attachments,
          description: `Copied from ${loadout.profiles.ign}'s loadout`,
          is_public: true,
          player_id: profile?.id,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loadouts"] });
      toast({
        title: "Loadout Copied",
        description: "Loadout has been copied to your collection.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to copy loadout",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveLoadoutMutation.mutate(formData);
  };

  const handleCopy = (loadout: Loadout) => {
    copyLoadoutMutation.mutate(loadout);
  };

  const handleView = (loadout: Loadout) => {
    setSelectedLoadout(loadout);
    setIsViewing(true);
  };

  // Filter loadouts based on view filter
  const isAdmin = profile?.role === 'admin' || profile?.role === 'clan_master';
  
  const myLoadouts = loadouts.filter(
    (loadout) =>
      loadout.player_id === profile?.id &&
      loadout.weapon_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (modeFilter === "all" || loadout.mode === modeFilter) &&
      (weaponTypeFilter === "all" || loadout.weapon_type === weaponTypeFilter)
  );

  const allLoadouts = loadouts.filter(
    (loadout) =>
      loadout.weapon_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (modeFilter === "all" || loadout.mode === modeFilter) &&
      (weaponTypeFilter === "all" || loadout.weapon_type === weaponTypeFilter)
  );

  const communityLoadouts = loadouts.filter(
    (loadout) =>
      loadout.player_id !== profile?.id &&
      loadout.is_public &&
      loadout.weapon_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (modeFilter === "all" || loadout.mode === modeFilter) &&
      (weaponTypeFilter === "all" || loadout.weapon_type === weaponTypeFilter)
  );

  const displayLoadouts = viewFilter === 'my' ? myLoadouts : allLoadouts;

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "MP":
        return "bg-blue-500/20 text-blue-400";
      case "BR":
        return "bg-orange-500/20 text-orange-400";
      case "Tournament":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getWeaponTypeColor = (type: string) => {
    switch (type) {
      case "Assault Rifle":
        return "bg-red-500/20 text-red-400";
      case "SMG":
        return "bg-green-500/20 text-green-400";
      case "Sniper":
        return "bg-purple-500/20 text-purple-400";
      case "LMG":
        return "bg-yellow-500/20 text-yellow-400";
      case "Shotgun":
        return "bg-orange-500/20 text-orange-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const weaponTypes = [
    "Assault Rifle",
    "SMG",
    "Sniper",
    "LMG",
    "Shotgun",
    "Marksman Rifle",
    "Pistol",
  ];
  const modes = ["MP", "BR"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-orbitron">
            Loadouts
          </h1>
          <p className="text-muted-foreground font-rajdhani">
            {viewFilter === 'my' ? 'Create and manage your weapon loadouts' : 'View and manage all player loadouts'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                onClick={() => setViewFilter('my')}
                variant={viewFilter === 'my' ? 'default' : 'outline'}
                className="font-rajdhani"
              >
                <User className="w-4 h-4 mr-2" />
                My Loadouts
              </Button>
              <Button
                onClick={() => setViewFilter('all')}
                variant={viewFilter === 'all' ? 'default' : 'outline'}
                className="font-rajdhani"
              >
                <Shield className="w-4 h-4 mr-2" />
                All Loadouts
              </Button>
            </div>
          )}
          <Button
            onClick={() => setShowCommunity(!showCommunity)}
            variant="outline"
            className="font-rajdhani"
          >
            {showCommunity ? "Hide Community" : "Browse Community"}
          </Button>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 font-rajdhani">
                <Plus className="w-4 h-4 mr-2" />
                Create Loadout
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-orbitron">
                  Create New Loadout
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weapon_name">Weapon Name</Label>
                    <Input
                      id="weapon_name"
                      value={formData.weapon_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          weapon_name: e.target.value,
                        }))
                      }
                      placeholder="AK-47"
                      className="bg-background/50"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="weapon_type">Weapon Type</Label>
                    <Select
                      value={formData.weapon_type}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, weapon_type: value }))
                      }
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weaponTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="mode">Game Mode</Label>
                    <Select
                      value={formData.mode}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, mode: value }))
                      }
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modes.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <Label>Attachments</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {Object.keys(formData.attachments).map((attachment) => (
                      <div key={attachment}>
                        <Label
                          htmlFor={attachment}
                          className="capitalize text-sm"
                        >
                          {attachment.replace(/([A-Z])/g, " $1")}
                        </Label>
                        <Input
                          id={attachment}
                          value={
                            formData.attachments[
                              attachment as keyof typeof formData.attachments
                            ]
                          }
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              attachments: {
                                ...prev.attachments,
                                [attachment]: e.target.value,
                              },
                            }))
                          }
                          placeholder={`Enter ${attachment}`}
                          className="bg-background/50"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe your loadout..."
                    className="bg-background/50"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    disabled={saveLoadoutMutation.isPending}
                  >
                    Create Loadout
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/30">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search loadouts..."
                className="pl-10 bg-background/50"
              />
            </div>
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-background/50">
                <SelectValue placeholder="Filter by mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                {modes.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={weaponTypeFilter}
              onValueChange={setWeaponTypeFilter}
            >
              <SelectTrigger className="w-full sm:w-48 bg-background/50">
                <SelectValue placeholder="Filter by weapon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Weapons</SelectItem>
                {weaponTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loadouts Grid */}
      <div className="space-y-6">
        {!showCommunity ? (
          <>
            <div>
              <h2 className="text-xl font-semibold text-foreground font-orbitron mb-4">
                {viewFilter === 'my' ? `My Loadouts (${displayLoadouts.length})` : `All Loadouts (${displayLoadouts.length})`}
              </h2>
              {displayLoadouts.length === 0 ? (
                <Card className="bg-card/50 border-border/30">
                  <CardContent className="p-8 text-center">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-rajdhani">
                      {viewFilter === 'my' ? 'No loadouts created yet.' : 'No loadouts found.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayLoadouts.map((loadout) => (
                    <Card
                      key={loadout.id}
                      className="bg-card/50 border-border/30 hover:border-primary/30 transition-colors"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg font-orbitron">
                              {loadout.weapon_name}
                            </CardTitle>
                            <div className="flex gap-2 mt-2">
                              <Badge className={getModeColor(loadout.mode)}>
                                {loadout.mode}
                              </Badge>
                              <Badge
                                className={getWeaponTypeColor(
                                  loadout.weapon_type
                                )}
                              >
                                {loadout.weapon_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {loadout.description && (
                          <p className="text-sm text-muted-foreground mb-3 font-rajdhani">
                            {loadout.description}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(loadout)}
                            className="flex-1"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold text-foreground font-orbitron mb-4">
                Community Loadouts ({communityLoadouts.length})
              </h2>
              {communityLoadouts.length === 0 ? (
                <Card className="bg-card/50 border-border/30">
                  <CardContent className="p-8 text-center">
                    <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-rajdhani">
                      No community loadouts found.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {communityLoadouts.map((loadout) => (
                    <Card
                      key={loadout.id}
                      className="bg-card/50 border-border/30 hover:border-primary/30 transition-colors"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg font-orbitron">
                              {loadout.weapon_name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground font-rajdhani">
                              by {loadout.profiles.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{loadout.profiles.ign}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge className={getModeColor(loadout.mode)}>
                                {loadout.mode}
                              </Badge>
                              <Badge
                                className={getWeaponTypeColor(
                                  loadout.weapon_type
                                )}
                              >
                                {loadout.weapon_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {loadout.description && (
                          <p className="text-sm text-muted-foreground mb-3 font-rajdhani">
                            {loadout.description}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(loadout)}
                            className="flex-1"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleCopy(loadout)}
                            disabled={copyLoadoutMutation.isPending}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* View Loadout Dialog */}
      <Dialog open={isViewing} onOpenChange={setIsViewing}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-orbitron">
              {selectedLoadout?.weapon_name}
              {selectedLoadout?.player_id !== profile?.id && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  by {selectedLoadout?.profiles.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{selectedLoadout?.profiles.ign}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedLoadout && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getModeColor(selectedLoadout.mode)}>
                  {selectedLoadout.mode}
                </Badge>
                <Badge
                  className={getWeaponTypeColor(selectedLoadout.weapon_type)}
                >
                  {selectedLoadout.weapon_type}
                </Badge>
              </div>

              {selectedLoadout.description && (
                <p className="text-muted-foreground font-rajdhani">
                  {selectedLoadout.description}
                </p>
              )}

              <div>
                <h3 className="text-lg font-semibold font-orbitron mb-3">
                  Attachments
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(selectedLoadout.attachments || {}).map(
                    ([key, value]) =>
                      value && (
                        <div
                          key={key}
                          className="flex justify-between items-center p-2 bg-background/30 rounded"
                        >
                          <span className="text-sm font-medium capitalize">
                            {key.replace(/([A-Z])/g, " $1")}:
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {String(value)}
                          </span>
                        </div>
                      )
                  )}
                </div>
              </div>

              {selectedLoadout.player_id !== profile?.id && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCopy(selectedLoadout)}
                    disabled={copyLoadoutMutation.isPending}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to My Loadouts
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
