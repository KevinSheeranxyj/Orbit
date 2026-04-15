import { Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

export function AppTopbar({ title }: { title: string }) {
    return (
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-950">
            <div>
                <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {title}
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    0G-native execution infrastructure
                </p>
            </div>

            <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Testnet
                </span>
                <ThemeToggle />
                <Button variant="outline" className="gap-1.5">
                    <Wallet size={13} />
                    Connect Wallet
                </Button>
            </div>
        </header>
    );
}
