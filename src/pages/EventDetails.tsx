import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon
} from 'react-share';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Link as LinkIcon, Lock, Copy, MapPin, ShieldAlert, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@/types/events';
import { Loader2 } from 'lucide-react';

export const EventDetails: React.FC = () => {
  const { eventId } = useParams();
  const { toast } = useToast();
  const shareUrl = window.location.href;

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event-details', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error("Event ID is required");

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          host:host_id (
            username,
            avatar_url
          )
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;
      return data as Event;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <h2 className="text-2xl font-bold text-white mb-2">Event Not Found</h2>
        <p className="text-muted-foreground">The event you are looking for does not exist or has been removed.</p>
        <Button className="mt-4" onClick={() => window.location.href = '/'}>Go Home</Button>
      </div>
    );
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.name,
    "startDate": `${event.date}T${event.time}`,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
    "url": shareUrl,
    "organizer": {
      "@type": "Person",
      "name": event.host?.username || "Nexa Host"
    },
    "image": event.thumbnail_url || "https://nexaesports.com/default-event.png", // Fallback image
    "description": event.description || `Join ${event.name} hosted by ${event.host?.username || 'Nexa eSports'}.`
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied",
      description: "Event link copied to clipboard.",
    });
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Helmet>
        <title>{event.name} | Nexa eSports</title>
        <meta name="description" content={event.description || `Join ${event.name} - ${event.type} event.`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:title" content={`${event.name} | ${event.season ? event.season + ' | ' : ''}Nexa eSports`} />
        <meta property="og:description" content={event.description || `Join the ${event.name} on ${formatDate(event.date)}. Hosted by ${event.host?.username || 'Nexa eSports'}.`} />
        {event.thumbnail_url && <meta property="og:image" content={event.thumbnail_url} />}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={shareUrl} />
        <meta name="twitter:title" content={event.name} />
        <meta name="twitter:description" content={event.description || `Join ${event.name} now!`} />
        {event.thumbnail_url && <meta name="twitter:image" content={event.thumbnail_url} />}

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Card className="overflow-hidden bg-card/40 border-border/30 backdrop-blur-sm">
        <div className="relative h-64 md:h-80 w-full bg-black/50">
          {event.thumbnail_url ? (
            <img src={event.thumbnail_url} alt={event.name} className="w-full h-full object-cover opacity-80" />
          ) : (
             <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-900 to-gray-800">
               <span className="text-muted-foreground text-lg">No Thumbnail</span>
             </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 md:p-8">
             <Badge className="mb-2 bg-primary text-white hover:bg-primary/90">{event.type}</Badge>
             {event.season && <Badge variant="outline" className="ml-2 mb-2 border-white/20 text-white">{event.season}</Badge>}
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">{event.name}</h1>
          </div>
        </div>

        <CardContent className="p-6 md:p-8 space-y-8">
          
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
               <div className="flex items-start gap-4">
                  <Calendar className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-white">Date</h3>
                    <p className="text-muted-foreground">{formatDate(event.date)}</p>
                  </div>
               </div>
               
               <div className="flex items-start gap-4">
                  <Clock className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-white">Time</h3>
                    <p className="text-muted-foreground">{event.time} {event.end_time && `- ${event.end_time}`}</p>
                  </div>
               </div>

               <div className="flex items-start gap-4">
                  <Users className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-white">Host</h3>
                    <p className="text-muted-foreground">{event.host?.username || "Nexa eSports"}</p>
                  </div>
               </div>

                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-white">Lobbies</h3>
                    <p className="text-muted-foreground">{event.lobbies || 1} Lobby(s)</p>
                  </div>
               </div>
            </div>

            <div className="space-y-6">
              {event.room_link && (
                 <div className="flex items-start gap-4">
                  <LinkIcon className="w-6 h-6 text-primary mt-1" />
                  <div className="w-full">
                    <h3 className="font-semibold text-white">Room Link</h3>
                    <a href={event.room_link} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">
                      {event.room_link}
                    </a>
                  </div>
               </div>
              )}

              {(event.room_code || event.password) && (
                <div className="p-4 rounded-lg bg-background/50 border border-border/50 space-y-3">
                   {event.room_code && (
                     <div className="flex justify-between items-center">
                       <span className="text-muted-foreground">Room Code:</span>
                       <div className="flex items-center gap-2">
                         <code className="bg-black/30 px-2 py-1 rounded text-white">{event.room_code}</code>
                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            navigator.clipboard.writeText(event.room_code || "");
                            toast({ description: "Room code copied!" });
                         }}>
                            <Copy className="h-3 w-3" />
                         </Button>
                       </div>
                     </div>
                   )}
                   {event.password && (
                      <div className="flex justify-between items-center">
                       <span className="text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" /> Password:</span>
                       <code className="bg-black/30 px-2 py-1 rounded text-white">{event.password}</code>
                     </div>
                   )}
                </div>
              )}
               
               {event.compulsory && (
                 <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                   <ShieldAlert className="w-5 h-5" />
                   <span className="font-semibold">Compulsory Participation</span>
                 </div>
               )}

               {event.highlight_reel && (
                  <div className="flex items-start gap-4">
                    <Video className="w-6 h-6 text-primary mt-1" />
                    <div>
                        <h3 className="font-semibold text-white">Highlight Reel</h3>
                         <a href={event.highlight_reel} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">
                            Watch Highlights
                        </a>
                    </div>
                  </div>
               )}
            </div>
          </div>

          {event.description && (
            <div className="mt-8 pt-8 border-t border-border/30">
               <h3 className="text-lg font-semibold text-white mb-4">Event Details</h3>
               <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>
          )}

          {/* Social Share */}
          <div className="mt-8 pt-8 border-t border-border/30">
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Share Event</h3>
             <div className="flex flex-wrap gap-4">
                <Button variant="outline" className="gap-2" onClick={copyToClipboard}>
                   <Copy className="w-4 h-4" /> Copy Link
                </Button>
                
                <WhatsappShareButton url={shareUrl} title={event.name}>
                   <Button variant="outline" className="gap-2 bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20 hover:bg-[#25D366]/20">
                      <WhatsappIcon size={20} round /> WhatsApp
                   </Button>
                </WhatsappShareButton>

                <TwitterShareButton url={shareUrl} title={event.name}>
                   <Button variant="outline" className="gap-2 bg-[#1DA1F2]/10 text-[#1DA1F2] border-[#1DA1F2]/20 hover:bg-[#1DA1F2]/20">
                      <TwitterIcon size={20} round /> Twitter
                   </Button>
                </TwitterShareButton>

                 <FacebookShareButton url={shareUrl} hashtag="#NexaEsports">
                   <Button variant="outline" className="gap-2 bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20 hover:bg-[#1877F2]/20">
                      <FacebookIcon size={20} round /> Facebook
                   </Button>
                </FacebookShareButton>
                
                {/* Discord - just a visual button for now as react-share doesn't support generic link sharing to discord app directly without webhook/bot, but Copy Link usually suffices */}
                 <Button variant="outline" className="gap-2 bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/20 hover:bg-[#5865F2]/20" onClick={copyToClipboard}>
                     <svg className="w-5 h-5 fill-current" viewBox="0 0 127.14 96.36">
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.82,105.82,0,0,0,126.6,80.22c1.24-21.45-8.49-47.57-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                     </svg>
                     Discord
                </Button>

             </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};
