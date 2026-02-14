import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const REQUESTS_FILE = path.join(process.cwd(), "data", "requests.json");

function readRequests(): any[] {
  try {
    const raw = fs.readFileSync(REQUESTS_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    return [];
  }
}

function writeRequests(requests: any[]) {
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf-8");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: requestId } = params instanceof Promise ? await params : params;
    const requests = readRequests();
    const req = requests.find((r: any) => r.id === requestId);

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

    const requests = readRequests();
    const reqIndex = requests.findIndex((r: any) => r.id === requestId);

    if (reqIndex === -1) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    // Update description if provided
    if (description) {
      requests[reqIndex].description = description;
    }

    // Update status if provided
    if (status) {
      requests[reqIndex].status = status;
    }

    requests[reqIndex].updatedAt = new Date().toISOString();

    writeRequests(requests);

    return NextResponse.json({
      message: "Request updated successfully",
      request: requests[reqIndex],
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
    const requests = readRequests();
    const reqIndex = requests.findIndex((r: any) => r.id === requestId);

    if (reqIndex === -1) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    requests.splice(reqIndex, 1);
    writeRequests(requests);

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
