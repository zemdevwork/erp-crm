'use server';

import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { ActivityType } from '@/types/enquiry-activity';

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

// Create safe action client
const action = createSafeActionClient();

// Schema for fetching activities
const getActivitiesSchema = z.object({
  enquiryId: z.string().min(1, 'Enquiry ID is required'),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(50),
  type: z.array(z.nativeEnum(ActivityType)).optional(),
});

// Safe action for fetching enquiry activities
export const getEnquiryActivities = action
  .schema(getActivitiesSchema)
  .action(async ({ parsedInput }) => {
    try {
      const user = await getCurrentUser();
      const { enquiryId, page, limit, type } = parsedInput;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Record<string, unknown> = {
        enquiryId,
      };

      if (type && type.length > 0) {
        where.type = { in: type };
      }

      // Role-based filtering - check if user has access to this enquiry
      if (user.role === 'telecaller') {
        const enquiry = await prisma.enquiry.findUnique({
          where: { id: enquiryId },
          select: { assignedToUserId: true },
        });

        if (!enquiry || enquiry.assignedToUserId !== user.id) {
          throw new Error('Access denied');
        }
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
      throw new Error('Failed to fetch activities');
    }
  });