import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DATA_FILE = path.join(process.cwd(), "data", "users.json");

type UserRecord = {
  id: string;
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  role?: string;
  createdAt?: string;
  profile?: Record<string, unknown>;
};

type UsersCache = {
  users: UserRecord[];
};

declare global {
  // eslint-disable-next-line no-var
  var __workersUsersCache: UsersCache | undefined;
}

function getCache(): UsersCache {
  if (!global.__workersUsersCache) {
    global.__workersUsersCache = { users: [] };
  }
  return global.__workersUsersCache;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readUsers(): UserRecord[] {
  const cache = getCache();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const diskUsers = (JSON.parse(raw || "[]") as UserRecord[]).map((u) => ({
      ...u,
      email: normalizeEmail(u.email),
    }));

    if (cache.users.length === 0) {
      cache.users = diskUsers;
      return cache.users;
    }

    const mergedById = new Map<string, UserRecord>();
    [...diskUsers, ...cache.users].forEach((u) => {
      mergedById.set(u.id, u);
    });
    cache.users = [...mergedById.values()];
    return cache.users;
  } catch (e) {
    return cache.users;
  }
}

function writeUsers(users: UserRecord[]) {
  const cache = getCache();
  cache.users = users;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch {
    // In many hosted serverless environments the filesystem is read-only.
    // Keep data in memory so auth still works for the current warm instance.
  }
}

export async function createUser(email: string, password: string, fullName: string, phone: string, role: string) {
  const normalizedEmail = normalizeEmail(email);
  const users = readUsers();
  if (users.find((u) => u.email === normalizedEmail)) {
    throw new Error("User already exists");
  }

  const hashed = await bcrypt.hash(password, 10);
  const id = `${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
  const user = {
    id,
    email: normalizedEmail,
    password: hashed,
    fullName,
    phone,
    role,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  const { password: _, ...without } = user as any;
  return without;
}

export async function verifyPassword(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const users = readUsers();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  const { password: _, ...without } = user as any;
  return without;
}

export async function updateUserProfile(userId: string, profileData: any) {
  const users = readUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    throw new Error("User not found");
  }

  // Update top-level user fields
  if (profileData.fullName) users[userIndex].fullName = profileData.fullName;
  if (profileData.phone) users[userIndex].phone = profileData.phone;

  // Initialize profile if it doesn't exist
  if (!users[userIndex].profile) {
    users[userIndex].profile = {};
  }

  // Update profile fields (merge with existing profile data)
  if (profileData.profile) {
    users[userIndex].profile = {
      ...users[userIndex].profile,
      ...profileData.profile,
    };
  }

  writeUsers(users);

  const { password: _, ...without } = users[userIndex] as any;
  return without;
}

export function getUserById(userId: string) {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  const { password: _, ...without } = user as any;
  return without;
}
