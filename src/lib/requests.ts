import fs from "fs";
import path from "path";
import { ensureSchema, getPool, isDbConfigured } from "@/lib/db";

const REQUESTS_FILE = path.join(process.cwd(), "data", "requests.json");

export type RequestRecord = {
  id: string;
  customerId: string;
  workerId: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
};

type DbRequest = {
  id: string;
  customer_id: string;
  worker_id: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __workersRequestsCache: RequestRecord[] | undefined;
}

function getCache(): RequestRecord[] {
  if (!global.__workersRequestsCache) global.__workersRequestsCache = [];
  return global.__workersRequestsCache;
}

function toRequestRecord(req: DbRequest): RequestRecord {
  return {
    id: req.id,
    customerId: req.customer_id,
    workerId: req.worker_id,
    description: req.description,
    status: req.status,
    createdAt: req.created_at,
    updatedAt: req.updated_at || undefined,
  };
}

function readLocalRequests(): RequestRecord[] {
  const cache = getCache();
  try {
    const raw = fs.readFileSync(REQUESTS_FILE, "utf-8");
    const disk = JSON.parse(raw || "[]") as RequestRecord[];
    if (cache.length === 0) {
      global.__workersRequestsCache = disk;
      return disk;
    }
    const merged = new Map<string, RequestRecord>();
    [...disk, ...cache].forEach((r) => merged.set(r.id, r));
    const next = [...merged.values()];
    global.__workersRequestsCache = next;
    return next;
  } catch {
    return cache;
  }
}

function writeLocalRequests(requests: RequestRecord[]) {
  global.__workersRequestsCache = requests;
  try {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf-8");
  } catch {
    // read-only on some hosts; keep in-memory cache.
  }
}

export async function listRequests() {
  if (isDbConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const result = await pool.query<DbRequest>(
      "SELECT * FROM requests ORDER BY created_at DESC"
    );
    return result.rows.map(toRequestRecord);
  }
  return readLocalRequests();
}

export async function getRequestById(requestId: string) {
  if (isDbConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const result = await pool.query<DbRequest>(
      "SELECT * FROM requests WHERE id = $1 LIMIT 1",
      [requestId]
    );
    const req = result.rows[0];
    return req ? toRequestRecord(req) : null;
  }
  return readLocalRequests().find((r) => r.id === requestId) || null;
}

export async function createRequest(input: {
  customerId: string;
  workerId: string;
  description: string;
}) {
  if (isDbConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const id = `${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
    const result = await pool.query<DbRequest>(
      `INSERT INTO requests (id, customer_id, worker_id, description, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [id, input.customerId, input.workerId, input.description]
    );
    return toRequestRecord(result.rows[0]);
  }

  const requests = readLocalRequests();
  const next: RequestRecord = {
    id: `${Date.now()}${Math.random().toString(36).slice(2, 9)}`,
    customerId: input.customerId,
    workerId: input.workerId,
    description: input.description,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  requests.push(next);
  writeLocalRequests(requests);
  return next;
}

export async function updateRequestById(
  requestId: string,
  patch: { description?: string; status?: string }
) {
  if (isDbConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const current = await getRequestById(requestId);
    if (!current) return null;
    const nextDescription = patch.description ?? current.description;
    const nextStatus = patch.status ?? current.status;
    const result = await pool.query<DbRequest>(
      `UPDATE requests
       SET description = $2, status = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [requestId, nextDescription, nextStatus]
    );
    return toRequestRecord(result.rows[0]);
  }

  const requests = readLocalRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx === -1) return null;
  if (patch.description) requests[idx].description = patch.description;
  if (patch.status) requests[idx].status = patch.status;
  requests[idx].updatedAt = new Date().toISOString();
  writeLocalRequests(requests);
  return requests[idx];
}

export async function deleteRequestById(requestId: string) {
  if (isDbConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const result = await pool.query("DELETE FROM requests WHERE id = $1", [
      requestId,
    ]);
    return (result.rowCount || 0) > 0;
  }

  const requests = readLocalRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx === -1) return false;
  requests.splice(idx, 1);
  writeLocalRequests(requests);
  return true;
}
