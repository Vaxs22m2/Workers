import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MESSAGES_FILE = path.join(process.cwd(), "data", "messages.json");

function readMessages(): any[] {
  try {
    const raw = fs.readFileSync(MESSAGES_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    return [];
  }
}

function writeMessages(messages: any[]) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf-8");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    const messages = readMessages();

    if (requestId) {
      const filtered = messages.filter((m: any) => m.requestId === requestId);
      return NextResponse.json(filtered);
    }

    return NextResponse.json(messages);
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
    const { requestId, senderId, senderName, senderRole, recipientId, message } = body;

    if (!requestId || !senderId || !recipientId || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const messages = readMessages();
    const id = `${Date.now()}${Math.random().toString(36).slice(2, 9)}`;

    const newMessage = {
      id,
      requestId,
      senderId,
      senderName,
      senderRole,
      recipientId,
      message,
      createdAt: new Date().toISOString(),
    };

    messages.push(newMessage);
    writeMessages(messages);

    return NextResponse.json({
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
