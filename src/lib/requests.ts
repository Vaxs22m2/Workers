import fs from "fs";
import path from "path";

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

declare global {
  // eslint-disable-next-line no-var
  var __workersRequestsCache: RequestRecord[] | undefined;
}

function getCache(): RequestRecord[] {
  if (!global.__workersRequestsCache) {
    global.__workersRequestsCache = [];
  }
  return global.__workersRequestsCache;
}

function readRequestsFromSource(): RequestRecord[] {
  const cache = getCache();
  try {
    const raw = fs.readFileSync(REQUESTS_FILE, "utf-8");
    const diskRequests = JSON.parse(raw || "[]") as RequestRecord[];

    if (cache.length === 0) {
      global.__workersRequestsCache = diskRequests;
      return diskRequests;
    }

    const mergedById = new Map<string, RequestRecord>();
    [...diskRequests, ...cache].forEach((req) => {
      mergedById.set(req.id, req);
    });
    const merged = [...mergedById.values()];
    global.__workersRequestsCache = merged;
    return merged;
  } catch {
    return cache;
  }
}

function writeRequestsToSource(requests: RequestRecord[]) {
  global.__workersRequestsCache = requests;
  try {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf-8");
  } catch {
    // Hosted serverless environments can be read-only. Keep requests in memory.
  }
}

export function listRequests() {
  return readRequestsFromSource();
}

export function getRequestById(requestId: string) {
  return readRequestsFromSource().find((r) => r.id === requestId) || null;
}

export function createRequest(input: {
  customerId: string;
  workerId: string;
  description: string;
}) {
  const requests = readRequestsFromSource();
  const newRequest: RequestRecord = {
    id: `${Date.now()}${Math.random().toString(36).slice(2, 9)}`,
    customerId: input.customerId,
    workerId: input.workerId,
    description: input.description,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  requests.push(newRequest);
  writeRequestsToSource(requests);
  return newRequest;
}

export function updateRequestById(
  requestId: string,
  patch: { description?: string; status?: string }
) {
  const requests = readRequestsFromSource();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) return null;

  if (patch.description) requests[index].description = patch.description;
  if (patch.status) requests[index].status = patch.status;
  requests[index].updatedAt = new Date().toISOString();

  writeRequestsToSource(requests);
  return requests[index];
}

export function deleteRequestById(requestId: string) {
  const requests = readRequestsFromSource();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) return false;
  requests.splice(index, 1);
  writeRequestsToSource(requests);
  return true;
}
