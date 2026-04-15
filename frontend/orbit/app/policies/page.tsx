import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { policies } from "@/lib/mock-data";

export default function PoliciesPage() {
    return (
        <PageShell title="Policies">
            <div className="grid gap-4">
                {policies.map((p) => (
                    <Card key={p.id} className="p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                        {p.name}
                                    </h3>
                                    <StatusBadge status={p.active ? "active" : "inactive"} />
                                </div>
                                <p className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                    {p.id}
                                </p>
                            </div>
                            <p className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                                Updated {p.updatedAt}
                            </p>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Max Auto Amount
                                </p>
                                <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">
                                    ${p.maxAutoAmount}
                                </p>
                            </div>
                            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Manual Review Above
                                </p>
                                <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">
                                    ${p.requireManualReviewAbove}
                                </p>
                            </div>
                            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Whitelist Required
                                </p>
                                <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">
                                    {p.requireWhitelist ? "Yes" : "No"}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </PageShell>
    );
}
