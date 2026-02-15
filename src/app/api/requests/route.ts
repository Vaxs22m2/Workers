import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createRequest, listRequests } from "@/lib/requests";
import { getUserById } from "@/lib/users";

const NOTIFICATIONS_FILE = path.join(process.cwd(), "data", "notifications.json");
export const dynamic = "force-dynamic";

function readNotifications(): any[] {
  try {
    const raw = fs.readFileSync(NOTIFICATIONS_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    return [];
  }
}

function writeNotifications(notifications: any[]) {
  fs.writeFileSync(
    NOTIFICATIONS_FILE,
    JSON.stringify(notifications, null, 2),
    "utf-8"
  );
}

export async function GET(request: NextRequest) {
  try {
    const requests = await listRequests();
    return NextResponse.json(requests);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, workerId, description } = body;

    if (!customerId || !workerId || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newRequest = await createRequest({ customerId, workerId, description });

    // Create notification for the worker
    try {
      const notifications = readNotifications();
      const customerInfo = await getUserById(customerId);
      const notificationId = `${Date.now()}${Math.random()
        .toString(36)
        .slice(2, 9)}`;

      const notification = {
        id: notificationId,
        userId: workerId,
        type: "request",
        title: `New request from ${customerInfo?.fullName || "A customer"}`,
        description: description.substring(0, 100) + (description.length > 100 ? "..." : ""),
        relatedId: newRequest.id,
        read: false,
        createdAt: new Date().toISOString(),
      };

      notifications.push(notification);
      writeNotifications(notifications);

      console.log("Notification created for worker:", workerId);
    } catch (notifError) {
      console.error("Could not create notification:", notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(
      {
        message: "Request sent successfully",
        request: newRequest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Request creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create request" },
      { status: 500 }
    );
  }
}
