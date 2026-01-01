"use server";
import prisma from "@/lib/prisma";
import { CreateServiceBilling , DeleteServiceBilling, UpdateServiceBilling , ServiceBilling, ServiceBillingWithAdmission, PayServiceBilling } from "@/types/service-billing";
import type { Prisma, ServiceBillItem } from "@prisma/client";

interface ActionResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

function generateServiceBillNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");

  return `SB-${year}${month}${day}-${random}`;
}


export async function listServiceBilling(
    page = 1,
    pageSize = 10,
    searchQuery = "",
    sortBy: 'billDate' | 'total' = 'billDate',
    sortOrder: 'asc' | 'desc' = 'desc',
    serviceId = "",
): Promise<ActionResponse<{ data: ServiceBillingWithAdmission[]; pagination: { page: number; pageSize: number; total: number; pages: number } }>> {
    try {
        const skip = (page - 1) * pageSize;
        const orderBy = { [sortBy]: sortOrder };

        // Build where clause for filtering
        const whereClause: Prisma.ServiceBillWhereInput = {};

        // Search by candidate name or admission number
        if (searchQuery.trim()) {
            whereClause.admission = {
                OR: [
                    {
                        candidateName: {
                            contains: searchQuery,
                            mode: 'insensitive'
                        }
                    },
                    {
                        admissionNumber: {
                            contains: searchQuery,
                            mode: 'insensitive'
                        }
                    }
                ]
            };
        }

        // Filter by specific service
        if (serviceId && serviceId.trim() && serviceId !== "all") {
            whereClause.serviceIds = {
                has: serviceId // MongoDB array contains query
            };
        }

        // Get total count for pagination with the same filters
        const totalCount = await prisma.serviceBill.count({
            where: whereClause,
        });

        // Fetch service bills with filters
        const serviceBilling = await prisma.serviceBill.findMany({
            skip,
            take: pageSize,
            where: whereClause,
            include: {
                admission: {
                    select: {
                        id: true,
                        candidateName: true,
                        admissionNumber: true,
                    },
                },
            },
            orderBy,
        });

        // Fetch service details for each bill - only the services that are in the bill
        const serviceBillingWithServices = await Promise.all(
            serviceBilling.map(async (bill) => {
                // The 'bill' object already contains 'paid' and 'balance' from the ServiceBill model.
                
                // Only fetch services that are in this specific bill's serviceIds
                const services = await prisma.service.findMany({
                    where: {
                        id: {
                            in: bill.serviceIds
                        }
                    },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                    },
                });

                return {
                    ...bill, // This spreads all ServiceBill fields, including 'paid' and 'balance'
                    services, 
                };
            })
        );

        const totalPages = Math.ceil(totalCount / pageSize);

        return {
            success: true,
            message: "Service billing fetched successfully",
            data: {
                data: serviceBillingWithServices as ServiceBillingWithAdmission[],
                pagination: {
                    page,
                    pageSize,
                    total: totalCount,
                    pages: totalPages,
                },
            },
        };
    } catch (error) {
        console.error("Error fetching service billing:", error);
        return {
            success: false,
            message: "Failed to fetch service billing",
            data: {
                data: [],
                pagination: {
                    page,
                    pageSize,
                    total: 0,
                    pages: 0,
                },
            },
        };
    }
}

export async function createServiceBilling(input: CreateServiceBilling): Promise<ActionResponse<ServiceBilling | null>> {
    try {
        if(!input.serviceIds || !input.admissionId){
            return {
                success: false,
                message: "Service ids, total and admission id are required",
                data:null,
            };
        }
        const existingBill = await prisma.serviceBill.findFirst({
            where: {
                admissionId: input.admissionId,
            },
        })
        if(existingBill){
            return {
                success: false,
                message: "Service billing already exists for this admission",
                data:null,
            };
        }
        const billId = generateServiceBillNumber();

        const services = await prisma.service.findMany({
            where: {
                id: {
                    in: input.serviceIds
                }
            },
            select: {
                price: true,
            },
        })

        const total = services.reduce((total, service) => total + service.price, 0);

        const isPaid = input.paid !== undefined && input.paid > 0;

        let status : "PAID" | "UNPAID" | "PARTIALLY_PAID" = "UNPAID";
        let balance : number = total;

        if (isPaid && input.paid && input.paid > 0) {
            if(input.paid >= total){
                status = "PAID";
                balance = 0;
            }else{
                status = "PARTIALLY_PAID";
                balance = total - input.paid;
            }

        }

        const createData = {
            billId: billId,
            serviceIds: input.serviceIds,
            total: total,
            billDate: input.billDate,
            admissionId: input.admissionId,
            status: status,
            balance: balance,
            ...(isPaid && { paid: input.paid }),
        };

        const serviceBilling = await prisma.serviceBill.create({
            data: createData,
        });

        if(!serviceBilling){
            return {
                success: false,
                message: "Failed to create service billing",
                data:null,
            };
        }

        if(isPaid && input.paid && input.paid > 0){
            const serviceBillItem = await prisma.serviceBillItem.create({
            data:{
                serviceBillId: serviceBilling.id,
                amount:input.paid,
                ...(input.paymentMode && { paymentMode: input.paymentMode }),
            }
        })

        if(!serviceBillItem){
            return {
                success: false,
                message: "Failed to create service billing item",
                data:null,
            }
        }
        }

        return {
            success: true,
            message: "Service billing created successfully",
            data: serviceBilling,
        };
    } catch (error) {
        console.error("Error creating service billing:", error);
        return {
            success: false,
            message: "Failed to create service billing due to an internal error.",
            data: null,
        }
    }
}


export async function updateServiceBilling(input: UpdateServiceBilling): Promise<ActionResponse<ServiceBilling | null>> {
    try {
        if(!input.id){
            return {
                success: false,
                message: "Service billing id is required",
                data:null,
            };
        }
        const serviceBilling = await prisma.serviceBill.update({
            where: { id: input.id },
            data: {
                serviceIds: input.serviceIds,
            },
        });
        if(!serviceBilling){
            return {
                success: false,
                message: "Failed to update service billing",
                data:null,
            };
        }

        return {
            success: true,
            message: "Service billing updated successfully",
            data: serviceBilling,
        };
    } catch (error) {
        console.error("Error updating service billing:", error);
        return {
            success: false,
            message: "Failed to update service billing",
        }
    }
}


export async function getServiceBillHistory(id: string) : Promise<ActionResponse<ServiceBillItem[]>> {
    try {
        const serviceBillHistory = await prisma.serviceBillItem.findMany({
            where: { serviceBillId: id },
            orderBy: { createdAt: "desc" },
        });
        return {
            success: true,
            message: "Service bill history fetched successfully",
            data: serviceBillHistory,
        };
    } catch (error) {
        console.error("Error fetching service bill history:", error);
        return {
            success: false,
            message: "Failed to fetch service bill history",
        };
    }
}

export async function payServiceBilling(input: PayServiceBilling): Promise<ActionResponse<ServiceBilling | null>> {
    try {
        const existingBill = await prisma.serviceBill.findUnique({
            where: { id: input.id },
        });

        if (!existingBill) {
            return {
                success: false,
                message: "Service bill not found.",
                data: null,
            };
        }

        const newTotalPaid = existingBill.paid + input.paid;
        
        const newBalance = existingBill.total - newTotalPaid;

        let newStatus = existingBill.status; 
        if (newBalance <= 0) {
            newStatus = "PAID";
        } else if (newTotalPaid > 0) {
            newStatus = "PARTIALLY_PAID";
        }

        const serviceBilling = await prisma.serviceBill.update({
            where: { id: input.id },
            data: {
                paid: newTotalPaid,
                balance: newBalance,
                status: newStatus,
            },
        });

        if(!serviceBilling){
            return {
                success: false,
                message: "Failed to update service billing",
                data:null,
            };
        }

        if(input.paid > 0){
            const serviceBillItem = await prisma.serviceBillItem.create({
                data:{
                    serviceBillId: serviceBilling.id,
                    amount:input.paid,
                    ...(input.paymentMode && { paymentMode: input.paymentMode }), 
                }
            })

            if(!serviceBillItem){
                return {
                    success: false,
                    message: "Failed to create service billing item",
                    data:null,
                }
            }
        }

        return {
            success: true,
            message: "Payment successfully processed.",
            data: serviceBilling,
        };
    } catch (error) {
        console.error("Error processing payment:", error);
        return {
            success: false,
            message: "Failed to process payment due to a server error.",
            data: null,
        }
    }
}

export async function getServiceBillByStudentId(studentId: string): Promise<ActionResponse<ServiceBilling | null>> {
    try {
        const serviceBill = await prisma.serviceBill.findFirst({
            where: { admissionId: studentId },
        });
        if (!serviceBill) {
            return {
                success: false,
                message: "Service billing not found",
                data: null,
            };
        }
        return {
            success: true,
            message: "Service billing fetched successfully",
            data: serviceBill,
        };
    } catch (error) {
        console.error("Error fetching service billing:", error);
        return {
            success: false,
            message: "Failed to fetch service billing",
        };
    }
}

export async function deleteServiceBilling(input: DeleteServiceBilling): Promise<ActionResponse<boolean>> {
    try {
        await prisma.serviceBill.delete({
            where: { id: input.id },
        });
        return {
            success: true,
            message: "Service billing deleted successfully",
            data: true,
        };
    } catch (error) {
        console.error("Error deleting service billing:", error);
        throw new Error("Failed to delete service billing");
    }
}


export async function listStudents(){
    try {
        const students = await prisma.admission.findMany({
            where:{
                status:{
                    not: "CANCELLED"
                }
            },
            select:{
                id:true,
                candidateName: true
            }
        });
        return {
            success: true,
            message: "Students fetched successfully",
            data: students,
        };
    } catch (error) {
        console.error("Error fetching students:", error);
        throw new Error("Failed to fetch students");
    }
}

export async function listServices(){
    try {
        const services = await prisma.service.findMany({
            select:{
            id: true,
            name: true,
            price:true
            }
        });
        return {
            success: true,
            message: "Services fetched successfully",
            data: services,
        };
    } catch (error) {
        console.error("Error fetching services:", error);
        throw new Error("Failed to fetch services");
    }
}


export async function totalListing(){
    try{
        const total = await prisma.serviceBill.aggregate({
            _sum: {
                total: true
            }
        });

        return {
            success: true,
            message: "Total listing fetched successfully",
            data: {
                total: total._sum.total
            }
        };
    }catch(error){
        console.error("Error fetching total listing:", error);
        throw new Error("Failed to fetch total listing");
    }
} 


export async function getServiceBillById(id: string) {
  if (!id) return null;
  try {
    const serviceBill = await prisma.serviceBill.findUnique({
      where: { id },
    });
    return {
      success: true,
      message: "Service bill fetched successfully",
      data: serviceBill,
    }
  } catch (error) {
    console.error(`Failed to fetch service bill [${id}]:`, error);
    return {
      success: false,
      message: "Failed to fetch service bill",
    };
  }
}

export async function getServicesByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  try {
    const services = await prisma.service.findMany({
      where: {
        id: { in: ids },
      },
    });
    return {
      success: true,
      message: "Services fetched successfully",
      data: services,
    }
  } catch (error) {
    console.error("Failed to fetch services by IDs:", error);
    return {
      success: false,
      message: "Failed to fetch services by IDs",
    };
  }
}


export async function getAdmissionHistoryById(id: string) {
  if (!id) return null;
  try {
    const admission = await prisma.admission.findUnique({
      where: { id },
      include: {
        course: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        receipts: {
          orderBy: { createdAt: "desc" },
        },
        serviceBills: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return {
      success: true,
      message: "Admission history fetched successfully",
      data: admission,
    }
  } catch (error) {
    console.error(`Failed to fetch admission history [${id}]:`, error);
    return {
      success: false,
      message: "Failed to fetch admission history",
    };
  }
}

export async function getServiceBillDetailsForPDF(id: string) {
  try {
    if (!id) {
      return { success: false, message: "Service Bill ID is required." };
    }

    // Step 1: Fetch the core service bill and include the related student's info
    const serviceBill = await prisma.serviceBill.findUnique({
      where: { id },
      include: {
        admission: {
          select: {
            candidateName: true,
            admissionNumber: true,
          },
        },
      },
    });

    if (!serviceBill) {
      return { success: false, message: "Service Bill not found." };
    }

    // Step 2: Fetch the details of the services using the IDs stored in the bill
    const services = await prisma.service.findMany({
      where: {
        id: {
          in: serviceBill.serviceIds,
        },
      },
      select: {
        name: true,
        price: true,
      }
    });

    // Step 3: Combine the bill data with the fetched service details
    const detailedBillData = {
      ...serviceBill,
      services, // Attach the array of full service objects
    };

    return {
      success: true,
      message: "Service Bill details fetched successfully.",
      data: detailedBillData,
    };

  } catch (error) {
    console.error(`Error fetching service bill details for PDF [${id}]:`, error);
    return {
      success: false,
      message: "An error occurred while fetching the service bill details.",
    };
  }
}