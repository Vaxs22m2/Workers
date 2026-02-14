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
