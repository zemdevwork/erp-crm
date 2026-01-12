
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const API_BASE_URL = process.env.ERP_API_BASE_URL;
// In a real app, ensure process.env.JWT_SECRET is set
const JWT_SECRET  = process.env.JWT_SECRET ; 


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const isDownload = searchParams.get('download') === 'true';


    if(!API_BASE_URL || !JWT_SECRET) {
      return new NextResponse("Server configuration error for ENV", { status: 500 });
    }
    // 1. Generate Token
    const token = jwt.sign({}, JWT_SECRET);

    // 2. Fetch from ERP
    const erpResponse = await fetch(`${API_BASE_URL}/proposals/${id}/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!erpResponse.ok) {
       return new NextResponse(`Failed to fetch PDF: ${erpResponse.statusText}`, { status: erpResponse.status });
    }

    // 3. Prepare Response Headers
    const headers = new Headers(erpResponse.headers);
    
    const originalDisposition = erpResponse.headers.get('content-disposition') || `attachment; filename="proposal-${id}.pdf"`;
    
    let newDisposition = originalDisposition;
    if (!isDownload) {
        // Force inline for preview
        newDisposition = originalDisposition.replace('attachment', 'inline');
    } else {
        // Ensure attachment for download (though ERP likely sends it already)
        newDisposition = originalDisposition.replace('inline', 'attachment');
    }

    headers.set('Content-Disposition', newDisposition);
    
    // 4. Return Stream
    return new NextResponse(erpResponse.body, {
      status: 200,
      headers: headers,
    });

  } catch (error) {
    console.error("PDF Proxy Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
