import {clsx, type ClassValue } from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function shortenHash(value: string, start = 6, end = 4) {
    if (!value || value.length <= start + end) return value;
    return `${value.slice(0, start)}...${value.slice(-end)}}`;
}

