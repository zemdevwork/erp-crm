'use server';

import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { EnquiryStatus } from '@/types/enquiry';

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

// Schema for creating enquiry
const createEnquirySchema = z.object({
  candidateName: z.string().min(1, 'Candidate name is required').max(100),
  phone: z.string().min(10, 'Valid phone number is required').max(15),
  contact2: z.string().optional(),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  address: z.string().optional(),
  enquirySourceId: z.string().min(1, 'Please select an enquiry source'),
  branchId: z.string().min(1, 'Please select a branch'),
  preferredCourseId: z.string().optional(),
  requiredServiceId: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for updating enquiry
const updateEnquirySchema = z.object({
  id: z.string().min(1, 'Enquiry ID is required'),
  candidateName: z.string().min(1, 'Candidate name is required').max(100).optional(),
  phone: z.string().min(10, 'Valid phone number is required').max(15).optional(),
  contact2: z.string().optional(),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  address: z.string().optional(),
  status: z.nativeEnum(EnquiryStatus).optional(),
  notes: z.string().optional(),
  feedback: z.string().optional(),
  branchId: z.string().optional(),
  preferredCourseId: z.string().optional(),
  enquirySourceId: z.string().optional(),
  requiredServiceId: z.string().optional(),
});

// Schema for deleting enquiry
const deleteEnquirySchema = z.object({
  id: z.string().min(1, 'Enquiry ID is required'),
});

// Safe action for creating enquiry
export const createEnquiry = action.schema(createEnquirySchema).action(async ({ parsedInput }) => {
  try {
    const user = await getCurrentUser();

    const enquiry = await prisma.enquiry.create({
      data: {
        candidateName: parsedInput.candidateName,
        phone: parsedInput.phone,
        contact2: parsedInput.contact2,
        email: parsedInput.email || undefined,
        address: parsedInput.address,
        notes: parsedInput.notes,
        status: EnquiryStatus.NEW,
        branch: parsedInput.branchId ? { connect: { id: parsedInput.branchId } } : undefined,
        preferredCourse: parsedInput.preferredCourseId
          ? { connect: { id: parsedInput.preferredCourseId } }
          : undefined,
        enquirySource: parsedInput.enquirySourceId
          ? { connect: { id: parsedInput.enquirySourceId } }
          : undefined,
        requiredService: parsedInput.requiredServiceId
          ? { connect: { id: parsedInput.requiredServiceId } }
          : undefined,
        // Auto-assign to current user
        assignedTo: { connect: { id: user.id } },
        createdBy: { connect: { id: user.id } },
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
    throw new Error('Failed to create enquiry');
  }
});

// Safe action for updating enquiry
export const updateEnquiry = action.schema(updateEnquirySchema).action(async ({ parsedInput }) => {
  try {
    const user = await getCurrentUser();
    const { id, ...updateData } = parsedInput;

    // Check if enquiry exists and user has permission
    const existingEnquiry = await prisma.enquiry.findUnique({
      where: { id },
    });

    if (!existingEnquiry) {
      throw new Error('Enquiry not found');
    }

    if (user.role === 'telecaller' && existingEnquiry.assignedToUserId !== user.id) {
      throw new Error('Access denied');
    }

    // Build update data
    const data: Record<string, unknown> = {};

    if (updateData.candidateName) data.candidateName = updateData.candidateName;
    if (updateData.phone) data.phone = updateData.phone;
    if (updateData.contact2 !== undefined) data.contact2 = updateData.contact2;
    if (updateData.email !== undefined) data.email = updateData.email || null;
    if (updateData.address !== undefined) data.address = updateData.address;
    if (updateData.status) data.status = updateData.status;
    if (updateData.notes !== undefined) data.notes = updateData.notes;
    if (updateData.feedback !== undefined) data.feedback = updateData.feedback;

    if (updateData.branchId) {
      data.branch = { connect: { id: updateData.branchId } };
    }
    if (updateData.preferredCourseId) {
      data.preferredCourse = { connect: { id: updateData.preferredCourseId } };
    }
    if (updateData.enquirySourceId) {
      data.enquirySource = { connect: { id: updateData.enquirySourceId } };
    }
    if (updateData.requiredServiceId) {
      data.requiredService = { connect: { id: updateData.requiredServiceId } };
    }

    const enquiry = await prisma.enquiry.update({
      where: { id },
      data,
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
    throw new Error('Failed to update enquiry');
  }
});

// Safe action for getting dropdown data
export const getBranches = action.schema(z.object({})).action(async () => {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: branches };
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw new Error('Failed to fetch branches');
  }
});

export const getCourses = action.schema(z.object({})).action(async () => {
  try {
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: courses };
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw new Error('Failed to fetch courses');
  }
});

export const getEnquirySources = action.schema(z.object({})).action(async () => {
  try {
    const sources = await prisma.enquirySource.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: sources };
  } catch (error) {
    console.error('Error fetching enquiry sources:', error);
    throw new Error('Failed to fetch enquiry sources');
  }
});

export const getRequiredServices = action.schema(z.object({})).action(async () => {
  try {
    const services = await prisma.requiredService.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: services };
  } catch (error) {
    console.error('Error fetching required services:', error);
    throw new Error('Failed to fetch required services');
  }
});

// Safe action for deleting enquiry
export const deleteEnquiry = action.schema(deleteEnquirySchema).action(async ({ parsedInput }) => {
  try {
    const user = await getCurrentUser();
    const { id } = parsedInput;

    // Check if enquiry exists and user has permission
    const existingEnquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        createdBy: true,
      },
    });

    if (!existingEnquiry) {
      throw new Error('Enquiry not found');
    }

    // Role-based access control
    if (user.role === 'telecaller' && existingEnquiry.assignedToUserId !== user.id) {
      throw new Error('Access denied: You can only delete enquiries assigned to you');
    }

    if (
      user.role === 'executive' &&
      existingEnquiry.createdByUserId !== user.id &&
      existingEnquiry.assignedToUserId !== user.id
    ) {
      throw new Error(
        'Access denied: You can only delete enquiries you created or are assigned to'
      );
    }

    // Admin can delete any enquiry - no additional checks needed

    // Delete the enquiry
    await prisma.enquiry.delete({
      where: { id },
    });

    revalidatePath('/enquiries');
    return {
      success: true,
      message: `Enquiry for ${existingEnquiry.candidateName} has been deleted successfully`,
    };
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to delete enquiry');
  }
});
