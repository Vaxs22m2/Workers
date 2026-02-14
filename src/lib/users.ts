import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DATA_FILE = path.join(process.cwd(), "data", "users.json");

function readUsers(): any[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    return [];
  }
}

function writeUsers(users: any[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export async function createUser(email: string, password: string, fullName: string, phone: string, role: string) {
  const users = readUsers();
  if (users.find((u) => u.email === email)) {
    throw new Error("User already exists");
  }

  const hashed = await bcrypt.hash(password, 10);
  const id = `${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
  const user = {
    id,
    email,
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
  const users = readUsers();
  const user = users.find((u) => u.email === email);
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
