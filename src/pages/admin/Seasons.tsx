import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useSeasons } from '@/hooks/useSeasons';
import { Calendar, Trophy, TrendingUp, Plus, Edit, Trash2, StopCircle } from 'lucide-react';
import { format } from 'date-fns';

export const AdminSeasons: React.FC = () => {
  const {
    seasons,
    seasonsLoading,
    activeSeason,
    createSeason,
    updateSeason,
    deleteSeason,
    endSeason,
    isCreating,
    isUpdating,
    isDeleting,
    isEnding,
  } = useSeasons();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<any>(null);
  const [formData, setFormData] = useState({
    season_number: '',
    name: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  const handleCreate = () => {
    const nextSeasonNumber = seasons.length > 0 
      ? Math.max(...seasons.map(s => s.season_number)) + 1 
      : 1;

    createSeason({
      season_number: parseInt(formData.season_number) || nextSeasonNumber,
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      description: formData.description || undefined,
    });

    setIsCreateDialogOpen(false);
    setFormData({
      season_number: '',
      name: '',
      start_date: '',
      end_date: '',
      description: '',
    });
  };

  const handleEdit = () => {
    if (!selectedSeason) return;

    updateSeason({
      id: selectedSeason.id,
      updates: {
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description,
      },
    });

    setIsEditDialogOpen(false);
    setSelectedSeason(null);
  };

  const handleDelete = () => {
    if (!selectedSeason) return;
    deleteSeason(selectedSeason.id);
    setIsDeleteDialogOpen(false);
    setSelectedSeason(null);
  };

  const handleEndSeason = () => {
    if (!selectedSeason) return;
    endSeason(selectedSeason.id);
    setIsEndDialogOpen(false);
    setSelectedSeason(null);
  };

  const openEditDialog = (season: any) => {
    setSelectedSeason(season);
    setFormData({
      season_number: season.season_number.toString(),
      name: season.name,
      start_date: season.start_date.split('T')[0],
      end_date: season.end_date.split('T')[0],
      description: season.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (season: any) => {
    setSelectedSeason(season);
    setIsDeleteDialogOpen(true);
  };

  const openEndDialog = (season: any) => {
    setSelectedSeason(season);
    setIsEndDialogOpen(true);
  };

  if (seasonsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold text-foreground mb-2">
            Clan Seasons Management
          </h1>
          <p className="text-muted-foreground font-rajdhani">
            Manage clan competitive seasons and track performance
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-rajdhani">
              <Plus className="mr-2 h-4 w-4" />
              Create Season
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-orbitron">Create New Season</DialogTitle>
              <DialogDescription className="font-rajdhani">
                Set up a new competitive season for the clan
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="season_number" className="font-rajdhani">
                  Season Number
                </Label>
                <Input
                  id="season_number"
                  type="number"
                  value={formData.season_number}
                  onChange={(e) =>
                    setFormData({ ...formData, season_number: e.target.value })
                  }
                  placeholder="Auto-generated if left empty"
                  className="font-rajdhani"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-rajdhani">
                  Season Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Season 2 - Warriors"
                  className="font-rajdhani"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date" className="font-rajdhani">
                    Start Date *
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="font-rajdhani"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date" className="font-rajdhani">
                    End Date *
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="font-rajdhani"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="font-rajdhani">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Season description and goals..."
                  className="font-rajdhani"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={!formData.name || !formData.start_date || !formData.end_date || isCreating}
                className="font-rajdhani"
              >
                {isCreating ? 'Creating...' : 'Create Season'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Season Card */}
      {activeSeason && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-orbitron">
              <Trophy className="h-5 w-5 text-primary" />
              Active Season
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-orbitron font-bold">
                    {activeSeason.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-rajdhani">
                    Season {activeSeason.season_number}
                  </p>
                </div>
                <Badge className="bg-green-500/20 text-green-500 border-green-500/50 font-rajdhani">
                  Active
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-rajdhani">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(activeSeason.start_date), 'MMM dd, yyyy')}
                </div>
                <span>—</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(activeSeason.end_date), 'MMM dd, yyyy')}
                </div>
              </div>
              {activeSeason.description && (
                <p className="text-sm text-muted-foreground font-rajdhani pt-2">
                  {activeSeason.description}
                </p>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(activeSeason)}
                  className="font-rajdhani"
                >
                  <Edit className="mr-2 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openEndDialog(activeSeason)}
                  className="font-rajdhani"
                >
                  <StopCircle className="mr-2 h-3 w-3" />
                  End Season
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Seasons */}
      <Card>
        <CardHeader>
          <CardTitle className="font-orbitron">All Seasons</CardTitle>
        </CardHeader>
        <CardContent>
          {seasons.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-rajdhani">
                No seasons created yet. Create your first season to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {seasons.map((season) => (
                <div
                  key={season.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-orbitron font-semibold">
                        {season.name}
                      </h4>
                      {season.is_active ? (
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/50 font-rajdhani">
                          Active
                        </Badge>
                      ) : new Date(season.end_date) < new Date() ? (
                        <Badge variant="outline" className="font-rajdhani">
                          Ended
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-rajdhani">
                          Scheduled
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-rajdhani">
                      Season {season.season_number} • {' '}
                      {format(new Date(season.start_date), 'MMM dd, yyyy')} -{' '}
                      {format(new Date(season.end_date), 'MMM dd, yyyy')}
                    </p>
                    {season.description && (
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        {season.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(season)}
                      className="font-rajdhani"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    {!season.is_active && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteDialog(season)}
                        className="font-rajdhani"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Edit Season</DialogTitle>
            <DialogDescription className="font-rajdhani">
              Update season information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_name" className="font-rajdhani">
                Season Name *
              </Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="font-rajdhani"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_start_date" className="font-rajdhani">
                  Start Date *
                </Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  className="font-rajdhani"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_end_date" className="font-rajdhani">
                  End Date *
                </Label>
                <Input
                  id="edit_end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  className="font-rajdhani"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_description" className="font-rajdhani">
                Description
              </Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="font-rajdhani"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleEdit}
              disabled={!formData.name || !formData.start_date || !formData.end_date || isUpdating}
              className="font-rajdhani"
            >
              {isUpdating ? 'Updating...' : 'Update Season'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron">
              Delete Season?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-rajdhani">
              This will permanently delete this season and all associated stats.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-rajdhani">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 font-rajdhani"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Season Confirmation Dialog */}
      <AlertDialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-orbitron">
              End Season?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-rajdhani">
              This will mark the current season as ended. You can create a new
              season to start fresh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-rajdhani">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndSeason}
              disabled={isEnding}
              className="font-rajdhani"
            >
              {isEnding ? 'Ending...' : 'End Season'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
