import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByEmail, verifyPassword } from "@/lib/users";
import { neonSignInEmail } from "@/lib/neon-auth";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin") || request.nextUrl.origin;

    // Authenticate against Neon Auth
    const neonLogin = await neonSignInEmail({
      email,
      password,
      origin,
    });

    // Backward-compatible fallback for users created before Neon auth integration.
    if (!neonLogin.ok) {
      const localUser = await verifyPassword(email, password);
      if (localUser) {
        const fallbackToken = jwt.sign(
          {
            id: localUser.id,
            email: localUser.email,
            role: localUser.role,
          },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        return NextResponse.json(
          {
            message: "Login successful",
            user: localUser,
            token: fallbackToken,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: neonLogin.error || "Invalid email or password" },
        { status: neonLogin.status === 0 ? 401 : neonLogin.status || 401 }
      );
    }

    let user = await getUserByEmail(email);

    // Backfill local profile if Neon account exists but local profile does not.
    if (!user) {
      try {
        user = await createUser(email, password, email.split("@")[0] || "User", "", "customer");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "";
        if (!message.toLowerCase().includes("already exists")) {
          throw error;
        }
        user = await getUserByEmail(email);
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Could not resolve local user profile after authentication" },
        { status: 500 }
      );
    }

    // Reuse Neon token when present, otherwise keep prior local JWT behavior.
    const token =
      neonLogin.token ||
      jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

    return NextResponse.json(
      {
        message: "Login successful",
        user,
        token,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to login" },
      { status: 500 }
    );
  }
}
