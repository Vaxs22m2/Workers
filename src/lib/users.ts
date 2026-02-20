import bcrypt from "bcryptjs";
import { ensureSchema, getPool, isDbConfigured } from "@/lib/db";

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

type ProfileUpdateInput = {
  fullName?: string;
  phone?: string;
  profile?: Record<string, unknown>;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUserFromDb(user: DbUser): PublicUser {
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

function requireDatabase() {
  if (isDbConfigured()) return;
  throw new Error(
    "Database is not configured. Set DATABASE_URL (or POSTGRES_URL / POSTGRES_URL_NON_POOLING)."
  );
}

async function getDbPool() {
  requireDatabase();
  await ensureSchema();
  return getPool();
}

export async function createUser(
  email: string,
  password: string,
  fullName: string,
  phone: string,
  role: string
) {
  const normalizedEmail = normalizeEmail(email);
  const pool = await getDbPool();

  const existing = await pool.query<DbUser>(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [normalizedEmail]
  );
  if (existing.rows.length > 0) throw new Error("User already exists");

  const hashed = await bcrypt.hash(password, 10);
  const id = `${Date.now()}${Math.random().toString(36).slice(2, 9)}`;

  const result = await pool.query<DbUser>(
    `INSERT INTO users (id, email, password, full_name, phone, role, profile)
     VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb)
     RETURNING *`,
    [id, normalizedEmail, hashed, fullName, phone, role]
  );

  return toPublicUserFromDb(result.rows[0]);
}

export async function verifyPassword(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const pool = await getDbPool();

  const result = await pool.query<DbUser>(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [normalizedEmail]
  );
  const user = result.rows[0];
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return toPublicUserFromDb(user);
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const pool = await getDbPool();

  const result = await pool.query<DbUser>(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [normalizedEmail]
  );
  const user = result.rows[0];
  return user ? toPublicUserFromDb(user) : null;
}

export async function updateUserProfile(userId: string, profileData: ProfileUpdateInput) {
  const pool = await getDbPool();

  const currentResult = await pool.query<DbUser>(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const current = currentResult.rows[0];
  if (!current) throw new Error("User not found");

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

  return toPublicUserFromDb(updated.rows[0]);
}

export async function getUserById(userId: string) {
  const pool = await getDbPool();
  const result = await pool.query<DbUser>(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const user = result.rows[0];
  return user ? toPublicUserFromDb(user) : null;
}

export async function listUsers() {
  const pool = await getDbPool();
  const result = await pool.query<DbUser>(
    "SELECT * FROM users ORDER BY created_at DESC"
  );
  return result.rows.map(toPublicUserFromDb);
}
