import bcrypt from "bcryptjs";
import { ensureSchema, getPool } from "@/lib/db";

type DbUser = {
  id: string;
  email: string;
  password: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  profile: Record<string, unknown> | null;
};

type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  createdAt: string;
  profile: Record<string, unknown>;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name || "",
    phone: user.phone || "",
    role: user.role || "",
    createdAt: user.created_at,
    profile: user.profile || {},
  };
}

export async function createUser(
  email: string,
  password: string,
  fullName: string,
  phone: string,
  role: string
) {
  await ensureSchema();
  const pool = getPool();
  const normalizedEmail = normalizeEmail(email);

  const existing = await pool.query<DbUser>(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [normalizedEmail]
  );
  if (existing.rows.length > 0) {
    throw new Error("User already exists");
  }

  const hashed = await bcrypt.hash(password, 10);
  const id = `${Date.now()}${Math.random().toString(36).slice(2, 9)}`;

  const result = await pool.query<DbUser>(
    `INSERT INTO users (id, email, password, full_name, phone, role, profile)
     VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb)
     RETURNING *`,
    [id, normalizedEmail, hashed, fullName, phone, role]
  );

  return toPublicUser(result.rows[0]);
}

export async function verifyPassword(email: string, password: string) {
  await ensureSchema();
  const pool = getPool();
  const normalizedEmail = normalizeEmail(email);

  const result = await pool.query<DbUser>(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [normalizedEmail]
  );
  const user = result.rows[0];
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;

  return toPublicUser(user);
}

export async function updateUserProfile(userId: string, profileData: any) {
  await ensureSchema();
  const pool = getPool();

  const currentResult = await pool.query<DbUser>(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const current = currentResult.rows[0];
  if (!current) {
    throw new Error("User not found");
  }

  const mergedProfile = {
    ...(current.profile || {}),
    ...(profileData.profile || {}),
  };

  const nextFullName = profileData.fullName ?? current.full_name;
  const nextPhone = profileData.phone ?? current.phone;

  const updated = await pool.query<DbUser>(
    `UPDATE users
     SET full_name = $2, phone = $3, profile = $4::jsonb
     WHERE id = $1
     RETURNING *`,
    [userId, nextFullName, nextPhone, JSON.stringify(mergedProfile)]
  );

  return toPublicUser(updated.rows[0]);
}

export async function getUserById(userId: string) {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query<DbUser>(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const user = result.rows[0];
  if (!user) return null;
  return toPublicUser(user);
}

export async function listUsers() {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query<DbUser>(
    "SELECT * FROM users ORDER BY created_at DESC"
  );
  return result.rows.map(toPublicUser);
}
