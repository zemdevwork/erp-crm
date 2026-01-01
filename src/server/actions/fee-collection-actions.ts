"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

import {
  CreateReceiptInput,
  UpdateReceiptInput,
  AdmissionWithReceiptsAndCourse,
} from "@/types/fee-collection";
import { headers } from "next/headers";
import {
  calculateFeeDetails,
  calculateTotalFee,
  calculateTotalPaid,
} from "@/lib/fee-utils";

/**
 * Create a new receipt
 */
export async function createReceipt(data: CreateReceiptInput) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const { nextDueDate, ...rest } = data;
    const receipt = await prisma.receipt.create({
      data: {
        ...rest,
        createdById: session.user.id,
      },
    });

    // Update admission balance
    const admission = (await prisma.admission.findUnique({
      where: { id: data.admissionId },
      include: {
        course: true,
        receipts: {
          include: {
            createdBy: true,
          },
        },
      },
    })) as unknown as AdmissionWithReceiptsAndCourse;

    if (admission) {
      // Calculate new balance
      const totalPaid = calculateTotalPaid(admission);
      const totalFee = calculateTotalFee(admission.course);

      const balance = totalFee - totalPaid;

      // Update admission with new balance
      await prisma.admission.update({
        where: { id: data.admissionId },
        data: {
          balance: balance > 0 ? balance : 0,
          nextDueDate: balance <= 0 ? null : nextDueDate,
        },
      });
    }

    revalidatePath(`/admissions/${data.admissionId}/payments`);
    return { success: true, data: receipt };
  } catch (error) {
    console.error("Error creating receipt:", error);
    return { error: "Failed to create receipt" };
  }
}

/**
 * Update an existing receipt
 */
export async function updateReceipt(data: UpdateReceiptInput) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const { id, nextDueDate, ...rest } = data;
    const receipt = await prisma.receipt.update({
      where: { id },
      data: rest,
    });

    // Get the admission to update balance
    const admission = (await prisma.admission.findFirst({
      where: { receipts: { some: { id } } },
      include: {
        course: true,
        receipts: {
          include: {
            createdBy: true,
          },
        },
      },
    })) as unknown as AdmissionWithReceiptsAndCourse;

    if (admission) {
      const totalPaid = calculateTotalPaid(admission);
      const totalFee = calculateTotalFee(admission.course);

      const balance = totalFee - totalPaid;

      // Update admission with new balance
      await prisma.admission.update({
        where: { id: admission.id },
        data: {
          nextDueDate: balance <= 0 ? null : nextDueDate,
          balance: balance > 0 ? balance : 0,
        },
      });

      revalidatePath(`/admissions/${admission.id}/payments`);
    }

    return { success: true, data: receipt };
  } catch (error) {
    console.error("Error updating receipt:", error);
    return { error: "Failed to update receipt" };
  }
}

/**
 * Delete a receipt
 */
export async function deleteReceipt(id: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    // Find the receipt to get the admission ID before deleting
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      select: { admissionId: true },
    });

    if (!receipt) {
      return { error: "Receipt not found" };
    }

    // Delete the receipt
    await prisma.receipt.delete({
      where: { id },
    });

    // Update admission balance
    const admission = await prisma.admission.findUnique({
      where: { id: receipt.admissionId },
      include: {
        receipts: true,
        course: true,
      },
    });

    if (admission) {
      // Calculate new balance
      const totalPaid = admission.receipts.reduce(
        (sum, receipt) => sum + receipt.amountCollected,
        0
      );

      const totalFee =
        (admission.course.admissionFee || 0) +
        (admission.course.courseFee || 0) +
        (admission.course.semesterFee || 0);

      const balance = totalFee - totalPaid;

      // Update admission with new balance
      await prisma.admission.update({
        where: { id: receipt.admissionId },
        data: {
          nextDueDate: null,
          balance: balance > 0 ? balance : 0,
        },
      });
    }

    revalidatePath(`/admissions/${receipt.admissionId}/payments`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting receipt:", error);
    return { error: "Failed to delete receipt" };
  }
}

/**
 * Get receipts by admission ID
 */
export async function getReceiptsByAdmissionId(admissionId: string) {
  try {
    const receipts = await prisma.receipt.findMany({
      where: { admissionId },
      orderBy: { paymentDate: "desc" },
      include: {
        createdBy: true,
      },
    });

    return { success: true, data: receipts };
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return { error: "Failed to fetch receipts" };
  }
}

/**
 * Get admission with fee details
 */
export async function getAdmissionWithFeeDetails(admissionId: string) {
  try {
    const admission = (await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        course: true,
        receipts: {
          orderBy: { paymentDate: "desc" },
          include: {
            createdBy: true,
          },
        },
      },
    })) as unknown as AdmissionWithReceiptsAndCourse;

    if (!admission) {
      return { error: "Admission not found" };
    }

    // Calculate fee details
    const feeDetails = calculateFeeDetails(
      admission as unknown as AdmissionWithReceiptsAndCourse
    );

    return {
      success: true,
      data: {
        admission: admission as AdmissionWithReceiptsAndCourse,
        feeDetails,
      },
    };
  } catch (error) {
    console.error("Error fetching admission with fee details:", error);
    return { error: "Failed to fetch admission details" };
  }
}
