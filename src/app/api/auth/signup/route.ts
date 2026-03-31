import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/users";
import { neonSignUpEmail } from "@/lib/neon-auth";
import jwt from "jsonwebtoken";
import { isDbConfigured } from "@/lib/db";
import { resolveAuthOrigin } from "@/lib/auth-origin";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

function canFallbackToLocalSignup(neonError: string | undefined, status: number | undefined) {
  const message = (neonError || "").toLowerCase();
  if (status === 0 || status === 503) return true;
  if (status && status >= 500) return true;

  return (
    message.includes("origin") ||
    message.includes("unable to reach auth service") ||
    message.includes("missing auth url") ||
    message.includes("failed to fetch")
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json(
        {
          error:
            "Database is not configured. Set DATABASE_URL (or POSTGRES_URL / POSTGRES_URL_NON_POOLING).",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const role = typeof body?.role === "string" ? body.role.trim().toLowerCase() : "";

    // Validate required fields
    if (!email || !password || !fullName || !phone || !role) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== "customer" && role !== "worker") {
      return NextResponse.json(
        { error: "Invalid role. Must be 'customer' or 'worker'" },
        { status: 400 }
      );
    }

    const origin = resolveAuthOrigin(request);

    // Create identity in Neon Auth first
    const neonSignup = await neonSignUpEmail({
      email,
      password,
      name: fullName,
      origin,
    });

    const useLocalFallback = !neonSignup.ok && canFallbackToLocalSignup(neonSignup.error, neonSignup.status);

    if (!neonSignup.ok && !useLocalFallback) {
      return NextResponse.json(
        { error: neonSignup.error || "Failed to create Neon auth user" },
        { status: neonSignup.status || 400 }
      );
    }

    if (useLocalFallback) {
      console.warn("Neon signup unavailable. Continuing with local signup fallback.", {
        status: neonSignup.status,
        error: neonSignup.error,
      });
    }

    // Create user
    let user: Awaited<ReturnType<typeof createUser>>;
    try {
      user = await createUser(email, password, fullName, phone, role);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      if (message.toLowerCase().includes("already exists")) {
        return NextResponse.json({ error: "User already exists" }, { status: 409 });
      }
      throw error;
    }

    const token =
      (neonSignup.ok ? neonSignup.token : undefined) ||
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
        message: "User created successfully",
        user,
        token,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 }
    );
  }
}
