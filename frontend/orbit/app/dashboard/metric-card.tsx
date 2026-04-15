import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
    title,
    value,
    subtitle,
    accent,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    accent?: "default" | "amber" | "red" | "emerald";
}) {
    const accentColor = {
        default:  "text-zinc-900 dark:text-zinc-50",
        amber:    "text-amber-600 dark:text-amber-400",
        red:      "text-red-600 dark:text-red-400",
        emerald:  "text-emerald-600 dark:text-emerald-400",
    }[accent ?? "default"];

    return (
        <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {title}
            </p>
            <p className={cn("mt-2 text-3xl font-bold tabular-nums", accentColor)}>
                {value}
            </p>
            {subtitle && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
            )}
        </Card>
    );
}
