'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getUsers, assignEnquiry, bulkAssignEnquiries } from '@/server/actions/enquiry';
import { User } from '@/types/data-management';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AssignEnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiryId?: string;
  enquiryIds?: string[];
  currentAssigneeId?: string | null;
  onSuccess?: () => void;
  candidateName?: string;
}

export function AssignEnquiryDialog({
  open,
  onOpenChange,
  enquiryId,
  enquiryIds,
  currentAssigneeId,
  onSuccess,
  candidateName,
}: AssignEnquiryDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const result = await getUsers();
      if (result.success) {
        setUsers((result.data as User[]) || []);
      } else {
        toast.error(result.message || 'Failed to fetch users');
      }
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAssignUser = async (userId: string) => {
    setIsAssigning(true);
    try {
      let result;
      
      if (enquiryIds && enquiryIds.length > 0) {
        // Bulk assignment
        result = await bulkAssignEnquiries(enquiryIds, userId);
      } else if (enquiryId) {
        // Single assignment
        result = await assignEnquiry(enquiryId, userId);
      } else {
        toast.error('No enquiry selected');
        setIsAssigning(false);
        return;
      }

      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.message || 'Failed to assign enquiry');
      }
    } catch {
      toast.error('Failed to assign enquiry');
    } finally {
      setIsAssigning(false);
    }
  };

  const isBulk = !!(enquiryIds && enquiryIds.length > 0);
  const count = enquiryIds?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isBulk ? 'Bulk Assign Enquiries' : 'Assign Enquiry'}</DialogTitle>
          <DialogDescription>
            {isBulk
              ? `Assign ${count} selected enquiries to a user.`
              : candidateName
                ? `Assign ${candidateName} to a user.`
                : 'Select a user to assign this enquiry to.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoadingUsers ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length > 0 ? (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors hover:bg-muted",
                      currentAssigneeId === user.id ? "bg-muted border-primary/50" : "bg-card"
                    )}
                    onClick={() => handleAssignUser(user.id)}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    {currentAssigneeId === user.id && (
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    )}
                    {user.role && currentAssigneeId !== user.id && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">
                        {user.role.name}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No users found to assign.
            </div>
          )}

          {isAssigning && (
            <div className="flex items-center justify-center pt-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Assigning...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
