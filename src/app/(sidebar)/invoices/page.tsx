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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import { getInvoices } from '@/server/actions/invoice-actions';
import { InvoiceFormDialog } from '@/components/invoice/invoice-form-dialog';
import { DeleteInvoiceDialog } from '@/components/invoice/delete-invoice-dialog';
import { toast } from 'sonner';
import { InvoiceWithItems, InvoiceStatus } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [invoices, setInvoices] = useState<InvoiceWithItems[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<{
    id: string;
    invoiceNumber: string;
  } | null>(null);

  // Fetch invoices
  const fetchInvoicesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getInvoices({
        page: currentPage,
        limit: 10,
        search: search || undefined,
      });

      if (result.data?.success) {
        setInvoices((result.data.data || []) as InvoiceWithItems[]);
        setPagination({
          page: currentPage,
          limit: 10,
          total: result.data.total || 0,
          pages: Math.ceil((result.data.total || 0) / 10),
        });
      } else {
        toast.error(result.data?.message || 'Failed to fetch invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search]);

  // Fetch invoices on component mount and when filters change
  useEffect(() => {
    fetchInvoicesData();
  }, [fetchInvoicesData]);

  // Refresh function to be called after successful invoice creation
  const refreshInvoices = useCallback(() => {
    fetchInvoicesData();
  }, [fetchInvoicesData]);

  // Action handlers for dropdown menu
  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/invoices/${invoiceId}`);
  };

  const handleEditInvoice = (invoice: InvoiceWithItems) => {
    setSelectedInvoice(invoice);
    setEditDialogOpen(true);
  };

  const handleDeleteInvoice = (invoiceId: string, invoiceNumber: string) => {
    setInvoiceToDelete({ id: invoiceId, invoiceNumber });
    setDeleteDialogOpen(true);
  };

  const handleGeneratePDF = async (invoiceId: string) => {
    try {
      toast.info('Opening PDF preview...');

      // Open PDF in new tab for preview
      const previewUrl = `/api/invoices/${invoiceId}/pdf?preview=true`;
      window.open(previewUrl, '_blank');

      toast.success('PDF preview opened in new tab!');
    } catch (error) {
      console.error('Error opening PDF preview:', error);
      toast.error(
        'Failed to open PDF preview: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case InvoiceStatus.SENT:
        return 'bg-blue-100 text-blue-800';
      case InvoiceStatus.PAID:
        return 'bg-green-100 text-green-800';
      case InvoiceStatus.OVERDUE:
        return 'bg-red-100 text-red-800';
      case InvoiceStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Manage and track all invoices</p>
        </div>
        <InvoiceFormDialog onSuccess={refreshInvoices} />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter invoices by status or search by invoice number, client name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number, client name..."
                className="pl-8"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline">Export</Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>A list of all invoices with their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="text-muted-foreground">
                  {isLoading ? 'Loading...' : 'No invoices found'}
                </div>
                {!isLoading && (
                  <div className="text-sm text-muted-foreground">
                    {search
                      ? 'Try adjusting your search criteria'
                      : 'Create your first invoice to get started'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Invoice Number</TableHead>
                    <TableHead className="w-[200px]">Billed To</TableHead>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px] text-right">Total Amount</TableHead>
                    <TableHead className="w-[100px]">Created By</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">{invoice.invoiceNumber}</div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={invoice.billedTo}>
                          {invoice.billedTo.split('\n')[0]}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {formatDate(invoice.invoiceDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatCurrency(invoice.totalAmount)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">{invoice.createdBy.name}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewInvoice(invoice.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGeneratePDF(invoice.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Preview PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteInvoice(invoice.id, invoice.invoiceNumber)}
                              className="text-red-600"
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

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * 10 + 1} to{' '}
                    {Math.min(currentPage * 10, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {pagination.pages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                      disabled={currentPage === pagination.pages}
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
      {selectedInvoice && (
        <InvoiceFormDialog
          mode="edit"
          invoice={selectedInvoice}
          onSuccess={refreshInvoices}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {/* Delete Dialog - Outside of dropdown to prevent unmounting */}
      {invoiceToDelete && (
        <DeleteInvoiceDialog
          invoiceId={invoiceToDelete.id}
          invoiceNumber={invoiceToDelete.invoiceNumber}
          onSuccess={() => {
            refreshInvoices();
            setInvoiceToDelete(null);
          }}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        />
      )}
    </div>
  );
}
