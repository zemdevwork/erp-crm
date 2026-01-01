'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { ActivityFilters } from '@/types/enquiry-activity';

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

// Get activities for a specific enquiry
export async function getEnquiryActivities(filters: ActivityFilters = {}): Promise<ActionResponse> {
  try {
    const user = await getCurrentUser();
    const { page = 1, limit = 10, type, enquiryId, userId, dateFrom, dateTo } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (enquiryId) {
      where.enquiryId = enquiryId;
    }

    if (type && type.length > 0) {
      where.type = { in: type };
    }

    if (userId) {
      where.createdByUserId = userId;
    }

    if (dateFrom || dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (dateFrom) createdAtFilter.gte = dateFrom;
      if (dateTo) createdAtFilter.lte = dateTo;
      where.createdAt = createdAtFilter;
    }

    // Role-based filtering
    if (user.role === 'telecaller' && !enquiryId) {
      // Telecallers can only see activities for their assigned enquiries
      where.enquiry = {
        assignedToUserId: user.id,
      };
    }

    // For executives, only show activities for enquiries from their assigned branch
    if (user.role === 'executive' && user.branch && !enquiryId) {
      where.enquiry = {
        ...(where.enquiry || {}),
        branchId: user.branch,
      };
    }

    const [activities, total] = await Promise.all([
      prisma.enquiryActivity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          enquiry: {
            select: {
              id: true,
              candidateName: true,
              status: true,
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
          followUp: {
            select: {
              id: true,
              scheduledAt: true,
              status: true,
              outcome: true,
            },
          },
          callLog: {
            select: {
              id: true,
              callDate: true,
              duration: true,
              outcome: true,
            },
          },
        },
      }),
      prisma.enquiryActivity.count({ where }),
    ]);

    const pagination = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };

    return {
      success: true,
      data: activities,
      pagination,
      message: 'Activities fetched successfully',
    };
  } catch (error) {
    console.error('Error fetching enquiry activities:', error);
    return {
      success: false,
      message: 'Failed to fetch activities',
    };
  }
}

// Get activities for a specific enquiry (convenience function)
export async function getActivitiesForEnquiry(enquiryId: string): Promise<ActionResponse> {
  return getEnquiryActivities({ enquiryId, limit: 50 });
}
