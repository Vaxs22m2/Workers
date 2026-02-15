import { NextRequest, NextResponse } from "next/server";
import { listUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const lite = searchParams.get("lite") === "1";

    let users: any[] = await listUsers();
    if (role) {
      users = users.filter((u: any) => u.role === role);
    }

    if (lite) {
      users = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        profile: {
          location: u.profile?.location || "",
          skills: u.profile?.skills || "",
          description: u.profile?.description || "",
          profilePicture: u.profile?.profilePicture || "",
        },
      }));
    }

    return NextResponse.json(users, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to read users:", error);
    return NextResponse.json({ error: "Failed to read users" }, { status: 500 });
  }
}
