// ─── GuardedExecutor ─────────────────────────────────────────────────────────
// Set NEXT_PUBLIC_GUARDED_EXECUTOR_ADDRESS in .env.local after deploying.
export const GUARDED_EXECUTOR_ADDRESS =
    (process.env.NEXT_PUBLIC_GUARDED_EXECUTOR_ADDRESS as `0x${string}`) ??
    "0x0000000000000000000000000000000000000000";

export const GUARDED_EXECUTOR_ABI = [
    {
        inputs: [
            { internalType: "bytes32", name: "policyId",     type: "bytes32" },
            { internalType: "uint256", name: "amount",       type: "uint256" },
            { internalType: "address", name: "token",        type: "address" },
            { internalType: "address", name: "recipient",    type: "address" },
            { internalType: "bytes32", name: "evidenceHash", type: "bytes32" },
            { internalType: "string",  name: "storageRef",   type: "string"  },
            { internalType: "string",  name: "memo",         type: "string"  },
        ],
        name: "submitRequest",
        outputs: [{ internalType: "bytes32", name: "requestId", type: "bytes32" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true,  internalType: "bytes32", name: "requestId", type: "bytes32" },
            { indexed: true,  internalType: "bytes32", name: "policyId",  type: "bytes32" },
            { indexed: true,  internalType: "address", name: "submitter", type: "address" },
            { indexed: false, internalType: "address", name: "recipient", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount",    type: "uint256" },
            { indexed: false, internalType: "address", name: "token",     type: "address" },
            { indexed: false, internalType: "uint8",   name: "status",    type: "uint8"   },
        ],
        name: "RequestSubmitted",
        type: "event",
    },
] as const;
