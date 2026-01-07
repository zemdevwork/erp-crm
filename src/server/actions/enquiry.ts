'use server';

import { revalidatePath } from 'next/cache';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createNotification } from './notification';
import { NotificationType } from '@prisma/client';
import {
  EnquiryStatus,
  CreateEnquiryInput,
  UpdateEnquiryInput,
  EnquiryFilters,
} from '@/types/enquiry';
import { ActivityType } from '@/types/enquiry-activity';

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
export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session.user;
}

// Helper function to generate activity title
function generateActivityTitle(
  type: ActivityType,
  previousStatus?: string,
  newStatus?: string
): string {
  switch (type) {
    case ActivityType.STATUS_CHANGE:
      if (previousStatus && newStatus) {
        return `Status changed from ${previousStatus} to ${newStatus}`;
      }
      return 'Status updated';
    case ActivityType.FOLLOW_UP:
      return 'Follow-up scheduled';
    case ActivityType.CALL_LOG:
      return 'Call logged';
    case ActivityType.ENROLLMENT_DIRECT:
      return 'Direct enrollment completed';
    default:
      return 'Activity logged';
  }
}

// Enquiry Actions
export async function createEnquiry(data: CreateEnquiryInput): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    const enquiry = await prisma.enquiry.create({
      data: {
        ...data,
        createdByUserId: user.id,
        assignedToUserId: user.id, // Auto-assign to creator
        lastContactDate: new Date(),
      },
      include: {
        branch: true,
        preferredCourse: true,
        enquirySource: true,
        requiredService: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    revalidatePath('/enquiries');
    return { success: true, data: enquiry, message: 'Enquiry created successfully' };
  } catch (error) {
    console.error('Error creating enquiry:', error);
    return {
      success: false,
      message: 'Failed to create enquiry',
    };
  }
}

export async function getEnquiries(filters: EnquiryFilters = {}): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    const {
      page = 1,
      limit = 10,
      search,
      status,
      branchId,
      enquirySourceId,
      assignedToUserId,
      dateFrom,
      dateTo,
    } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.EnquiryWhereInput = {};

    // Role-based filtering
    if (user.role === 'admin') {
      // Admin sees everything (no default filter).
    } else {
      // Managers and other roles (e.g. telecaller, executive) see everything in their branch.
      if (user.branch) {
        where.branchId = user.branch;
      } else {
        // Fallback if no branch assigned: restrict to self-assigned
        where.assignedToUserId = user.id;
      }
    }

    // Previous specific logic removed to enforce strict Admin vs Branch/User split.

    if (search) {
      where.OR = [
        { candidateName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (enquirySourceId) {
      where.enquirySourceId = enquirySourceId;
    }

    if (assignedToUserId) {
      where.assignedToUserId = assignedToUserId;
    }

    if (dateFrom || dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (dateFrom) createdAtFilter.gte = dateFrom;
      if (dateTo) createdAtFilter.lte = dateTo;
      where.createdAt = createdAtFilter;
    }

    if (filters.isAssigned !== undefined) {
      if (filters.isAssigned) {
        where.jobLeads = { some: {} };
      } else {
        where.jobLeads = { none: {} };
      }
    }

    const [enquiries, total] = await Promise.all([
      prisma.enquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: true,
          preferredCourse: true,
          enquirySource: true,
          requiredService: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.enquiry.count({ where }),
    ]);

    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };

    return {
      success: true,
      data: enquiries,
      pagination,
      message: 'Enquiries fetched successfully',
    };
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    return {
      success: false,
      message: 'Failed to fetch enquiries',
    };
  }
}

export async function getEnquiry(id: string): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        branch: true,
        preferredCourse: true,
        enquirySource: true,
        requiredService: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        followUps: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { scheduledAt: 'desc' },
        },
        callLogs: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { callDate: 'desc' },
        },
      },
    });

    if (!enquiry) {
      return {
        success: false,
        message: 'Enquiry not found',
      };
    }

    // Check access permissions
    if (user.role === 'telecaller' && enquiry.assignedToUserId !== user.id) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    return { success: true, data: enquiry, message: 'Enquiry fetched successfully' };
  } catch (error) {
    console.error('Error fetching enquiry:', error);
    return {
      success: false,
      message: 'Failed to fetch enquiry',
    };
  }
}

export async function updateEnquiry(data: UpdateEnquiryInput): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    const { id, ...updateData } = data;

    // Check if enquiry exists and user has permission
    const existingEnquiry = await prisma.enquiry.findUnique({
      where: { id },
    });

    if (!existingEnquiry) {
      return {
        success: false,
        message: 'Enquiry not found',
      };
    }

    if (user.role === 'telecaller' && existingEnquiry.assignedToUserId !== user.id) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    const enquiry = await prisma.enquiry.update({
      where: { id },
      data: updateData,
      include: {
        branch: true,
        preferredCourse: true,
        enquirySource: true,
        requiredService: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    revalidatePath('/enquiries');
    revalidatePath(`/enquiries/${id}`);
    return { success: true, data: enquiry, message: 'Enquiry updated successfully' };
  } catch (error) {
    console.error('Error updating enquiry:', error);
    return {
      success: false,
      message: 'Failed to update enquiry',
    };
  }
}

export async function updateEnquiryStatus(
  id: string,
  status: EnquiryStatus
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Check if enquiry exists and user has permission
    const existingEnquiry = await prisma.enquiry.findUnique({
      where: { id },
    });

    if (!existingEnquiry) {
      return {
        success: false,
        message: 'Enquiry not found',
      };
    }

    if (user.role === 'telecaller' && existingEnquiry.assignedToUserId !== user.id) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    const enquiry = await prisma.enquiry.update({
      where: { id },
      data: {
        status,
        lastContactDate: new Date(),
      },
    });

    revalidatePath('/enquiries');
    revalidatePath(`/enquiries/${id}`);
    return { success: true, data: enquiry, message: 'Status updated successfully' };
  } catch (error) {
    console.error('Error updating enquiry status:', error);
    return {
      success: false,
      message: 'Failed to update status',
    };
  }
}

// Enhanced status update with activity tracking
export async function updateEnquiryStatusWithActivity(
  id: string,
  newStatus: EnquiryStatus,
  statusRemarks?: string
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Check if enquiry exists and user has permission
    const existingEnquiry = await prisma.enquiry.findUnique({
      where: { id },
    });

    if (!existingEnquiry) {
      return {
        success: false,
        message: 'Enquiry not found',
      };
    }

    // Role-based access control
    if (user.role === 'telecaller' && existingEnquiry.assignedToUserId !== user.id) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    const previousStatus = existingEnquiry.status;

    // Use transaction to update enquiry and create activity
    const result = await prisma.$transaction(async (tx) => {
      // Update enquiry status
      const updatedEnquiry = await tx.enquiry.update({
        where: { id },
        data: {
          status: newStatus,
          lastContactDate: new Date(),
        },
        include: {
          branch: true,
          preferredCourse: true,
          enquirySource: true,
          requiredService: true,
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      // Create activity entry
      await tx.enquiryActivity.create({
        data: {
          type: ActivityType.STATUS_CHANGE,
          title: generateActivityTitle(ActivityType.STATUS_CHANGE, previousStatus, newStatus),
          description: statusRemarks,
          previousStatus,
          newStatus,
          statusRemarks,
          enquiryId: id,
          createdByUserId: user.id,
        },
      });

      return updatedEnquiry;
    });

    revalidatePath('/enquiries');
    revalidatePath(`/enquiries/${id}`);
    return {
      success: true,
      data: result,
      message: 'Status updated successfully with activity logged',
    };
  } catch (error) {
    console.error('Error updating enquiry status with activity:', error);
    return {
      success: false,
      message: 'Failed to update status',
    };
  }
}

// Direct enrollment function
export async function updateEnquiryStatusDirectToEnrolled(
  id: string,
  statusRemarks?: string
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Check if enquiry exists and user has permission
    const existingEnquiry = await prisma.enquiry.findUnique({
      where: { id },
    });

    if (!existingEnquiry) {
      return {
        success: false,
        message: 'Enquiry not found',
      };
    }

    // Role-based access control
    if (user.role === 'telecaller' && existingEnquiry.assignedToUserId !== user.id) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    const previousStatus = existingEnquiry.status;

    // Use transaction to update enquiry and create activity
    const result = await prisma.$transaction(async (tx) => {
      // Update enquiry status to ENROLLED
      const updatedEnquiry = await tx.enquiry.update({
        where: { id },
        data: {
          status: EnquiryStatus.ENROLLED,
          lastContactDate: new Date(),
        },
        include: {
          branch: true,
          preferredCourse: true,
          enquirySource: true,
          requiredService: true,
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      // Create activity entry for direct enrollment
      await tx.enquiryActivity.create({
        data: {
          type: ActivityType.ENROLLMENT_DIRECT,
          title: generateActivityTitle(ActivityType.ENROLLMENT_DIRECT),
          description: statusRemarks || 'Direct enrollment completed without admission form',
          previousStatus,
          newStatus: EnquiryStatus.ENROLLED,
          statusRemarks,
          enquiryId: id,
          createdByUserId: user.id,
        },
      });

      return updatedEnquiry;
    });

    revalidatePath('/enquiries');
    revalidatePath(`/enquiries/${id}`);
    return {
      success: true,
      data: result,
      message: 'Direct enrollment completed successfully',
    };
  } catch (error) {
    console.error('Error processing direct enrollment:', error);
    return {
      success: false,
      message: 'Failed to process direct enrollment',
    };
  }
}

export async function assignEnquiry(
  id: string,
  assignedToUserId: string,
  startDate: Date,
  endDate: Date,
  branchId: string,
  name: string,
  description?: string | null,
  remarks?: string | null
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Only admins and managers can assign enquiries
    if (!['admin', 'manager'].includes((user.role || '').toLowerCase())) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    if (!name?.trim()) {
      return {
        success: false,
        message: 'Job name is required',
      };
    }

    // Validate dates
    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    if (start < today) {
      return {
        success: false,
        message: 'Start date cannot be in the past',
      };
    }

    if (startDate > endDate) {
      return {
        success: false,
        message: 'Start date cannot be after end date',
      };
    }

    // Validate branch
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return {
        success: false,
        message: 'Branch not found',
      };
    }

    // Get the assigned user to get their branch
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToUserId },
      select: { id: true, branch: true },
    });

    if (!assignedUser) {
      return {
        success: false,
        message: 'Assigned user not found',
      };
    }

    if (!assignedUser.branch) {
      return {
        success: false,
        message: 'Assigned user must have a branch',
      };
    }

    if (assignedUser.branch !== branchId) {
      return {
        success: false,
        message: 'Selected user does not belong to the chosen branch',
      };
    }

    // Use transaction to update enquiry and optionally create job order
    const result = await prisma.$transaction(async (tx) => {
      // Remove existing job leads (re-assignment logic)
      await tx.jobLead.deleteMany({
        where: { leadId: id }
      });

      // Update enquiry assignment
      const enquiry = await tx.enquiry.update({
        where: { id },
        data: { assignedToUserId },
      });

      // Create job order
      const jobOrder = await tx.jobOrder.create({
        data: {
          name,
          description,
          remarks,
          managerId: assignedToUserId,
          assignerId: user.id, // Track who assigned
          branchId,
          startDate,
          endDate,
          jobCode: null,
        },
      });

      // Create job lead
      await tx.jobLead.create({
        data: {
          jobId: jobOrder.id,
          leadId: id,
          status: 'PENDING',
          assignerId: user.id,
          assigneeId: assignedToUserId, 
        },
      });

      return enquiry;
    });

    revalidatePath('/enquiries');
    revalidatePath(`/enquiries/${id}`);
    revalidatePath('/enquiries/job-orders');
    revalidatePath('/enquiries/job-orders/pending');
    revalidatePath('/enquiries/job-orders/completed');
    revalidatePath('/enquiries/job-orders/due');

    // Send notification
    if (assignedToUserId !== user.id) {
      // We can't access enquiry details easily if we didn't fetch them or return them fully.
      // The result.enquiry might help if we modify the return, but result is the enquiry.
      await createNotification(
        assignedToUserId,
        'New Enquiry Assigned',
        'You have been assigned a new enquiry.',
        NotificationType.ENQUIRY_ASSIGNED,
        `/enquiries/${id}`
      );
    }

    return { success: true, data: result, message: 'Enquiry assigned and job order created successfully' };
  } catch (error) {
    console.error('Error assigning enquiry:', error);
    return {
      success: false,
      message: 'Failed to assign enquiry',
    };
  }

}

export async function bulkAssignEnquiries(
  ids: string[],
  assignedToUserId: string,
  startDate: Date,
  endDate: Date,
  branchId: string,
  name: string,
  description?: string | null,
  remarks?: string | null
): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Only admins and managers can assign enquiries
    if (!['admin', 'manager'].includes((user.role || '').toLowerCase())) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: 'No enquiries selected',
      };
    }

    if (!name?.trim()) {
      return {
        success: false,
        message: 'Job name is required',
      };
    }

    // Validate dates
    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    if (start < today) {
      return {
        success: false,
        message: 'Start date cannot be in the past',
      };
    }

    if (startDate > endDate) {
      return {
        success: false,
        message: 'Start date cannot be after end date',
      };
    }

    // Validate branch
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return {
        success: false,
        message: 'Branch not found',
      };
    }

    // Get the assigned user to get their branch
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToUserId },
      select: { id: true, branch: true },
    });

    if (!assignedUser) {
      return {
        success: false,
        message: 'Assigned user not found',
      };
    }

    if (!assignedUser.branch) {
      return {
        success: false,
        message: 'Assigned user must have a branch',
      };
    }

    if (assignedUser.branch !== branchId) {
      return {
        success: false,
        message: 'Selected user does not belong to the chosen branch',
      };
    }

    // Validation: Check if any enquiries are already assigned
    const assignedEnquiriesCount = await prisma.enquiry.count({
      where: {
        id: { in: ids },
        OR: [
          { assignedToUserId: { not: null } },
          { jobLeads: { some: {} } }
        ]
      }
    });

    if (assignedEnquiriesCount > 0) {
      return {
        success: false,
        message: 'Some selected enquiries are already assigned. Bulk assignment requires unassigned enquiries.',
      };
    }

    // Use transaction to update enquiries and optionally create job order
    const result = await prisma.$transaction(async (tx) => {
      // Update all enquiries
      const updateResult = await tx.enquiry.updateMany({
        where: {
          id: { in: ids },
        },
        data: { assignedToUserId },
      });

      // Create job order
      const jobOrder = await tx.jobOrder.create({
        data: {
          name,
          description,
          remarks,
          managerId: assignedToUserId,
          assignerId: user.id, // Track who assigned
          branchId,
          startDate,
          endDate,
          jobCode: null,
        },
      });

      // Create job leads for all enquiries
      await Promise.all(
        ids.map((enquiryId) =>
          tx.jobLead.create({
            data: {
              jobId: jobOrder.id,
              leadId: enquiryId,
              status: 'PENDING',
              assignerId: user.id,
              assigneeId: assignedToUserId,
            },
          })
        )
      );

      return updateResult;
    });

    revalidatePath('/enquiries');
    revalidatePath('/enquiries/job-orders');
    revalidatePath('/enquiries/job-orders/pending');
    revalidatePath('/enquiries/job-orders/completed');
    revalidatePath('/enquiries/job-orders/due');

    // Send notification
    if (assignedToUserId !== user.id) {
      await createNotification(
        assignedToUserId,
        'Bulk Enquiries Assigned',
        `You have been assigned ${ids.length} new enquiries.`,
        NotificationType.ENQUIRY_ASSIGNED,
        '/enquiries'
      );
    }

    return {
      success: true,
      message: `${result.count} enquiries assigned and job order created successfully`,
      data: result
    };
  } catch (error) {
    console.error('Error bulk assigning enquiries:', error);
    return {
      success: false,
      message: 'Failed to assign enquiries',
    };
  }
}


export async function deleteEnquiry(id: string): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Only admins can delete enquiries
    if (user.role !== 'admin') {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    await prisma.enquiry.delete({
      where: { id },
    });

    revalidatePath('/enquiries');
    return { success: true, message: 'Enquiry deleted successfully' };
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    return {
      success: false,
      message: 'Failed to delete enquiry',
    };
  }
}

// Helper function to get users for assignment
export async function getUsers(branchId?: string): Promise<ActionResponse> {
  try {
    const where: Prisma.UserWhereInput = {
      NOT: {
        role: {
          in: ['admin', 'manager'],
        },
      },
    };

    if (branchId) {
      where.branch = branchId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branch: true,
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: users, message: 'Users fetched successfully' };
  } catch (error) {
    console.error('Error fetching users:', error);
    return {
      success: false,
      message: 'Failed to fetch users',
    };
  }
}
