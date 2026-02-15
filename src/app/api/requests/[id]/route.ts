import { NextRequest, NextResponse } from "next/server";
import {
  deleteRequestById,
  getRequestById,
  updateRequestById,
} from "@/lib/requests";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: requestId } = params instanceof Promise ? await params : params;
    const req = await getRequestById(requestId);

    if (!req) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(req);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: requestId } = params instanceof Promise ? await params : params;
    const body = await request.json();
    const { description, status } = body;

    const updatedRequest = await updateRequestById(requestId, { description, status });
    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Request updated successfully",
      request: updatedRequest,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: requestId } = params instanceof Promise ? await params : params;
    const deleted = await deleteRequestById(requestId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Request deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
