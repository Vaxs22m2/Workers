import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { ensureSchema, getPool, isDbConfigured } from "@/lib/db";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

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

type LocalUser = {
  id: string;
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  role?: string;
  createdAt?: string;
  profile?: Record<string, unknown>;
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

declare global {
  var __workersUsersCache: LocalUser[] | undefined;
}

function getCache(): LocalUser[] {
  if (!global.__workersUsersCache) global.__workersUsersCache = [];
  return global.__workersUsersCache;
}

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

function toPublicUserFromLocal(user: LocalUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName || "",
    phone: user.phone || "",
    role: user.role || "",
    createdAt: user.createdAt || new Date().toISOString(),
    profile: user.profile || {},
  };
}

function readLocalUsers(): LocalUser[] {
  const cache = getCache();
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    const disk = (JSON.parse(raw || "[]") as LocalUser[]).map((u) => ({
      ...u,
      email: normalizeEmail(u.email),
    }));
    if (cache.length === 0) {
      global.__workersUsersCache = disk;
      return disk;
    }
    const merged = new Map<string, LocalUser>();
    [...disk, ...cache].forEach((u) => merged.set(u.id, u));
    const next = [...merged.values()];
    global.__workersUsersCache = next;
    return next;
  } catch {
    return cache;
  }
}

function writeLocalUsers(users: LocalUser[]) {
  global.__workersUsersCache = users;
  try {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown filesystem error";
    throw new Error(
      `Local user storage is not writable (${message}). Set DATABASE_URL for persistent auth.`
    );
  }
}

export async function createUser(
  email: string,
  password: string,
  fullName: string,
  phone: string,
  role: string
) {
  const normalizedEmail = normalizeEmail(email);

  if (isDbConfigured()) {
    await ensureSchema();
    const pool = getPool();

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

  const users = readLocalUsers();
  if (users.find((u) => u.email === normalizedEmail)) {
    throw new Error("User already exists");
  }

  const hashed = await bcrypt.hash(password, 10);
  const user: LocalUser = {
    id: `${Date.now()}${Math.random().toString(36).slice(2, 9)}`,
    email: normalizedEmail,
    password: hashed,
    fullName,
    phone,
    role,
    createdAt: new Date().toISOString(),
    profile: {},
  };
  users.push(user);
  writeLocalUsers(users);
  return toPublicUserFromLocal(user);
}

export async function verifyPassword(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  if (isDbConfigured()) {
    await ensureSchema();
    const pool = getPool();
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

  const users = readLocalUsers();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return toPublicUserFromLocal(user);
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (isDbConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const result = await pool.query<DbUser>(
      "SELECT * FROM users WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );
    const user = result.rows[0];
    return user ? toPublicUserFromDb(user) : null;
  }

  const users = readLocalUsers();
  const user = users.find((u) => u.email === normalizedEmail);
  return user ? toPublicUserFromLocal(user) : null;
}

type ProfileUpdateInput = {
  fullName?: string;
  phone?: string;
  profile?: Record<string, unknown>;
};

export async function updateUserProfile(userId: string, profileData: ProfileUpdateInput) {
  if (isDbConfigured()) {
    await ensureSchema();
    const pool = getPool();
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

  const users = readLocalUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("User not found");

  users[idx].fullName = profileData.fullName ?? users[idx].fullName;
  users[idx].phone = profileData.phone ?? users[idx].phone;
  users[idx].profile = {
    ...(users[idx].profile || {}),
    ...(profileData.profile || {}),
  };
  writeLocalUsers(users);
  return toPublicUserFromLocal(users[idx]);
}

export async function getUserById(userId: string) {
  if (isDbConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const result = await pool.query<DbUser>(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [userId]
    );
    const user = result.rows[0];
    return user ? toPublicUserFromDb(user) : null;
  }

  const users = readLocalUsers();
  const user = users.find((u) => u.id === userId);
  return user ? toPublicUserFromLocal(user) : null;
}

export async function listUsers() {
  if (isDbConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const result = await pool.query<DbUser>(
      "SELECT * FROM users ORDER BY created_at DESC"
    );
    return result.rows.map(toPublicUserFromDb);
  }

  return readLocalUsers().map(toPublicUserFromLocal);
}
