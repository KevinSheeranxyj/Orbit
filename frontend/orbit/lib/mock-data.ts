import { ExecutionReceipt, Policy } from './types';

export const policies: Policy[] = [
    {
        id: "POL-001",
        name: "Treasury Payments",
        maxAutoAmount: 100,
        requireWhitelist: true,
        requireManualReviewAbove: 500,
        active: true,
        updatedAt: "2026-04-12 18:00",
      },
      {
        id: "POL-002",
        name: "Internal Transfers",
        maxAutoAmount: 250,
        requireWhitelist: false,
        requireManualReviewAbove: 1000,
        active: true,
        updatedAt: "2026-04-12 19:30",
      },
]

export const requests = [
    {
        id: "REQ-001",
        actionType: "payment" as const,
        amount: 50,
        token: "USDC",
        recipient: "0xabc123",
        createdBy: "agent-1",
        createdAt: "2026-04-14 10:00",
        status: "executed" as const,
        riskLevel: "low" as const,
        recommendation: "approve" as const,
        confidence: 0.95,
        policyId: "POL-001",
    },
    {
        id: "REQ-002",
        actionType: "transfer" as const,
        amount: 750,
        token: "ETH",
        recipient: "0xdef456",
        createdBy: "agent-2",
        createdAt: "2026-04-14 11:30",
        status: "review_required" as const,
        riskLevel: "high" as const,
        recommendation: "review" as const,
        confidence: 0.6,
        policyId: "POL-002",
    },
    {
        id: "REQ-003",
        actionType: "payment" as const,
        amount: 20,
        token: "USDC",
        recipient: "0xghi789",
        createdBy: "agent-1",
        createdAt: "2026-04-15 09:00",
        status: "pending" as const,
        riskLevel: "low" as const,
        recommendation: "approve" as const,
        confidence: 0.98,
        policyId: "POL-001",
    },
]

export const receiptByRequestId: Record<string, ExecutionReceipt> = {
    "REQ-001": {
        id: "REC-001",
        requestId: "REQ-001",
        receiptHash: "0xhash001",
        txHash: "0xtx001",
        contractAddress: undefined,
        blockNumber: 123456,
        status: "confirmed",
        timestamp: "2026-04-14 10:05",
    },
}