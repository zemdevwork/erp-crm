'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Eye, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { getFollowUps, updateFollowUp } from '@/server/actions/follow-up';
import { FOLLOW_UP_STATUS_OPTIONS } from '@/constants/enquiry';
import { FollowUpStatus, FollowUp } from '@/types/enquiry';
import { FollowUpMobileCard } from '@/components/follow-up/follow-up-mobile-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';

// Form schema for updating follow-up
const updateFollowUpSchema = z
  .object({
    outcome: z.string().max(1000).optional(),
    notes: z.string().max(1000).optional(),
    status: z.nativeEnum(FollowUpStatus),
    isReschedule: z.boolean().optional().default(false),
    rescheduledAt: z.string().optional(),
  })
  .refine(
    (data) => {
      // If reschedule is selected, rescheduledAt is required
      if (data.isReschedule && !data.rescheduledAt) {
        return false;
      }
      return true;
    },
    {
      message: 'New follow-up date is required when rescheduling',
      path: ['rescheduledAt'],
    }
  );

type UpdateFollowUpFormData = z.infer<typeof updateFollowUpSchema>;

export default function FollowUpsPage() {
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form
  const updateForm = useForm({
    resolver: zodResolver(updateFollowUpSchema),
    defaultValues: {
      isReschedule: false,
    },
  });

  // Fetch follow-ups
  const loadFollowUps = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: {
        page: number;
        limit: number;
        status?: FollowUpStatus[];
        overdue?: boolean;
      } = {
        page: 1,
        limit: 50,
      };

      if (filter === 'pending') {
        filters.status = [FollowUpStatus.PENDING];
      } else if (filter === 'overdue') {
        filters.overdue = true;
      } else if (filter === 'completed') {
        filters.status = [FollowUpStatus.COMPLETED];
      }

      const result = await getFollowUps(filters);
      if (result.success) {
        setFollowUps((result.data as FollowUp[]) || []);
      } else {
        toast.error(result.message || 'Failed to fetch follow-ups');
      }
    } catch {
      toast.error('Failed to fetch follow-ups');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  // Filter follow-ups by search term
  const filteredFollowUps = followUps.filter(
    (followUp) =>
      followUp.enquiry.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      followUp.enquiry.phone.includes(searchTerm)
  );

  const handleUpdateFollowUp = async (data: UpdateFollowUpFormData) => {
    if (!selectedFollowUp) return;

    setIsUpdating(true);
    try {
      interface UpdateData {
        id: string;
        status: FollowUpStatus;
        outcome?: string;
        notes?: string;
        rescheduledAt?: Date;
      }

      const updateData: UpdateData = {
        id: selectedFollowUp.id,
        status: data.status,
        outcome: data.outcome,
        notes: data.notes,
      };

      // If reschedule is selected, include the new date
      if (data.isReschedule && data.rescheduledAt) {
        updateData.rescheduledAt = new Date(data.rescheduledAt);
      }

      const result = await updateFollowUp(updateData);

      if (result.success) {
        toast.success(result.message);
        setIsUpdateDialogOpen(false);
        setSelectedFollowUp(null);
        updateForm.reset();
        loadFollowUps();
      } else {
        toast.error(result.message || 'Failed to update follow-up');
      }
    } catch {
      toast.error('Failed to update follow-up');
    } finally {
      setIsUpdating(false);
    }
  };

  const openUpdateDialog = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    updateForm.setValue('status', followUp.status as FollowUpStatus);
    updateForm.setValue('outcome', followUp.outcome || '');
    updateForm.setValue('notes', followUp.notes || '');
    updateForm.setValue('isReschedule', false);
    updateForm.setValue('rescheduledAt', '');
    setIsUpdateDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'RESCHEDULED':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const statusOption = FOLLOW_UP_STATUS_OPTIONS.find((option) => option.value === status);
    return statusOption
      ? `bg-${statusOption.color}-100 text-${statusOption.color}-800`
      : 'bg-gray-100 text-gray-800';
  };

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const isOverdue = (scheduledAt: string | Date, status: string) => {
    return new Date(scheduledAt) < new Date() && status === 'PENDING';
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Follow-ups</h1>
          <p className="text-gray-600">Manage your scheduled follow-ups</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter follow-ups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Follow-ups</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Follow-ups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-ups ({filteredFollowUps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFollowUps.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {isLoading ? 'Loading...' : 'No follow-ups found.'}
              </p>
            </div>
          ) : (
            <>
              {isMobile ? (
                // Mobile Card View
                <div className="space-y-4">
                  {filteredFollowUps.map((followUp) => (
                    <FollowUpMobileCard
                      key={followUp.id}
                      followUp={followUp}
                      onUpdate={openUpdateDialog}
                    />
                  ))}
                </div>
              ) : (
                // Desktop Table View
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFollowUps.map((followUp) => (
                      <TableRow key={followUp.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/enquiries/${followUp.enquiry.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {followUp.enquiry.candidateName}
                          </Link>
                        </TableCell>
                        <TableCell>{followUp.enquiry.phone}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{formatDateTime(followUp.scheduledAt)}</span>
                            {isOverdue(followUp.scheduledAt, followUp.status) && (
                              <Badge variant="destructive" className="w-fit mt-1">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(followUp.status)}
                            <Badge className={getStatusColor(followUp.status)}>
                              {FOLLOW_UP_STATUS_OPTIONS.find((opt) => opt.value === followUp.status)
                                ?.label || followUp.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">{followUp.notes || '-'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateDialog(followUp)}
                            >
                              Update
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/enquiries/${followUp.enquiry.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Follow-up</DialogTitle>
            <DialogDescription>
              Update the status and add outcome notes for this follow-up.
            </DialogDescription>
          </DialogHeader>
          {selectedFollowUp && (
            <form onSubmit={updateForm.handleSubmit(handleUpdateFollowUp)} className="space-y-4">
              <div className="space-y-2">
                <Label>Candidate</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedFollowUp.enquiry.candidateName} - {selectedFollowUp.enquiry.phone}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Scheduled</Label>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(selectedFollowUp.scheduledAt)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={updateForm.watch('status')}
                  onValueChange={(value) => updateForm.setValue('status', value as FollowUpStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOW_UP_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updateForm.formState.errors.status && (
                  <p className="text-sm text-red-500">
                    {updateForm.formState.errors.status.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="outcome">Outcome</Label>
                <Textarea
                  id="outcome"
                  placeholder="What was the outcome of this follow-up?"
                  {...updateForm.register('outcome')}
                />
                {updateForm.formState.errors.outcome && (
                  <p className="text-sm text-red-500">
                    {updateForm.formState.errors.outcome.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="updateNotes">Additional Notes</Label>
                <Textarea
                  id="updateNotes"
                  placeholder="Any additional notes..."
                  {...updateForm.register('notes')}
                />
                {updateForm.formState.errors.notes && (
                  <p className="text-sm text-red-500">
                    {updateForm.formState.errors.notes.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isReschedule"
                    checked={updateForm.watch('isReschedule')}
                    onCheckedChange={(checked) => {
                      updateForm.setValue('isReschedule', checked as boolean);
                      if (!checked) {
                        updateForm.setValue('rescheduledAt', '');
                      }
                    }}
                  />
                  <Label htmlFor="isReschedule" className="text-sm font-medium">
                    Reschedule this follow-up
                  </Label>
                </div>

                {updateForm.watch('isReschedule') && (
                  <div className="space-y-2 ml-6">
                    <Label htmlFor="rescheduledAt">New Follow-up Date & Time *</Label>
                    <Input
                      id="rescheduledAt"
                      type="datetime-local"
                      {...updateForm.register('rescheduledAt')}
                    />
                    {updateForm.formState.errors.rescheduledAt && (
                      <p className="text-sm text-red-500">
                        {updateForm.formState.errors.rescheduledAt.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update Follow-up'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
