import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSellerRequests } from '@/hooks/useSellerRequests';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export const SellerApproval: React.FC = () => {
  const { requests, isLoading, updateRequest, isUpdating } = useSellerRequests();
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; requestId: string | null }>({
    open: false,
    requestId: null,
  });
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = (id: string) => {
    updateRequest({ id, status: 'approved' });
  };

  const handleReject = () => {
    if (rejectDialog.requestId) {
      updateRequest({ id: rejectDialog.requestId, status: 'rejected', reason: rejectionReason });
      setRejectDialog({ open: false, requestId: null });
      setRejectionReason('');
    }
  };

  if (isLoading) {
    return <div>Loading requests...</div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pastRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-orbitron flex items-center gap-2">
            <User className="h-5 w-5" />
            Pending Seller Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground">No pending requests.</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={request.user?.avatar_url} />
                      <AvatarFallback>{request.user?.ign?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold font-orbitron">{request.user?.ign}</p>
                      <p className="text-sm text-muted-foreground">@{request.user?.username}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested: {format(new Date(request.created_at), 'PPp')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(request.id)}
                      disabled={isUpdating}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectDialog({ open: true, requestId: request.id })}
                      disabled={isUpdating}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-orbitron flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastRequests.length === 0 ? (
            <p className="text-muted-foreground">No history.</p>
          ) : (
            <div className="space-y-4">
              {pastRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={request.user?.avatar_url} />
                      <AvatarFallback>{request.user?.ign?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{request.user?.ign}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), 'PP')}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={request.status === 'approved' ? 'default' : 'destructive'}
                    className={request.status === 'approved' ? 'bg-green-500' : ''}
                  >
                    {request.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Seller Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, requestId: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim() || isUpdating}>
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
