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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Eye, Edit, Trash2, MoreVertical, Plus, Copy } from 'lucide-react';
import { getExpensesAction } from '@/server/actions/expense-actions';
import { ExpenseFormDialog } from '@/components/expense/expense-form-dialog';
import { DeleteExpenseDialog } from '@/components/expense/delete-expense-dialog';
import { toast } from 'sonner';
import {
  ExpenseWithRelations,
  ExpenseCategory,
  ExpenseCategoryLabels,
  ExpenseCategoryColors
} from '@/types/expense';
import { formatCurrency, formatDate, truncateText } from '@/lib/utils';

export default function ExpensesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Fetch expenses data
  const fetchExpensesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getExpensesAction({
        page: currentPage,
        limit: 10,
        search: search || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      });

      if (result?.data?.success) {
        setExpenses(result.data.data || []);
        setPagination({
          page: currentPage,
          limit: 10,
          total: result.data.total || 0,
          pages: Math.ceil((result.data.total || 0) / 10),
        });
      } else {
        toast.error('Failed to fetch expenses');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to fetch expenses');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, categoryFilter]);

  // Fetch expenses on component mount and when filters change
  useEffect(() => {
    fetchExpensesData();
  }, [fetchExpensesData]);

  // Refresh function to be called after successful operations
  const refreshExpenses = useCallback(() => {
    fetchExpensesData();
  }, [fetchExpensesData]);

  // Action handlers
  const handleViewExpense = (expenseId: string) => {
    router.push(`/expenses/${expenseId}`);
  };

  const handleEditExpense = (expense: ExpenseWithRelations) => {
    setSelectedExpense(expense);
    setEditDialogOpen(true);
  };

  const handleDeleteExpense = (expenseId: string, title: string) => {
    setExpenseToDelete({ id: expenseId, title });
    setDeleteDialogOpen(true);
  };

  const handleDuplicateExpense = (expense: ExpenseWithRelations) => {
    setSelectedExpense({
      ...expense,
      id: '', // Clear ID for new expense
      title: `${expense.title} (Copy)`,
      expenseDate: new Date(),
    });
    setCreateDialogOpen(true);
  };

  // Handle search with debouncing
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value as ExpenseCategory | 'all');
    setCurrentPage(1); // Reset to first page when filtering
  };

  const getCategoryBadgeClass = (category: ExpenseCategory) => {
    return ExpenseCategoryColors[category] || 'bg-gray-100 text-gray-800';
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setSelectedExpense(null);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedExpense(null);
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600">Track and manage all business expenses</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter expenses by category or search by title, description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, description, notes..."
                className="pl-8"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(ExpenseCategoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
          <CardDescription>
            A list of all expenses with their details and amounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">Loading expenses...</div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">No expenses found</p>
                <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first expense
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {truncateText(expense.title, 30)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {expense.description
                          ? truncateText(expense.description, 40)
                          : '—'
                        }
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryBadgeClass(expense.category)}>
                          {ExpenseCategoryLabels[expense.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(expense.expenseDate)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {expense.createdBy.name}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewExpense(expense.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditExpense(expense)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateExpense(expense)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteExpense(expense.id, expense.title)}
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
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * 10 + 1} to{' '}
                    {Math.min(currentPage * 10, pagination.total)} of {pagination.total} expenses
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === pagination.pages}
                      onClick={() => setCurrentPage(currentPage + 1)}
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

      {/* Dialogs */}
      <ExpenseFormDialog
        open={createDialogOpen}
        onClose={handleCreateDialogClose}
        onSuccess={refreshExpenses}
        expense={selectedExpense}
        mode="create"
      />

      <ExpenseFormDialog
        open={editDialogOpen}
        onClose={handleEditDialogClose}
        onSuccess={refreshExpenses}
        expense={selectedExpense}
        mode="edit"
      />

      {expenseToDelete && (
        <DeleteExpenseDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setExpenseToDelete(null);
          }}
          onSuccess={refreshExpenses}
          expense={expenseToDelete}
        />
      )}
    </div>
  );
}