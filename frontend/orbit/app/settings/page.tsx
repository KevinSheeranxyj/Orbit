import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-3">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{value}</span>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <PageShell title="Settings">
            <div className="max-w-2xl space-y-4">
                <Card className="divide-y divide-zinc-100 px-5 dark:divide-zinc-800">
                    <div className="py-4">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            Network
                        </h3>
                    </div>
                    <Row label="Network" value="0G Testnet" />
                    <Row label="Chain ID" value="16600" />
                    <Row label="RPC Endpoint" value="https://evmrpc-testnet.0g.ai" />
                </Card>

                <Card className="divide-y divide-zinc-100 px-5 dark:divide-zinc-800">
                    <div className="py-4">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            Wallet
                        </h3>
                    </div>
                    <Row label="Connection" value="Not connected" />
                    <Row label="Balance" value="—" />
                </Card>

                <Card className="divide-y divide-zinc-100 px-5 dark:divide-zinc-800">
                    <div className="py-4">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            Notifications
                        </h3>
                    </div>
                    <Row label="High-risk alerts" value="Enabled" />
                    <Row label="Execution failures" value="Enabled" />
                    <Row label="Manual review requests" value="Enabled" />
                </Card>
            </div>
        </PageShell>
    );
}
