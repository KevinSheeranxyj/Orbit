import { OrbitRequest, Policy, ExecutionReceipt } from "./types";

const API = process.env.BACKEND_URL ?? "http://localhost:4000";

async function get<T>(path: string): Promise<T[]> {
    try {
        const res = await fetch(`${API}${path}`, { cache: "no-store" });
        if (!res.ok) return [];
        const json = await res.json();
        return json.data ?? [];
    } catch {
        return [];
    }
}

export async function getRequests(): Promise<OrbitRequest[]> {
    return get<OrbitRequest>("/api/requests");
}

export async function getPolicies(): Promise<Policy[]> {
    return get<Policy>("/api/policies");
}

export async function getReceipts(): Promise<ExecutionReceipt[]> {
    return get<ExecutionReceipt>("/api/receipts");
}

export async function getApprovals() {
    return get<{ id: string; requestId: string; reviewerAddress: string; decision: string; reason?: string; createdAt: string }>("/api/approvals");
}
