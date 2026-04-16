import { PageShell } from "@/components/layout/page-shell";
import { MetricCard } from "./metric-card";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { getRequests } from "@/lib/api";

export default async function DashboardPage() {
    const requests = await getRequests();
    const pending  = requests.filter((r) => r.status === "review_required").length;
    const executed = requests.filter((r) => r.status === "executed").length;
    const highRisk = requests.filter((r) => r.riskLevel === "high").length;

    const recent = [...requests].reverse().slice(0, 5);

    return (
        <PageShell title="Dashboard">
            {/* Metric row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Total Requests" value={requests.length} />
                <MetricCard title="Pending Review" value={pending}  accent="amber" />
                <MetricCard title="Executed"        value={executed} accent="emerald" />
                <MetricCard title="High Risk"       value={highRisk} accent="red" />
            </div>

            {/* Recent requests */}
            <Card className="mt-6 overflow-hidden">
                <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        Recent Requests
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    ID
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Type
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Amount
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Risk
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Status
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                    Created
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {recent.map((r) => (
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
