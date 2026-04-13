export type RequestStatus = 
| "pending"
| "review_required"
| "approved"
| "rejected"
| "executed"
| "failed";


export type RiskLevel = "low" | "medium" | "high";
export type Recommendation = "approve" | "review" | "reject";
export type ActionType = "payment" | "transfer" | "contract_call";


export interface OrbitRequest {
    id: string;
    actionType: ActionType;
    amount: number;
    token: string;
    recipient: string;
    createdBy: string;
    createdAt: string;
    memo?: string;
    status: RequestStatus;
    riskLevel: RiskLevel;
    recommendation: Recommendation;
    confidence?: number;
    policyId?: string;
}

export interface PolicyTrigger {
    id: string;
    label: string;
    severity: "info" | "warning" | "critical";
}

export interface DecisionTrace {
    recommendation: Recommendation;
    riskLevel: RiskLevel;
    confidence: number;
    reasonSummary: string;
    modelOutputHash: string;
    triggers: PolicyTrigger[];
  }
  
  export interface EvidenceBundle {
    id: string;
    inputHash: string;
    outputHash: string;
    policyHash: string;
    storageRef: string;
    createdAt: string;
  }
  
  export interface ExecutionReceipt {
    id: string;
    requestId: string;
    receiptHash: string;
    txHash?: string;
    contractAddress?: string;
    blockNumber?: number;
    status: "pending" | "confirmed" | "failed";
    timestamp: string;
  }
  
  export interface Policy {
    id: string;
    name: string;
    maxAutoAmount: number;
    requireWhitelist: boolean;
    requireManualReviewAbove: number;
    active: boolean;
    updatedAt: string;
  }