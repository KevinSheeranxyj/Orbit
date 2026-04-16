import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db";

const router = Router();

interface Approval {
  id: string;
  requestId: string;
  reviewerAddress: string;
  decision: "approved" | "rejected";
  reason?: string;
  createdAt: string;
}

function rowToApproval(row: Record<string, unknown>): Approval {
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    reviewerAddress: row.reviewer_address as string,
    decision: row.decision as "approved" | "rejected",
    reason: row.reason as string | undefined,
    createdAt: row.created_at as string,
  };
}

// GET / — list all approvals, optionally filtered by ?requestId=
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId } = req.query;

    let sql = "SELECT * FROM approvals";
    const params: unknown[] = [];

    if (requestId) {
      sql += " WHERE request_id = $1";
      params.push(requestId);
    }

    sql += " ORDER BY created_at DESC";

    const result = await query(sql, params);
    res.json({ data: result.rows.map(rowToApproval) });
  } catch (err) {
    next(err);
  }
});

// POST / — record approval/rejection and update request status
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId, reviewerAddress, decision, reason } = req.body;

    if (!requestId || !reviewerAddress || !decision) {
      res.status(400).json({
        error:
          "Missing required fields: requestId, reviewerAddress, decision",
      });
      return;
    }

    if (decision !== "approved" && decision !== "rejected") {
      res.status(400).json({
        error: 'decision must be "approved" or "rejected"',
      });
      return;
    }

    // Verify the request exists
    const requestCheck = await query(
      "SELECT id FROM requests WHERE id = $1",
      [requestId]
    );
    if (requestCheck.rows.length === 0) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const id = uuidv4();

    // Insert approval record
    const result = await query(
      `INSERT INTO approvals (id, request_id, reviewer_address, decision, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, requestId, reviewerAddress, decision, reason || null]
    );

    // Update the corresponding request status
    await query(
      `UPDATE requests SET status = $1, updated_at = NOW() WHERE id = $2`,
      [decision, requestId]
    );

    res.status(201).json({ data: rowToApproval(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;
