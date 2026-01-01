'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { CreateCallLogInput, CallLogFilters } from '@/types/enquiry';
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
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session.user;
}

// Call Log Actions
export async function createCallLog(data: CreateCallLogInput): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Check if user has access to the enquiry
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: data.enquiryId },
    });

    if (!enquiry) {
      return {
        success: false,
        message: 'Enquiry not found',
      };
    }

    if (user.role === 'telecaller' && enquiry.assignedToUserId !== user.id) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    // Use transaction to create call log and activity
    const result = await prisma.$transaction(async (tx) => {
      // Create call log
      const callLog = await tx.callLog.create({
        data: {
          ...data,
          createdByUserId: user.id,
        },
        include: {
          enquiry: {
            include: {
              branch: true,
              preferredCourse: true,
              enquirySource: true,
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

      // Update enquiry's last contact date
      await tx.enquiry.update({
        where: { id: data.enquiryId },
        data: { lastContactDate: new Date() },
      });

      // Create activity entry
      await tx.enquiryActivity.create({
        data: {
          type: ActivityType.CALL_LOG,
          title: 'Call logged',
          description: data.notes || `Call outcome: ${data.outcome || 'N/A'}`,
          enquiryId: data.enquiryId,
          callLogId: callLog.id,
          createdByUserId: user.id,
        },
      });

      return callLog;
    });

    revalidatePath('/call-register');
    revalidatePath(`/enquiries/${data.enquiryId}`);
    return { success: true, data: result, message: 'Call log created successfully' };
  } catch (error) {
    console.error('Error creating call log:', error);
    return {
      success: false,
      message: 'Failed to create call log',
    };
  }
}

export async function getCallLogs(filters: CallLogFilters = {}): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    const { page = 1, limit = 50, outcome, dateFrom, dateTo } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      enquiry?: { assignedToUserId?: string; branchId?: string };
      outcome?: string;
      callDate?: { gte?: Date; lte?: Date };
    } = {};

    // Role-based filtering
    if (user.role === 'telecaller') {
      where.enquiry = {
        assignedToUserId: user.id,
      };
    }

    // For executives, only show data from their assigned branch
    if (user.role === 'executive' && user.branch) {
      where.enquiry = {
        ...where.enquiry,
        branchId: user.branch,
      };
    }

    if (outcome) {
      where.outcome = outcome;
    }

    if (dateFrom || dateTo) {
      where.callDate = {};
      if (dateFrom) where.callDate.gte = dateFrom;
      if (dateTo) where.callDate.lte = dateTo;
    }

    const [callLogs, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { callDate: 'desc' },
        include: {
          enquiry: {
            include: {
              branch: true,
              preferredCourse: true,
              enquirySource: true,
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
      prisma.callLog.count({ where }),
    ]);

    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };

    return { success: true, data: callLogs, pagination, message: 'Call logs fetched successfully' };
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return {
      success: false,
      message: 'Failed to fetch call logs',
    };
  }
}

export async function deleteCallLog(id: string): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();

    // Check if call log exists and user has permission
    const existingCallLog = await prisma.callLog.findUnique({
      where: { id },
      include: {
        enquiry: true,
      },
    });

    if (!existingCallLog) {
      return {
        success: false,
        message: 'Call log not found',
      };
    }

    // Only allow deletion by admin or the assigned user
    if (user.role === 'telecaller' && existingCallLog.enquiry.assignedToUserId !== user.id) {
      return {
        success: false,
        message: 'Access denied',
      };
    }

    await prisma.callLog.delete({
      where: { id },
    });

    revalidatePath('/call-register');
    revalidatePath(`/enquiries/${existingCallLog.enquiryId}`);
    return { success: true, message: 'Call log deleted successfully' };
  } catch (error) {
    console.error('Error deleting call log:', error);
    return {
      success: false,
      message: 'Failed to delete call log',
    };
  }
}
