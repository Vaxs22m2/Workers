import { ensureSchema, getPool } from "@/lib/db";

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

export async function listRequests() {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query<DbRequest>(
    "SELECT * FROM requests ORDER BY created_at DESC"
  );
  return result.rows.map(toRequestRecord);
}

export async function getRequestById(requestId: string) {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query<DbRequest>(
    "SELECT * FROM requests WHERE id = $1 LIMIT 1",
    [requestId]
  );
  const req = result.rows[0];
  return req ? toRequestRecord(req) : null;
}

export async function createRequest(input: {
  customerId: string;
  workerId: string;
  description: string;
}) {
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

export async function updateRequestById(
  requestId: string,
  patch: { description?: string; status?: string }
) {
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

export async function deleteRequestById(requestId: string) {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query("DELETE FROM requests WHERE id = $1", [
    requestId,
  ]);
  return (result.rowCount || 0) > 0;
}
