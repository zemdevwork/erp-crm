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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { getUsers, assignEnquiry, bulkAssignEnquiries } from '@/server/actions/enquiry';
import { getAllBranches } from '@/server/actions/data-management';
import { Branch, User } from '@/types/data-management';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface AssignEnquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiryId?: string;
  enquiryIds?: string[];
  currentAssigneeId?: string | null;
  onSuccess?: () => void;
  candidateName?: string;
  fixedBranchId?: string;
  fixedBranchName?: string;
}

export function AssignEnquiryDialog({
  open,
  onOpenChange,
  enquiryId,
  enquiryIds,
  currentAssigneeId,
  onSuccess,
  candidateName,
  fixedBranchId,
  fixedBranchName,
}: AssignEnquiryDialogProps) {
  type AssignableUser = User & { branch?: string | null };

  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [jobName, setJobName] = useState('');
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (open) {
      initializeDialog();
    }
  }, [open]);

  useEffect(() => {
    if (open && fixedBranchId) {
      fetchUsers(fixedBranchId);
    }
    console.log(fixedBranchId)
  }, [open, fixedBranchId]);

  const initializeDialog = async () => {
    setSelectedUserId(null);
    setStartDate(undefined);
    setEndDate(undefined);
    setJobName('');
    setDescription('');
    setRemarks('');
    setUsers([]);
  };

  // Branch fetching removed entirely.

  const fetchUsers = async (branchId?: string) => {
    if (!branchId) return;
    setIsLoadingUsers(true);
    try {
      const result = await getUsers(branchId);
      if (result.success) {
        setUsers((result.data as AssignableUser[]) || []);
      } else {
        toast.error(result.message || 'Failed to fetch users');
      }
    } catch {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  // Ensure admin/manager are never listed (extra safety on top of server-side filter)
  const availableUsers = users.filter((user) => {
    const roleName =
      typeof (user as any).role === 'string'
        ? ((user as any).role as string)
        : (user as any).role?.name;

    const nameLower = (user.name || '').toLowerCase();
    const roleLower = (roleName || '').toLowerCase();

    if (roleLower === 'admin' || roleLower === 'manager') return false;
    if (nameLower === 'admin' || nameLower === 'manager') return false;

    return true;
  });

  const handleAssignUser = async () => {
    if (!fixedBranchId) {
      toast.error('Branch context missing. Cannot assign.');
      return;
    }

    if (!jobName.trim()) {
      toast.error('Please enter a job name');
      return;
    }

    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    if (!endDate) {
      toast.error('Please select an end date');
      return;
    }

    // Validate start date is not in the past
    const today = startOfDay(new Date());
    const start = startOfDay(startDate);

    if (start < today) {
      toast.error('Start date cannot be in the past');
      return;
    }

    if (startDate > endDate) {
      toast.error('Start date cannot be after end date');
      return;
    }

    setIsAssigning(true);
    try {
      let result;

      if (enquiryIds && enquiryIds.length > 0) {
        // Bulk assignment
        result = await bulkAssignEnquiries(
          enquiryIds,
          selectedUserId,
          startDate,
          endDate,
          fixedBranchId, // Use prop directly
          jobName.trim(),
          description || null,
          remarks || null
        );
      } else if (enquiryId) {
        // Single assignment
        result = await assignEnquiry(
          enquiryId,
          selectedUserId,
          startDate,
          endDate,
          fixedBranchId, // Use prop directly
          jobName.trim(),
          description || null,
          remarks || null
        );
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
      <DialogContent className="sm:max-w-[500px]">
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

        <div className="space-y-4 py-2">
          {/* Job Details */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="job-name">Job Name *</Label>
              <Input
                id="job-name"
                placeholder="Enter job name"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                disabled={isAssigning}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-description">Description (optional)</Label>
              <Textarea
                id="job-description"
                placeholder="Add a short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isAssigning}
                rows={3}
              />
            </div>
          </div>

          {/* Branch - Read Only View */}
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Input
              id="branch"
              value={fixedBranchName}
              disabled
              className="bg-muted text-muted-foreground"
            />
          </div>

            {/* User */}
            <div className="space-y-2">
              <Label htmlFor="assignee">User *</Label>
              <Select
                value={selectedUserId ?? ''}
                onValueChange={(value) => setSelectedUserId(value)}
                disabled={
                  isAssigning ||
                  isLoadingUsers ||
                  !fixedBranchId ||
                  availableUsers.length === 0
                }
              >
                <SelectTrigger id="assignee">
                  <SelectValue
                    placeholder={
                      isLoadingUsers
                        ? 'Loading...'
                        : !fixedBranchId
                          ? 'Missing branch context'
                          : availableUsers.length === 0
                            ? 'No users'
                            : 'Select user'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date *</Label> 
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                    disabled={isAssigning}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM dd, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => {
                      const today = startOfDay(new Date());
                      return date < today || (endDate ? date > endDate : false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                    disabled={isAssigning}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'MMM dd, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>



          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks (optional)</Label>
            <Textarea
              id="remarks"
              placeholder="Add any remark"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              disabled={isAssigning}
              rows={2}
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignUser}
              disabled={
                isAssigning ||
                !selectedUserId ||
                !startDate ||
                !endDate ||
                !fixedBranchId ||
                !jobName.trim()
              }
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Assigning...
                </>
              ) : (
                'Assign'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
