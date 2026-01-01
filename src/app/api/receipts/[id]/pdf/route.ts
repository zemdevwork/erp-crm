import { NextRequest, NextResponse } from "next/server";
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getReceiptWithAdmissionData } from "@/server/actions/receipt-actions";
import { PDFService } from "@/lib/pdf-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: receiptId } = await params;

    // Check if preview mode is requested
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get('preview') === 'true';

    // Get receipt with admission data
    const result = await getReceiptWithAdmissionData(receiptId);
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "Receipt not found" },
        { status: 404 }
      );
    }

    const { receipt, admission } = result.data;

    // Generate PDF
    const pdfBuffer = await PDFService.generateReceiptPDF(receipt, admission);

    // Generate filename
    const filename = PDFService.generateReceiptFileName(receipt, admission);

    const properBuffer = Buffer.from(pdfBuffer);

    // Return PDF as response with appropriate headers for preview or download
    return new NextResponse(properBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': preview
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Receipt PDF generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate receipt PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Optional: Support POST for generating PDF with custom data
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: receiptId } = await params;
    const body = await request.json();

    // Get receipt with admission data
    const result = await getReceiptWithAdmissionData(receiptId);
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "Receipt not found" },
        { status: 404 }
      );
    }

    const { receipt, admission } = result.data;

    // Allow optional overrides from request body
    const receiptData = {
      ...receipt,
      ...body.receiptOverrides,
    };

    // Generate PDF
    const pdfBuffer = await PDFService.generateReceiptPDF(receiptData, admission);

    // Determine response type based on request
    const responseType = body.responseType || 'file';

    if (responseType === 'base64') {
      // Return base64 encoded PDF
      const base64PDF = Buffer.from(pdfBuffer).toString('base64');
      return NextResponse.json({
        success: true,
        pdf: base64PDF,
        filename: PDFService.generateReceiptFileName(receiptData, admission),
      });
    } else {
      // Return PDF file
      const filename = PDFService.generateReceiptFileName(receiptData, admission);
      const properBuffer= Buffer.from(pdfBuffer);
      return new NextResponse(properBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      });
    }
  } catch (error) {
    console.error('Receipt PDF generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate receipt PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}