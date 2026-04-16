"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortenHash } from "@/lib/utils";
import { useState } from "react";

export function WalletButton() {
    const { address, isConnected } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();
    const [showMenu, setShowMenu] = useState(false);

    // Pick the best available connector:
    // Prefer the explicit braveWallet connector; fall back to the first injected one.
    const braveConnector =
        connectors.find((c) => c.id === "braveWallet") ?? connectors[0];

    if (isConnected && address) {
        return (
            <div className="relative">
                <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setShowMenu((v) => !v)}
                >
                    <Wallet size={13} />
                    {shortenHash(address)}
                    <ChevronDown size={12} />
                </Button>

                {showMenu && (
                    <div className="absolute right-0 top-full mt-1 w-40 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                        <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-zinc-100 dark:text-red-400 dark:hover:bg-zinc-800"
                            onClick={() => {
                                disconnect();
                                setShowMenu(false);
                            }}
                        >
                            <LogOut size={13} />
                            Disconnect
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <Button
            variant="outline"
            className="gap-1.5"
            disabled={isPending}
            onClick={() => connect({ connector: braveConnector })}
        >
            <Wallet size={13} />
            {isPending ? "Connecting…" : "Connect Wallet"}
        </Button>
    );
}
