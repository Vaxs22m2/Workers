import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const NOTIFICATIONS_FILE = path.join(process.cwd(), "data", "notifications.json");

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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const notifications = readNotifications();
    const userNotifications = notifications.filter(
      (n) => n.userId === userId
    );

    return NextResponse.json(userNotifications);
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
    const { userId, type, title, description, relatedId } = body;

    if (!userId || !type || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const notifications = readNotifications();
    const id = `${Date.now()}${Math.random().toString(36).slice(2, 9)}`;

    const newNotification = {
      id,
      userId,
      type, // 'request', 'message', etc.
      title,
      description,
      relatedId, // ID of the request, message, etc.
      read: false,
      createdAt: new Date().toISOString(),
    };

    notifications.push(newNotification);
    writeNotifications(notifications);

    return NextResponse.json(
      {
        message: "Notification created",
        notification: newNotification,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Notification creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create notification" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, read } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 }
      );
    }

    const notifications = readNotifications();
    const notificationIndex = notifications.findIndex(
      (n) => n.id === notificationId
    );

    if (notificationIndex === -1) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    notifications[notificationIndex].read = read ?? true;
    writeNotifications(notifications);

    return NextResponse.json(
      {
        message: "Notification updated",
        notification: notifications[notificationIndex],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Notification update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notification" },
      { status: 500 }
    );
  }
}
