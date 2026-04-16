import { NextResponse } from "next/server";

const API = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET() {
    const res = await fetch(`${API}/api/receipts`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
