import { NextResponse } from "next/server";
import { listUsers } from "@/lib/users";

export async function GET() {
  try {
    const users = listUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to read users:", error);
    return NextResponse.json({ error: "Failed to read users" }, { status: 500 });
  }
}
