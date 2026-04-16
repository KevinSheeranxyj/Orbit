"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApprovalActions({ requestId }: { requestId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [acting, setActing] = useState<"approve" | "reject" | null>(null);

    async function decide(decision: "approved" | "rejected") {
        setActing(decision === "approved" ? "approve" : "reject");
        await fetch("/api/approvals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requestId,
                reviewerAddress: "manual-reviewer",
                decision,
            }),
        });
        startTransition(() => router.refresh());
        setActing(null);
    }

    const loading = isPending || acting !== null;

    return (
        <div className="flex shrink-0 gap-2">
            <Button
                variant="outline"
                className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                disabled={loading}
                onClick={() => decide("rejected")}
            >
                {acting === "reject" ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                Reject
            </Button>
            <Button
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                disabled={loading}
                onClick={() => decide("approved")}
            >
                {acting === "approve" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Approve
            </Button>
        </div>
    );
}
