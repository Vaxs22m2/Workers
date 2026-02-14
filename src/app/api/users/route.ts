import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const file = path.join(process.cwd(), "data", "users.json");
    const raw = fs.readFileSync(file, "utf-8");
    const users = JSON.parse(raw);
    const usersWithoutPassword = users.map(({ password, ...u }: any) => u);
    return NextResponse.json(usersWithoutPassword);
  } catch (error: any) {
    console.error("Failed to read users:", error);
    return NextResponse.json({ error: "Failed to read users" }, { status: 500 });
  }
}
