import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { sendPushNotification, sendBroadcastPushNotification } from '@/lib/pushNotifications';
import { toast } from 'sonner';
import { Bell, BellRing, Send, Users, Smartphone } from 'lucide-react';

export const TestPushNotifications = () => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permissionState, testNotification } = usePushNotifications();
  const [title, setTitle] = useState('Test Notification');
  const [message, setMessage] = useState('This is a test push notification from NeXa Esports!');
  const [isSending, setIsSending] = useState(false);

  // Send local test notification (doesn't require server)
  const handleLocalTestNotification = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    if (!isSubscribed) {
      toast.error('Push notifications are not enabled. Please enable them in Settings.');
      return;
    }

    setIsSending(true);
    try {
      const success = await testNotification();
      if (success) {
        toast.success('Local test notification shown!');
      } else {
        toast.error('Failed to show local test notification');
      }
    } catch (error) {
      console.error('Error showing local test notification:', error);
      toast.error('Error showing local test notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!user) return;

    setIsSending(true);
    try {
      const success = await sendPushNotification([user.id], {
        title,
        message,
        data: {
          type: 'test',
          url: '/dashboard',
          timestamp: Date.now()
        }
      });

      if (success) {
        toast.success('Test notification sent successfully!');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Error sending test notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendBroadcastNotification = async () => {
    setIsSending(true);
    try {
      const success = await sendBroadcastPushNotification({
        title,
        message,
        data: {
          type: 'broadcast_test',
          url: '/announcements',
          timestamp: Date.now()
        }
      });

      if (success) {
        toast.success('Broadcast notification sent successfully!');
      } else {
        toast.error('Failed to send broadcast notification');
      }
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      toast.error('Error sending broadcast notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Test Push Notifications
        </CardTitle>
        <CardDescription>
          Send test notifications to verify the push notification system is working
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicators */}
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-1.5 text-sm">
            <div className={`w-2 h-2 rounded-full ${isSupported ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>Browser Support: {isSupported ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <div className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span>Subscribed: {isSubscribed ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <div className={`w-2 h-2 rounded-full ${permissionState === 'granted' ? 'bg-green-500' :
                permissionState === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
            <span>Permission: {permissionState}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notification Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter notification title"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Notification Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter notification message"
            rows={3}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleLocalTestNotification}
            disabled={isSending || !isSupported || !isSubscribed}
            variant="secondary"
            size="sm"
          >
            <Smartphone className="h-4 w-4 mr-1.5" />
            {isSending ? 'Testing...' : 'Local Test'}
          </Button>

          <Button
            onClick={handleSendTestNotification}
            disabled={isSending || !title || !message}
            variant="outline"
            size="sm"
          >
            <BellRing className="h-4 w-4 mr-1.5" />
            {isSending ? 'Sending...' : 'Send to Me'}
          </Button>

          <Button
            onClick={handleSendBroadcastNotification}
            disabled={isSending || !title || !message}
            variant="default"
            size="sm"
          >
            <Users className="h-4 w-4 mr-1.5" />
            {isSending ? 'Sending...' : 'Broadcast to All'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Note: Users must have enabled push notifications in their settings to receive notifications.
          The "Local Test" button shows a notification directly without going through the server.
        </p>
      </CardContent>
    </Card>
  );
};