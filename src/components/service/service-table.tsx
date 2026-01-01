"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Wrench,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  listStudents,
  listServices,
  listServiceBilling,
  totalListing,
  payServiceBilling,
} from "@/server/actions/service-actions";
import { ServiceBillingWithAdmission } from "@/types/service-billing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { z } from "zod";
import CreateServiceBillModal from "./create-service-bill";
import EditServiceBillModal from "./update-service-bill";
import DeleteServiceBillModal from "./delete-service-bill";
import { exportPdf, PdfColumn } from "./service-bill-pdf";
import PaymentModal from "./payment-service-bill";

interface Service {
  id: string;
  name: string;
  price: number;
}

const serviceBillSchema = z.object({
  admissionId: z.string().min(1, "Student selection is required"),
  serviceIds: z
    .array(z.string())
    .min(1, "At least one service must be selected"),
});

type ServiceBillForm = z.infer<typeof serviceBillSchema>;
type SortBy = "billDate" | "total";
type SortOrder = "asc" | "desc";

export default function ServiceTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("billDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [services, setServices] = useState<Service[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [selectedService, setSelectedService] = useState<string>("");
  const [deletingServiceBill, setDeletingServiceBill] =
    useState<ServiceBillingWithAdmission | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [editingServiceBill, setEditingServiceBill] =
    useState<ServiceBillingWithAdmission | null>(null);
  const [serviceBills, setServiceBills] = useState<
    ServiceBillingWithAdmission[]
  >([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Payment modal states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [payingServiceBill, setPayingServiceBill] =
    useState<ServiceBillingWithAdmission | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const serviceBillForm = useForm<ServiceBillForm>({
    resolver: zodResolver(serviceBillSchema),
    defaultValues: {
      admissionId: "",
      serviceIds: [],
    },
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  const fetchServiceBillsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listServiceBilling(
        currentPage,
        10,
        debouncedSearch,
        sortBy,
        sortOrder,
        selectedService
      );

      if (result.success && result.data) {
        setServiceBills(result.data.data);
        setPagination({
          page: result.data.pagination.page,
          limit: result.data.pagination.pageSize,
          total: result.data.pagination.total,
          pages: result.data.pagination.pages,
        });
      } else {
        setServiceBills([]);
        setPagination(null);
      }
    } catch (error) {
      console.error("Error fetching service bills:", error);
      setServiceBills([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, sortBy, sortOrder, selectedService]);

  const exportServiceBillsPdf = () => {
    if (!serviceBills || serviceBills.length === 0) {
      toast.error("No data to export");
      return;
    }

    const columns: PdfColumn<ServiceBillingWithAdmission>[] = [
      { header: "Bill ID", key: "id" },
      { header: "Candidate Name", key: (row) => row.admission.candidateName },
      {
        header: "Services",
        key: (row) =>
          row.services?.map((s) => s.name).join(", ") ||
          `${row.serviceIds.length} services`,
      },
      {
        header: "Bill Date",
        key: (row) => new Date(row.billDate).toLocaleDateString("en-US"),
      },
      { header: "Status", key: "status" },
      { header: "Total Amount", key: (row) => row.total.toFixed(2) },
      { header: "Balance", key: (row) => row.balance.toFixed(2) },
    ];

    exportPdf(
      serviceBills,
      columns,
      "service-bills.pdf",
      "Service Bills Report"
    );
  };

  const fetchTotalAmount = async () => {
    try {
      const result = await totalListing();
      if (result.success && result.data) {
        setTotalAmount(result.data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching total amount:", error);
    }
  };

  useEffect(() => {
    fetchTotalAmount();
  }, []);

  const loadFormData = async () => {
    try {
      const [studentsResult, servicesResult] = await Promise.all([
        listStudents(),
        listServices(),
      ]);

      if (studentsResult.success) {
      }
      if (servicesResult.success) {
        setServices(servicesResult.data);
      }
    } catch (error) {
      console.error("Failed to load form data", error);
      toast.error("Failed to load form data");
    }
  };

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: SortBy) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  useEffect(() => {
    fetchServiceBillsData();
  }, [fetchServiceBillsData]);

  const refreshServiceBills = useCallback(() => {
    fetchServiceBillsData();
    fetchTotalAmount();
  }, [fetchServiceBillsData]);

  const handleViewServiceBill = (serviceBillId: string) => {
    router.push(`/services/${serviceBillId}`);
  };

  const handleEditServiceBill = (serviceBill: ServiceBillingWithAdmission) => {
    setEditingServiceBill(serviceBill);
    serviceBillForm.reset({
      admissionId: serviceBill.admissionId,
      serviceIds: serviceBill.serviceIds,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteServiceBill = (
    serviceBill: ServiceBillingWithAdmission
  ) => {
    setDeletingServiceBill(serviceBill);
    setDeleteDialogOpen(true);
  };

  const handlePayServiceBill = (serviceBill: ServiceBillingWithAdmission) => {
    setPayingServiceBill(serviceBill);
    setPaymentDialogOpen(true);
  };

  const handleProcessPayment = async (amount: number, paymentMode?: string) => {
    if (!payingServiceBill) return;

    setIsProcessingPayment(true);

    try {
      const paymentPayload = {
        id: payingServiceBill.id,
        paid: amount,
        paymentMode: paymentMode,
      };

      const result = await payServiceBilling(paymentPayload);

      if (result.success) {
        toast.success(
          `Payment of ${formatCurrency(amount)} processed successfully!`
        );
        setPaymentDialogOpen(false);
        setPayingServiceBill(null);
        refreshServiceBills();
      } else {
        toast.error(result.message || "Failed to process payment");
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      toast.error("Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    const loadServices = async () => {
      try {
        const servicesResult = await listServices();
        if (servicesResult.success) {
          setServices(servicesResult.data);
        }
      } catch (error) {
        toast.error("Failed to load services for filter");
        console.error("Failed to load services for filter", error);
      }
    };

    loadServices();
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleClearFilter = () => {
    setSearch("");
    setSelectedService("");
    setCurrentPage(1);
  };

  const formatServiceTypes = (services?: Array<{ name: string }>) => {
    if (!services || services.length === 0)
      return { names: "No services", originalNames: "No services" };

    const originalserviceNames = services.map((s) => s.name).join(", ");
    const serviceNames = services.map((s) => s.name).join(", ");

    if (serviceNames.length > 30) {
      return {
        names: serviceNames.slice(0, 30) + "...",
        originalNames: originalserviceNames,
      };
    }

    return {
      names: serviceNames,
      originalNames: originalserviceNames,
    };
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Bills</h1>
          <p className="text-gray-600">
            Manage and track all service bills • Total Revenue:{" "}
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <Button
          onClick={() => {
            setDialogOpen(true);
            loadFormData();
          }}
        >
          <Wrench className="mr-2 h-4 w-4" />
          Create Service Bill
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters & Sorting</CardTitle>
          <CardDescription>
            Filter by candidate name, candidate Id or service name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by candidate name or candidate Id ..."
                className="pl-8"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={selectedService}
                onValueChange={(value) => {
                  setSelectedService(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleClearFilter}
                className="cursor-pointer"
                variant="outline"
              >
                Clear Filter
              </Button>
              <Button variant="outline" onClick={exportServiceBillsPdf}>
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Service Bills</CardTitle>
          <CardDescription>
            A list of all service bills with their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serviceBills.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Wrench className="h-12 w-12 text-muted-foreground/50" />
                <div className="text-muted-foreground">
                  {isLoading ? "Loading..." : "No service bills found"}
                </div>
                {!isLoading && (
                  <div className="text-sm text-muted-foreground">
                    {search
                      ? "Try adjusting your search criteria"
                      : "Create your first service bill to get started"}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Bill ID</TableHead>
                    <TableHead className="w-[160px]">Candidate Name</TableHead>
                    <TableHead className="w-[180px]">Services</TableHead>
                    <TableHead
                      className="w-[100px] cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("billDate")}
                    >
                      <div className="flex items-center">
                        Bill Date
                        {getSortIcon("billDate")}
                      </div>
                    </TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead
                      className="w-[100px] text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("total")}
                    >
                      <div className="flex items-center justify-end">
                        Total Amount
                        {getSortIcon("total")}
                      </div>
                    </TableHead>
                    <TableHead className="w-[100px] text-right">
                      Balance
                    </TableHead>
                    <TableHead className="w-[80px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceBills.map((serviceBill) => (
                    <TableRow
                      key={serviceBill.billId}
                      className="hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="font-medium text-xs">
                          {serviceBill.billId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="max-w-[160px] truncate"
                          title={serviceBill.admission.candidateName}
                        >
                          {serviceBill.admission.candidateName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="text-sm text-gray-600 max-w-[180px] truncate"
                          title={
                            serviceBill.services
                              ? formatServiceTypes(serviceBill.services)
                                  .originalNames
                              : `${serviceBill.serviceIds.length} services`
                          }
                        >
                          {serviceBill.services
                            ? formatServiceTypes(serviceBill.services).names
                            : `${serviceBill.serviceIds.length} services`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {formatDate(serviceBill.billDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="text-gray-800 rounded-2xl px-2 bg-gray-200">
                          {serviceBill.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          {formatCurrency(serviceBill.total)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className={`font-medium ${
                            serviceBill.balance > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {formatCurrency(serviceBill.balance)}
                        </div>
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
                            <DropdownMenuItem
                              onClick={() =>
                                handleViewServiceBill(serviceBill.id)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditServiceBill(serviceBill)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {serviceBill.balance > 0 && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handlePayServiceBill(serviceBill)
                                }
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Pay
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeleteServiceBill(serviceBill)
                              }
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

              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * 10 + 1} to{" "}
                    {Math.min(currentPage * 10, pagination.total)} of{" "}
                    {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
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
                      onClick={() =>
                        setCurrentPage(
                          Math.min(pagination.pages, currentPage + 1)
                        )
                      }
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

      {payingServiceBill && (
        <PaymentModal
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          customerName={payingServiceBill.admission.candidateName}
          totalAmount={payingServiceBill.total}
          paidAmount={payingServiceBill.paid}
          balance={payingServiceBill.balance}
          onProcessPayment={handleProcessPayment}
          isProcessing={isProcessingPayment}
        />
      )}

      <CreateServiceBillModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refreshServiceBills}
      />
      <EditServiceBillModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        serviceBill={editingServiceBill}
        onSuccess={refreshServiceBills}
      />
      <DeleteServiceBillModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        serviceBill={deletingServiceBill}
        onSuccess={refreshServiceBills}
      />
    </div>
  );
}
