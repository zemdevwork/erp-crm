'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Eye, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { getJobOrders } from '@/server/actions/job-order';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface JobOrder {
  id: string;
  jobCode: string;
  managerId: string;
  branchId: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  manager: {
    id: string;
    name: string;
    email: string;
  };
  branch: {
    id: string;
    name: string;
  };
  jobLeads: Array<{
    id: string;
    status: 'PENDING' | 'CLOSED';
    lead: {
      id: string;
      candidateName: string;
      phone: string;
      status: string;
    };
  }>;
  _count: {
    jobLeads: number;
  };
}

export default function CompletedJobOrdersPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch job orders
  const fetchJobOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getJobOrders({
        page: currentPage,
        limit: 10,
        completedOnly: true,
      });

      if (result.success) {
        const data = (result.data as JobOrder[]) || [];
        setJobOrders(data);
        setPagination(result.pagination || null);
      } else {
        toast.error(result.message || 'Failed to fetch job orders');
      }
    } catch {
      toast.error('Failed to fetch job orders');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  // Filter job orders by search term
  const filteredJobOrders = search
    ? jobOrders.filter(
        (jobOrder) =>
          jobOrder.jobCode.toLowerCase().includes(search.toLowerCase()) ||
          jobOrder.manager.name.toLowerCase().includes(search.toLowerCase()) ||
          jobOrder.branch.name.toLowerCase().includes(search.toLowerCase())
      )
    : jobOrders;

  // Fetch job orders on component mount and when filters change
  useEffect(() => {
    fetchJobOrders();
  }, [fetchJobOrders]);

  const handleViewJobOrder = (jobOrderId: string) => {
    router.push(`/enquiries/job-orders/${jobOrderId}`);
  };

  const getStatusCounts = (jobOrder: JobOrder) => {
    const pending = jobOrder.jobLeads.filter((jl) => jl.status === 'PENDING').length;
    const closed = jobOrder.jobLeads.filter((jl) => jl.status === 'CLOSED').length;
    return { pending, closed, total: jobOrder._count.jobLeads };
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Completed Job Orders</h1>
          <p className="text-gray-600">View closed job orders</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Search job orders by code, manager, or branch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by job code, manager, or branch..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Job Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Job Orders</CardTitle>
          <CardDescription>
            {pagination
              ? `Total: ${pagination.total} completed job orders${search ? ` (${filteredJobOrders.length} filtered)` : ''}`
              : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading job orders...</div>
            </div>
          ) : filteredJobOrders.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">
                {search ? 'No job orders match your search' : 'No completed job orders found'}
              </div>
            </div>
          ) : isMobile ? (
            <div className="space-y-4">
              {filteredJobOrders.map((jobOrder) => {
                const counts = getStatusCounts(jobOrder);
                return (
                  <Card key={jobOrder.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{jobOrder.jobCode}</h3>
                          <p className="text-sm text-muted-foreground">
                            {jobOrder.manager.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {jobOrder.branch.name}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewJobOrder(jobOrder.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Start Date:</span>
                          <p className="font-medium">{formatDate(jobOrder.startDate)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">End Date:</span>
                          <p className="font-medium">{formatDate(jobOrder.endDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Total: {counts.total}</Badge>
                        <Badge variant="secondary">Pending: {counts.pending}</Badge>
                        <Badge variant="default">Closed: {counts.closed}</Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Code</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobOrders.map((jobOrder) => {
                    const counts = getStatusCounts(jobOrder);
                    return (
                      <TableRow key={jobOrder.id}>
                        <TableCell className="font-medium">{jobOrder.jobCode}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{jobOrder.manager.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {jobOrder.manager.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{jobOrder.branch.name}</TableCell>
                        <TableCell>{formatDate(jobOrder.startDate)}</TableCell>
                        <TableCell>{formatDate(jobOrder.endDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{counts.total}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="text-xs">
                              C: {counts.closed}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewJobOrder(jobOrder.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(pagination.pages, p + 1))
                  }
                  disabled={currentPage === pagination.pages || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
