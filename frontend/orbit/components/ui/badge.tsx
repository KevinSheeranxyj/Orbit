import { cn } from "@/lib/utils";

export function Badge({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                className
            )}
        >
            {children}
        </span>
    );
}

const statusStyles: Record<string, string> = {
    pending:
        "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    review_required:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    rejected:
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    executed:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    failed:
        "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    confirmed:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    active:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    inactive:
        "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export function StatusBadge({ status }: { status: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                statusStyles[status] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            )}
        >
            {status.replace("_", " ")}
        </span>
    );
}
