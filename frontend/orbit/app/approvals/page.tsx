import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { getRequests } from "@/lib/api";
import { shortenHash } from "@/lib/utils";
import { ApprovalActions } from "./approval-actions";

export default async function ApprovalsPage() {
    const all = await getRequests();
    const pending = all.filter((r) => r.status === "review_required");

    return (
        <PageShell title="Approvals">
            <Card className="overflow-hidden">
                <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Pending Review
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {pending.length} request{pending.length !== 1 ? "s" : ""} awaiting decision
                    </p>
                </div>

                {pending.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
                        No requests pending review.
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {pending.map((r) => (
                            <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                            {r.id}
                                        </span>
                                        <StatusBadge status={r.riskLevel} />
                                    </div>
                                    <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                                        {r.amount} {r.token} → {shortenHash(r.recipient)}
                                    </p>
                                    {r.memo && (
                                        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                                            {r.memo}
                                        </p>
                                    )}
                                </div>
                                <ApprovalActions requestId={r.id} />
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </PageShell>
    );
}
