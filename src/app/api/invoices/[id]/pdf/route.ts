import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getInvoiceById } from '@/server/actions/invoice-actions';
import { PDFService } from '@/lib/pdf-service';
import { InvoiceWithItems } from '@/types/invoice';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invoiceId } = await params;

    // Check if preview mode is requested
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get('preview') === 'true';

    // Fetch the invoice with items
    const result = await getInvoiceById({ id: invoiceId });

    if (!result.data?.success || !result.data.data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = result.data.data;

    // Generate PDF
    const pdfBuffer = await PDFService.generateInvoicePDF(invoice as InvoiceWithItems);

    // Generate filename
    const fileName = PDFService.generateFileName(invoice as InvoiceWithItems);

    const properBuffer = Buffer.from(pdfBuffer);

    // Return PDF as response with appropriate headers for preview or download
    return new NextResponse(properBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': preview
          ? `inline; filename="${fileName}"`
          : `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invoiceId } = await params;
    const body = await request.json();

    // Fetch the invoice with items
    const result = await getInvoiceById({ id: invoiceId });

    if (!result.data?.success || !result.data.data) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = result.data.data;

    // Allow optional overrides from request body
    const invoiceData = {
      ...invoice,
      ...body, // Override with any custom data from request
    };

    // Generate PDF
    const pdfBuffer = await PDFService.generateInvoicePDF(invoiceData);

    // Determine response type based on request
    const responseType = body.responseType || 'preview';
    const preview = body.preview !== false; // Default to preview mode

    if (responseType === 'base64') {
      // Return PDF as base64 string for preview
      const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
      return NextResponse.json({
        success: true,
        pdf: base64Pdf,
        fileName: PDFService.generateFileName(invoiceData),
      });
    }

    const properBuffer = Buffer.from(pdfBuffer);

    // Default: Return as previewable/downloadable file
    const fileName = PDFService.generateFileName(invoiceData);

    return new NextResponse(properBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': preview
          ? `inline; filename="${fileName}"`
          : `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
