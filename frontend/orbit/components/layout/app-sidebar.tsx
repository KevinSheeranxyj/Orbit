"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    GitPullRequest,
    ShieldCheck,
    Receipt,
    Settings,
    Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/requests",  label: "Requests",  icon: GitPullRequest },
    { href: "/policies",  label: "Policies",  icon: ShieldCheck },
    { href: "/receipts",  label: "Receipts",  icon: Receipt },
    { href: "/settings",  label: "Settings",  icon: Settings },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:flex">
            {/* Logo */}
            <div className="flex items-center gap-2.5 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
                    <Activity size={15} className="text-white dark:text-zinc-900" />
                </div>
                <div>
                    <div className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Orbit
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        AI Trust Console
                    </p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-0.5 px-3 py-4">
                {items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + "/");
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                active
                                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            )}
                        >
                            <Icon size={15} />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
                <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
                    Powered by 0G Network
                </p>
            </div>
        </aside>
    );
}
