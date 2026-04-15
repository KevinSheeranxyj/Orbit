import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { requests } from "@/lib/mock-data";
import { shortenHash } from "@/lib/utils";

export default function RequestsPage() {
    return (
        <PageShell title="Requests">
            <Card className="overflow-hidden">
                <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        All Requests
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {requests.length} total
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                                {["ID", "Type", "Amount", "Recipient", "Agent", "Risk", "Status", "Date"].map(
                                    (h) => (
                                        <th
                                            key={h}
                                            className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                                        >
                                            {h}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {requests.map((r) => (
                                <tr
                                    key={r.id}
                                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                                >
                                    <td className="px-5 py-3.5 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                        {r.id}
                                    </td>
                                    <td className="px-5 py-3.5 capitalize text-zinc-700 dark:text-zinc-300">
                                        {r.actionType.replace("_", " ")}
                                    </td>
                                    <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">
                                        {r.amount} {r.token}
                                    </td>
                                    <td className="px-5 py-3.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                        {shortenHash(r.recipient)}
                                    </td>
                                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                                        {r.createdBy}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <StatusBadge status={r.riskLevel} />
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <StatusBadge status={r.status} />
                                    </td>
                                    <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">
                                        {r.createdAt}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </PageShell>
    );
}
