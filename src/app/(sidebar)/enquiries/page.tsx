'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, Eye, Edit, Trash2, MoreVertical, UserPlus, ListTodo, Briefcase } from 'lucide-react';
import { getEnquiries } from '@/server/actions/enquiry';
import { getAllBranches } from '@/server/actions/data-management';
import { ENQUIRY_STATUS_OPTIONS } from '@/constants/enquiry';
import { toast } from 'sonner';
import { EnquiryFormDialog } from '@/components/enquiry/enquiry-form-dialog';
import { DeleteEnquiryDialog } from '@/components/enquiry/delete-enquiry-dialog';
import { EnquiryMobileCard } from '@/components/enquiry/enquiry-mobile-card';
import { AssignEnquiryDialog } from '@/components/enquiry/assign-enquiry-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Enquiry } from '@/types/enquiry';
import { authClient } from '@/lib/auth-client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Branch } from '@prisma/client';

export default function EnquiriesPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { data: session } = authClient.useSession();
  const userRole = session?.user?.role?.toLowerCase();
  const canAssign = userRole === 'admin' || userRole === 'manager';
  
  // Debug: Log role for troubleshooting (remove in production)
  useEffect(() => {
    if (session?.user?.role) {
      console.log('User role:', session.user.role, 'canAssign:', canAssign);
    }
  }, [session?.user?.role, canAssign]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enquiryToDelete, setEnquiryToDelete] = useState<{
    id: string;
    candidateName: string;
  } | null>(null);

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [enquiryToAssign, setEnquiryToAssign] = useState<{
    id: string;
    candidateName: string;
    assignedToId?: string | null;
    branchId?: string | null;
    branchName?: string | null;
  } | null>(null);

  // Bulk assign state
  const [isBulkSelectionEnabled, setIsBulkSelectionEnabled] = useState(false);
  const [selectedEnquiryIds, setSelectedEnquiryIds] = useState<string[]>([]);
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [bulkAssignBranchId, setBulkAssignBranchId] = useState<string | null>(null);
  const [bulkBranchDialogOpen, setBulkBranchDialogOpen] = useState(false);

  // Filter states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      const result = await getAllBranches();
      if (result.success) {
        setBranches(result.data as Branch[]);
      }
    };
    fetchBranches();
  }, []);

  // Fetch enquiries
  const fetchEnquiriesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getEnquiries({
        page: currentPage,
        limit: 10,
        search: search || undefined,
        branchId: filterBranchId !== 'all' ? filterBranchId : undefined,
        isAssigned: filterAssigned === 'all' ? undefined : filterAssigned === 'assigned',
      });

      if (result.success) {
        setEnquiries((result.data as Enquiry[]) || []);
        setPagination(result.pagination || null);
      } else {
        toast.error(result.message || 'Failed to fetch enquiries');
      }
    } catch {
      toast.error('Failed to fetch enquiries');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, filterBranchId, filterAssigned]);

  // Fetch enquiries on component mount and when filters change
  useEffect(() => {
    fetchEnquiriesData();
  }, [fetchEnquiriesData]);

  // Refresh function to be called after successful enquiry creation
  const refreshEnquiries = useCallback(() => {
    fetchEnquiriesData();
    setSelectedEnquiryIds([]); // Clear selection on refresh
    setBulkAssignBranchId(null);
    setIsBulkSelectionEnabled(false);
  }, [fetchEnquiriesData]);

  // Bulk Action Handlers
  const toggleBulkSelection = () => {
    if (isBulkSelectionEnabled) {
      // Cancel selection
      setIsBulkSelectionEnabled(false);
      setSelectedEnquiryIds([]);
      setBulkAssignBranchId(null);
      if (filterBranchId === bulkAssignBranchId) {
        setFilterBranchId('all');
      }
    } else {
      if (userRole === 'admin' && filterBranchId === 'all') {
        setBulkBranchDialogOpen(true);
      } else {
        if (filterBranchId !== 'all') {
          setBulkAssignBranchId(filterBranchId);
        }
        setIsBulkSelectionEnabled(true);
      }
    }
  };

  const handleBulkBranchSelect = (branchId: string) => {
    setFilterBranchId(branchId);
    setFilterAssigned('unassigned');
    setBulkAssignBranchId(branchId);
    setIsBulkSelectionEnabled(true);
    setBulkBranchDialogOpen(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEnquiryIds(enquiries.map((e) => e.id));
    } else {
      setSelectedEnquiryIds([]);
    }
  };

  const handleSelectEnquiry = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedEnquiryIds((prev) => [...prev, id]);
    } else {
      setSelectedEnquiryIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkAssign = () => {
    setIsBulkAssignDialogOpen(true);
  };

  // Action handlers for dropdown menu
  const handleViewEnquiry = (enquiryId: string) => {
    router.push(`/enquiries/${enquiryId}`);
  };

  const handleEditEnquiry = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setEditDialogOpen(true);
  };

  const handleDeleteEnquiry = (enquiryId: string, candidateName: string) => {
    setEnquiryToDelete({ id: enquiryId, candidateName });
    setDeleteDialogOpen(true);
  };

  const handleAssignEnquiry = (enquiry: Enquiry) => {
    setEnquiryToAssign({
      id: enquiry.id,
      candidateName: enquiry.candidateName,
      assignedToId: enquiry.assignedTo?.id,
      branchId: enquiry.branchId,
      branchName: enquiry.branch?.name
    });
    setAssignDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    const statusOption = ENQUIRY_STATUS_OPTIONS.find((option) => option.value === status);
    return statusOption
      ? `bg-${statusOption.color}-100 text-${statusOption.color}-800`
      : 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  // Handle search with debouncing
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enquiries</h1>
          <p className="text-gray-600">Manage and track all customer enquiries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/enquiries/job-orders')}
          >
            <Briefcase className="mr-2 h-4 w-4" />
            Job Orders
          </Button>
          <EnquiryFormDialog mode="create" onSuccess={refreshEnquiries} />
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter enquiries by status, source, or search by name/phone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                className="pl-8"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            
            {/* Branch Filter (Admin Only) */}
            {userRole === 'admin' && (
              <div className="w-[180px]">
                <Select
                  value={filterBranchId}
                  onValueChange={(value) => {
                    setFilterBranchId(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Assigned Status Filter */}
            <div className="w-[150px]">
              <Select
                value={filterAssigned}
                onValueChange={(value) => {
                  setFilterAssigned(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {canAssign && (
              <>
                <Button 
                  variant={isBulkSelectionEnabled ? "secondary" : "outline"}
                  onClick={toggleBulkSelection}
                >
                  <ListTodo className="mr-2 h-4 w-4" />
                  {isBulkSelectionEnabled ? 'Cancel Selection' : 'Bulk Assign'}
                </Button>
                
                {/* Branch Selection Dialog for Bulk Assign */}
                <Dialog open={bulkBranchDialogOpen} onOpenChange={setBulkBranchDialogOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Select Branch</DialogTitle>
                      <DialogDescription>
                        Please select a branch to proceed with bulk assignment. All enquiries must belong to the same branch.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <Select
                        onValueChange={handleBulkBranchSelect}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </DialogContent>
                </Dialog>

                {isBulkSelectionEnabled && selectedEnquiryIds.length > 0 && (
                  <Button onClick={handleBulkAssign}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign Selected ({selectedEnquiryIds.length})
                  </Button>
                )}
              </>
            )}
            <Button variant="outline">Export</Button>
          </div>
        </CardContent>
      </Card>

      {/* Enquiries Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Enquiries</CardTitle>
          <CardDescription>A list of all enquiries with their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {enquiries.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="text-muted-foreground">
                  {isLoading ? 'Loading...' : 'No enquiries found'}
                </div>
                {!isLoading && (
                  <div className="text-sm text-muted-foreground">
                    {search
                      ? 'Try adjusting your search criteria'
                      : 'Create your first enquiry to get started'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {isMobile ? (
                // Mobile Card View
                <div className="space-y-4">
                  {enquiries.map((enquiry) => (
                    <EnquiryMobileCard
                      key={enquiry.id}
                      enquiry={enquiry}
                      onView={handleViewEnquiry}
                      onEdit={handleEditEnquiry}
                      onDelete={handleDeleteEnquiry}
                    />
                  ))}
                </div>
              ) : (
                // Desktop Table View
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isBulkSelectionEnabled && (
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={
                                enquiries.length > 0 &&
                                selectedEnquiryIds.length === enquiries.length
                              }
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                        )}
                        <TableHead className="w-[200px]">Candidate</TableHead>
                      <TableHead className="w-[120px]">Contact</TableHead>
                      <TableHead className="w-[150px]">Course</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[120px]">Source</TableHead>
                      <TableHead className="w-[120px]">Assigned To</TableHead>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enquiries.map((enquiry) => (
                      <TableRow key={enquiry.id} className="hover:bg-muted/50">
                        {isBulkSelectionEnabled && (
                          <TableCell>
                            <Checkbox
                              checked={selectedEnquiryIds.includes(enquiry.id)}
                              onCheckedChange={(checked) =>
                                handleSelectEnquiry(checked as boolean, enquiry.id)
                              }
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <div className="font-medium">{enquiry.candidateName}</div>
                            {enquiry.email && (
                              <div className="text-sm text-muted-foreground">{enquiry.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono">{enquiry.phone}</div>
                          {enquiry.contact2 && (
                            <div className="text-xs text-muted-foreground font-mono">
                              {enquiry.contact2}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {enquiry.preferredCourse?.name || (
                              <span className="text-muted-foreground italic">Not specified</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(enquiry.status)}>
                            {ENQUIRY_STATUS_OPTIONS.find((opt) => opt.value === enquiry.status)
                              ?.label || enquiry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{enquiry.enquirySource?.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {enquiry.assignedTo?.name || (
                              <span className="text-muted-foreground italic">Unassigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(enquiry.createdAt)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => handleViewEnquiry(enquiry.id)}
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleEditEnquiry(enquiry)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {canAssign && (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => handleAssignEnquiry(enquiry)}
                                >
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Assign
                                </DropdownMenuItem>
                              )}
                              {canAssign && <DropdownMenuSeparator />}
                              <DropdownMenuItem
                                onClick={() => handleDeleteEnquiry(enquiry.id, enquiry.candidateName)}
                                className="cursor-pointer text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {pagination && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= (pagination.pages || 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog - Outside of dropdown to prevent unmounting */}
      {selectedEnquiry && (
        <EnquiryFormDialog
          mode="edit"
          enquiry={selectedEnquiry}
          onSuccess={refreshEnquiries}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {/* Delete Dialog - Outside of dropdown to prevent unmounting */}
      {enquiryToDelete && (
        <DeleteEnquiryDialog
          enquiryId={enquiryToDelete.id}
          candidateName={enquiryToDelete.candidateName}
          onSuccess={() => {
            refreshEnquiries();
            setEnquiryToDelete(null);
          }}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        />
      )}

      {/* Assign Dialog */}
      {enquiryToAssign && (
        <AssignEnquiryDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          enquiryId={enquiryToAssign.id}
          currentAssigneeId={enquiryToAssign.assignedToId}
          candidateName={enquiryToAssign.candidateName}
          fixedBranchId={enquiryToAssign.branchId || undefined}
          fixedBranchName={enquiryToAssign.branchName || undefined}
          onSuccess={refreshEnquiries}
        />
      )}

      {/* Bulk Assign Dialog */}
      {isBulkSelectionEnabled && (
        <AssignEnquiryDialog
          open={isBulkAssignDialogOpen}
          onOpenChange={setIsBulkAssignDialogOpen}
          enquiryIds={selectedEnquiryIds}
          fixedBranchId={bulkAssignBranchId || undefined}
          fixedBranchName={branches.find(b => b.id === bulkAssignBranchId)?.name}
          onSuccess={() => {
            refreshEnquiries();
            setIsBulkSelectionEnabled(false);
            setBulkAssignBranchId(null);
          }}
        />
      )}
    </div>
  );
}
