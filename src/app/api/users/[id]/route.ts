import { NextRequest, NextResponse } from "next/server";
import { updateUserProfile, getUserById } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: userId } = params instanceof Promise ? await params : params;
    console.log("Getting user:", userId);
    const user = getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("GET error:", error);
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
    const { id: userId } = params instanceof Promise ? await params : params;
    const body = await request.json();

    console.log("Updating user:", userId);
    console.log("Update data:", body);

    const updatedUser = await updateUserProfile(userId, body);

    console.log("User updated successfully");
    return NextResponse.json(
      {
        message: "Profile updated successfully",
        user: updatedUser,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
