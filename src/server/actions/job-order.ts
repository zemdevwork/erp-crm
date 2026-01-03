'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// Generic response type
interface ActionResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Helper function to get current user
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session.user;
}

// Generate unique job code starting with JB
async function generateJobCode(): Promise<string> {
  // Get the latest job order to determine the next number
  const latestJobOrder = await prisma.jobOrder.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { jobCode: true },
  });

  let nextNumber = 1;
  if (latestJobOrder?.jobCode) {
    // Extract number from job code (e.g., "JB001" -> 1, "JB123" -> 123)
    const match = latestJobOrder.jobCode.match(/JB(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format with leading zeros (e.g., JB001, JB002, etc.)
  return `JB${nextNumber.toString().padStart(3, '0')}`;
}

// Create job order with job leads
export async function createJobOrder(
  managerId: string,
  branchId: string,
  startDate: Date,
  endDate: Date,
  enquiryIds: string[]
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Validate dates
    if (startDate > endDate) {
      return {
        success: false,
        message: 'Start date cannot be after end date',
      };
    }

    // Verify manager exists and get branch from manager if branchId not provided
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true, branch: true },
    });

    if (!manager) {
      return {
        success: false,
        message: 'Manager not found',
      };
    }

    // Use manager's branch if branchId not provided
    const finalBranchId = branchId || manager.branch;
    if (!finalBranchId) {
      return {
        success: false,
        message: 'Branch is required',
      };
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: finalBranchId },
    });

    if (!branch) {
      return {
        success: false,
        message: 'Branch not found',
      };
    }

    // Verify all enquiries exist
    const enquiries = await prisma.enquiry.findMany({
      where: { id: { in: enquiryIds } },
      select: { id: true },
    });

    if (enquiries.length !== enquiryIds.length) {
      return {
        success: false,
        message: 'Some enquiries not found',
      };
    }

    // Generate job code
    const jobCode = await generateJobCode();

    // Create job order with job leads in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create job order
      const jobOrder = await tx.jobOrder.create({
        data: {
          jobCode,
          managerId,
          branchId: finalBranchId,
          startDate,
          endDate,
        },
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          branch: true,
        },
      });

      // Create job leads for each enquiry
      const jobLeads = await Promise.all(
        enquiryIds.map((enquiryId) =>
          tx.jobLead.create({
            data: {
              jobId: jobOrder.id,
              leadId: enquiryId,
              status: 'PENDING',
            },
          })
        )
      );

      return { jobOrder, jobLeads };
    });

    revalidatePath('/enquiries/job-orders');
    revalidatePath('/enquiries');

    return {
      success: true,
      data: result.jobOrder,
      message: 'Job order created successfully',
    };
  } catch (error) {
    console.error('Error creating job order:', error);
    return {
      success: false,
      message: 'Failed to create job order',
    };
  }
}

// Get all job orders
export async function getJobOrders(filters?: {
  managerId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
  pendingOnly?: boolean;
}): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.managerId) {
      where.managerId = filters.managerId;
    }

    if (filters?.branchId) {
      where.branchId = filters.branchId;
    }

    // Role-based filtering
    if (user.role !== 'admin') {
      where.managerId = user.id;
    }

    if (filters?.pendingOnly) {
      where.jobLeads = {
        some: {
          status: 'PENDING',
        },
      };
    }

    const [jobOrders, total] = await Promise.all([
      prisma.jobOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
          jobLeads: {
            include: {
              lead: {
                select: {
                  id: true,
                  candidateName: true,
                  phone: true,
                  status: true,
                },
              },
            },
          },
          _count: {
            select: {
              jobLeads: true,
            },
          },
        },
      }),
      prisma.jobOrder.count({ where }),
    ]);

    return {
      success: true,
      data: jobOrders,
      message: 'Job orders fetched successfully',
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error fetching job orders:', error);
    return {
      success: false,
      message: 'Failed to fetch job orders',
    };
  }
}

// Get single job order by ID
export async function getJobOrder(id: string): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    const jobOrder = await prisma.jobOrder.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
          },
        },
        jobLeads: {
          include: {
            lead: {
              select: {
                id: true,
                candidateName: true,
                phone: true,
                email: true,
                status: true,
                address: true,
                notes: true,
                lastContactDate: true,
                preferredCourse: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                enquirySource: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                branch: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!jobOrder) {
      return {
        success: false,
        message: 'Job order not found',
      };
    }

    // Role-based access control
    if (user.role !== 'admin' && jobOrder.managerId !== user.id) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    return {
      success: true,
      data: jobOrder,
      message: 'Job order fetched successfully',
    };
  } catch (error) {
    console.error('Error fetching job order:', error);
    return {
      success: false,
      message: 'Failed to fetch job order',
    };
  }
}

// Update job lead status
export async function updateJobLeadStatus(
  jobLeadId: string,
  status: 'PENDING' | 'CLOSED'
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    const jobLead = await prisma.jobLead.findUnique({
      where: { id: jobLeadId },
      include: {
        job: {
          select: {
            managerId: true,
            branchId: true,
          },
        },
      },
    });

    if (!jobLead) {
      return {
        success: false,
        message: 'Job lead not found',
      };
    }

    // Role-based access control
    if (user.role === 'telecaller' && jobLead.job.managerId !== user.id) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    const updatedJobLead = await prisma.jobLead.update({
      where: { id: jobLeadId },
      data: { status },
      include: {
        lead: {
          select: {
            id: true,
            candidateName: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    revalidatePath('/enquiries/job-orders');
    return {
      success: true,
      data: updatedJobLead,
      message: 'Job lead status updated successfully',
    };
  } catch (error) {
    console.error('Error updating job lead status:', error);
    return {
      success: false,
      message: 'Failed to update job lead status',
    };
  }
}

