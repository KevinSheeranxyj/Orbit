import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db";

const router = Router();

type RiskLevel = "low" | "medium" | "high";
type Recommendation = "approve" | "review" | "reject";
type RequestStatus =
  | "pending"
  | "review_required"
  | "approved"
  | "rejected"
  | "executed"
  | "failed";

interface OrbitRequest {
  id: string;
  actionType: string;
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

function rowToRequest(row: Record<string, unknown>): OrbitRequest {
  return {
    id: row.id as string,
    actionType: row.action_type as string,
    amount: Number(row.amount),
    token: row.token as string,
    recipient: row.recipient as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    memo: row.memo as string | undefined,
    status: row.status as RequestStatus,
    riskLevel: row.risk_level as RiskLevel,
    recommendation: row.recommendation as Recommendation,
    confidence: row.confidence ? Number(row.confidence) : undefined,
    policyId: row.policy_id as string | undefined,
  };
}

function assessRisk(amount: number): {
  riskLevel: RiskLevel;
  recommendation: Recommendation;
  confidence: number;
  status: RequestStatus;
} {
  if (amount > 1000) {
    return {
      riskLevel: "high",
      recommendation: "review",
      confidence: 0.9,
      status: "review_required",
    };
  } else if (amount > 100) {
    return {
      riskLevel: "medium",
      recommendation: "review",
      confidence: 0.75,
      status: "review_required",
    };
  } else {
    return {
      riskLevel: "low",
      recommendation: "approve",
      confidence: 0.95,
      status: "approved",
    };
  }
}

// GET / — list all requests, newest first
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      "SELECT * FROM requests ORDER BY created_at DESC"
    );
    res.json({ data: result.rows.map(rowToRequest) });
  } catch (err) {
    next(err);
  }
});

// GET /:id — get one request
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query("SELECT * FROM requests WHERE id = $1", [
        req.params.id,
      ]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      res.json({ data: rowToRequest(result.rows[0]) });
    } catch (err) {
      next(err);
    }
  }
);

// POST / — create request
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      actionType,
      amount,
      token,
      recipient,
      createdBy,
      memo,
      policyId,
      onChainRequestId,
      txHash,
    } = req.body;

    if (!actionType || amount === undefined || !token || !recipient || !createdBy) {
      res.status(400).json({
        error:
          "Missing required fields: actionType, amount, token, recipient, createdBy",
      });
      return;
    }

    const id = uuidv4();
    const { riskLevel, recommendation, confidence, status } = assessRisk(
      Number(amount)
    );

    const result = await query(
      `INSERT INTO requests
        (id, action_type, amount, token, recipient, created_by, memo,
         status, risk_level, recommendation, confidence,
         policy_id, on_chain_request_id, tx_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        id,
        actionType,
        amount,
        token,
        recipient,
        createdBy,
        memo || null,
        status,
        riskLevel,
        recommendation,
        confidence,
        policyId || null,
        onChainRequestId || null,
        txHash || null,
      ]
    );

    res.status(201).json({ data: rowToRequest(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id — update status/txHash/onChainRequestId
router.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, txHash, onChainRequestId } = req.body;
      const { id } = req.params;

      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (status !== undefined) {
        fields.push(`status = $${idx++}`);
        values.push(status);
      }
      if (txHash !== undefined) {
        fields.push(`tx_hash = $${idx++}`);
        values.push(txHash);
      }
      if (onChainRequestId !== undefined) {
        fields.push(`on_chain_request_id = $${idx++}`);
        values.push(onChainRequestId);
      }

      if (fields.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await query(
        `UPDATE requests SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Request not found" });
        return;
      }

      res.json({ data: rowToRequest(result.rows[0]) });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
