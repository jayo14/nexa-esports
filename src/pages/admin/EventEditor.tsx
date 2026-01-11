import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EventFormData } from "@/types/events";
import { Loader2, Upload, ArrowLeft, Save } from "lucide-react";

export const EventEditor: React.FC = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isEditMode = !!eventId;

  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EventFormData>({
    defaultValues: {
      name: "",
      type: "MP",
      season: "",
      date: "",
      time: "",
      end_time: "",
      description: "",
      status: "upcoming",
      host_id: profile?.id || "",
      lobbies: 1,
      teams: "",
      room_link: "",
      room_code: "",
      password: "",
      compulsory: false,
      public: false,
      thumbnail_url: "",
      highlight_reel: "",
    },
  });

  // Watch for controlled inputs
  const typeValue = watch("type");
  const statusValue = watch("status");
  const publicValue = watch("public");
  const compulsoryValue = watch("compulsory");
  const thumbnailUrlValue = watch("thumbnail_url");

  // Fetch event details if in edit mode
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isEditMode,
  });

  // Populate form when data is loaded
  useEffect(() => {
    if (eventData) {
      // @ts-ignore
      reset(eventData);
    } else if (profile?.id) {
      setValue("host_id", profile.id);
    }
  }, [eventData, profile, reset, setValue]);

  // Handle Image Upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("event-thumbnails")
        .upload(filePath, file);

      if (uploadError) {
        // Fallback if bucket doesn't exist or permissions fail, maybe try 'public' or just alert
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("event-thumbnails")
        .getPublicUrl(filePath);

      setValue("thumbnail_url", data.publicUrl);
      toast({
        title: "Success",
        description: "Thumbnail uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const payload = {
        ...data,
        updated_at: new Date().toISOString(),
        created_by: isEditMode ? undefined : profile?.id, // Keep original creator if editing
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("events")
          .update(payload)
          .eq("id", eventId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("events")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: isEditMode ? "Event Updated" : "Event Created",
        description: `Event has been ${isEditMode ? "updated" : "created"} successfully.`,
      });
      navigate("/admin/events");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    mutation.mutate(data);
  };

  if (isEditMode && isLoadingEvent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/events")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditMode ? "Edit Event" : "Create New Event"}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? "Update event details and settings" : "Schedule a new tournament or match"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Event Title *</Label>
              <Input
                id="name"
                {...register("name", { required: "Title is required" })}
                className="bg-background/50"
                placeholder="e.g. NeXa_Beta Battle Royal Training"
              />
              {errors.name && <span className="text-red-400 text-xs">{errors.name.message}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Event Type</Label>
              <Select
                value={typeValue}
                onValueChange={(value: any) => setValue("type", value)}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MP">Multiplayer</SelectItem>
                  <SelectItem value="BR">Battle Royale</SelectItem>
                  <SelectItem value="Tournament">Tournament</SelectItem>
                  <SelectItem value="Scrims">Scrims</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="season">Season (Optional)</Label>
              <Input
                id="season"
                {...register("season")}
                className="bg-background/50"
                placeholder="e.g. Season 3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                {...register("date", { required: "Date is required" })}
                className="bg-background/50"
              />
              {errors.date && <span className="text-red-400 text-xs">{errors.date.message}</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Start Time *</Label>
              <Input
                id="time"
                type="time"
                {...register("time", { required: "Time is required" })}
                className="bg-background/50"
              />
              {errors.time && <span className="text-red-400 text-xs">{errors.time.message}</span>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                {...register("end_time")}
                className="bg-background/50"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusValue}
                onValueChange={(value: any) => setValue("status", value)}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
             <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                className="bg-background/50 min-h-[100px]"
                placeholder="Event details, rules, and information..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Game Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <Label htmlFor="lobbies">Number of Lobbies</Label>
              <Input
                id="lobbies"
                type="number"
                min="1"
                {...register("lobbies", { valueAsNumber: true })}
                className="bg-background/50"
              />
            </div>

             <div className="space-y-2">
              <Label htmlFor="teams">Teams / Participation</Label>
              <Input
                id="teams"
                {...register("teams")}
                className="bg-background/50"
                placeholder="e.g. All Players, Squads Only"
              />
            </div>

             <div className="space-y-2">
              <Label htmlFor="room_link">Room Link</Label>
              <Input
                id="room_link"
                {...register("room_link")}
                className="bg-background/50"
                placeholder="https://..."
              />
            </div>

             <div className="space-y-2">
              <Label htmlFor="room_code">Room Code</Label>
              <Input
                id="room_code"
                {...register("room_code")}
                className="bg-background/50"
                placeholder="e.g. 2619305224"
              />
            </div>

             <div className="space-y-2">
              <Label htmlFor="password">Room Password</Label>
              <Input
                id="password"
                {...register("password")}
                className="bg-background/50"
                placeholder="e.g. 043"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
           <CardHeader>
            <CardTitle>Visibility & Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-center justify-between p-4 border border-border/30 rounded-lg bg-background/20">
              <div className="space-y-0.5">
                <Label className="text-base text-white">Public Event</Label>
                <p className="text-sm text-muted-foreground">
                  Make this event visible to everyone and generate a shareable public link.
                </p>
              </div>
              <Switch
                checked={publicValue}
                onCheckedChange={(val) => setValue("public", val)}
              />
            </div>

             <div className="flex items-center justify-between p-4 border border-border/30 rounded-lg bg-background/20">
              <div className="space-y-0.5">
                <Label className="text-base text-white">Compulsory Participation</Label>
                <p className="text-sm text-muted-foreground">
                  Mark this event as mandatory for all applicable members.
                </p>
              </div>
              <Switch
                checked={compulsoryValue}
                onCheckedChange={(val) => setValue("compulsory", val)}
              />
            </div>

            <div className="space-y-2">
              <Label>Event Thumbnail</Label>
              <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-border/50 rounded-lg bg-background/20">
                {thumbnailUrlValue ? (
                    <div className="relative w-full max-w-sm aspect-video rounded-md overflow-hidden">
                        <img src={thumbnailUrlValue} alt="Thumbnail" className="w-full h-full object-cover" />
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setValue("thumbnail_url", "")}
                        >
                            Remove
                        </Button>
                    </div>
                ) : (
                    <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                        <div className="mt-4 flex text-sm text-muted-foreground">
                            <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none"
                            >
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" disabled={uploading} />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                    </div>
                )}
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </div>

             <div className="space-y-2">
              <Label htmlFor="highlight_reel">Highlight Reel URL (Optional)</Label>
              <Input
                id="highlight_reel"
                {...register("highlight_reel")}
                className="bg-background/50"
                placeholder="YouTube / TikTok link"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
           <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/events")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending || uploading}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isEditMode ? "Save Changes" : "Create Event"}
          </Button>
        </div>
      </form>
    </div>
  );
};
