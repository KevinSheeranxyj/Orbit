"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import {
    keccak256,
    encodeAbiParameters,
    parseAbiParameters,
    parseUnits,
    isAddress,
    pad,
    toHex,
} from "viem";
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { policies } from "@/lib/mock-data";
import { GUARDED_EXECUTOR_ADDRESS, GUARDED_EXECUTOR_ABI } from "@/lib/contracts";
import { shortenHash } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Convert a policy's string ID (e.g. "POL-001") to a bytes32 for demo purposes.
// In production you would use the actual on-chain bytes32 returned by PolicyRegistry.
function policyStringToBytes32(id: string): `0x${string}` {
    return pad(toHex(new TextEncoder().encode(id)), { size: 32 });
}

const NATIVE_ETH = "0x0000000000000000000000000000000000000000" as const;

const TOKEN_OPTIONS = [
    { label: "ETH (native)", value: NATIVE_ETH, decimals: 18 },
    { label: "Custom ERC-20", value: "custom", decimals: 18 },
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function SubmitRequestModal({ isOpen, onClose }: Props) {
    const { isConnected } = useAccount();

    // Form state
    const [policyId, setPolicyId]     = useState(policies[0]?.id ?? "");
    const [amount, setAmount]         = useState("");
    const [tokenOption, setTokenOption] = useState<string>(NATIVE_ETH);
    const [customToken, setCustomToken] = useState("");
    const [recipient, setRecipient]   = useState("");
    const [memo, setMemo]             = useState("");
    const [formError, setFormError]   = useState("");

    const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    // After on-chain confirmation, persist to backend
    useEffect(() => {
        if (isSuccess && txHash) {
            fetch("/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    actionType: "payment",
                    amount: Number(amount),
                    token: tokenOption === "custom" ? customToken : "ETH",
                    recipient,
                    createdBy: "wallet",
                    memo,
                    policyId,
                    txHash,
                }),
            }).catch(() => {/* best-effort */});
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuccess, txHash]);

    if (!isOpen) return null;

    function handleClose() {
        reset();
        setFormError("");
        setAmount("");
        setRecipient("");
        setMemo("");
        onClose();
    }

    function validate(): string | null {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
            return "Enter a valid positive amount.";
        if (!isAddress(recipient))
            return "Recipient must be a valid 0x address.";
        if (tokenOption === "custom" && !isAddress(customToken))
            return "Custom token must be a valid 0x address.";
        if (!isConnected)
            return "Connect your wallet first.";
        return null;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormError("");

        const err = validate();
        if (err) { setFormError(err); return; }

        const tokenAddress =
            tokenOption === "custom"
                ? (customToken as `0x${string}`)
                : (tokenOption as `0x${string}`);

        // Compute amount in wei / token base units (18 decimals for both ETH and demo USDC)
        const amountWei = parseUnits(amount, 18);

        // Derive an evidence hash from the request inputs (off-chain bundle placeholder)
        const evidenceHash = keccak256(
            encodeAbiParameters(
                parseAbiParameters("address, uint256, address, string"),
                [recipient as `0x${string}`, amountWei, tokenAddress, memo]
            )
        );

        const policyBytes32 = policyStringToBytes32(policyId);
        console.log(policyBytes32);

        writeContract({
            address: GUARDED_EXECUTOR_ADDRESS,
            abi: GUARDED_EXECUTOR_ABI,
            functionName: "submitRequest",
            args: [
                policyBytes32,
                amountWei,
                tokenAddress,
                recipient as `0x${string}`,
                evidenceHash,
                "",   // storageRef — populated by backend after 0G upload
                memo,
            ],
        });
    }

    const displayError = formError || (writeError ? writeError.message.split("\n")[0] : "");

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
        >
            {/* Panel */}
            <div
                className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                            New Payment Request
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Submits to GuardedExecutor on 0G Testnet
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Success state */}
                {isSuccess && txHash ? (
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                        <CheckCircle size={40} className="text-emerald-500" />
                        <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                                Request submitted!
                            </p>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Tx: {shortenHash(txHash, 10, 6)}
                            </p>
                        </div>
                        <Button onClick={handleClose}>Done</Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Policy */}
                        <Field label="Policy">
                            <select
                                value={policyId}
                                onChange={(e) => setPolicyId(e.target.value)}
                                className={selectClass}
                            >
                                {policies.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} — auto ≤{p.maxAutoAmount}, review &gt;{p.requireManualReviewAbove}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        {/* Amount + Token */}
                        <div className="flex gap-3">
                            <Field label="Amount" className="flex-1">
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="Token" className="w-44">
                                <select
                                    value={tokenOption}
                                    onChange={(e) => setTokenOption(e.target.value)}
                                    className={selectClass}
                                >
                                    {TOKEN_OPTIONS.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        {/* Custom token address */}
                        {tokenOption === "custom" && (
                            <Field label="Token Contract Address">
                                <input
                                    type="text"
                                    placeholder="0x…"
                                    value={customToken}
                                    onChange={(e) => setCustomToken(e.target.value)}
                                    className={inputClass}
                                />
                            </Field>
                        )}

                        {/* Recipient */}
                        <Field label="Recipient Address">
                            <input
                                type="text"
                                placeholder="0x…"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                className={inputClass}
                            />
                        </Field>

                        {/* Memo */}
                        <Field label="Memo (optional)">
                            <input
                                type="text"
                                placeholder="Reason for this payment…"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                className={inputClass}
                            />
                        </Field>

                        {/* Error */}
                        {displayError && (
                            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                <span className="break-all">{displayError}</span>
                            </div>
                        )}

                        {/* Wallet not connected notice */}
                        {!isConnected && (
                            <p className="text-center text-xs text-amber-600 dark:text-amber-400">
                                Connect your wallet to submit on-chain.
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending || isConfirming || !isConnected}
                            >
                                {isPending || isConfirming ? (
                                    <>
                                        <Loader2 size={13} className="animate-spin" />
                                        {isPending ? "Confirm in wallet…" : "Confirming…"}
                                    </>
                                ) : (
                                    "Submit Request"
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Field({
    label,
    children,
    className,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {label}
            </label>
            {children}
        </div>
    );
}

const inputClass =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-800";

const selectClass =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800";
