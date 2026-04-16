import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db";

const router = Router();

interface ExecutionReceipt {
  id: string;
  requestId: string;
  receiptHash?: string;
  txHash?: string;
  contractAddress?: string;
  blockNumber?: number;
  status: "pending" | "confirmed" | "failed";
  timestamp: string;
}

function rowToReceipt(row: Record<string, unknown>): ExecutionReceipt {
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    receiptHash: row.receipt_hash as string | undefined,
    txHash: row.tx_hash as string | undefined,
    contractAddress: row.contract_address as string | undefined,
    blockNumber: row.block_number ? Number(row.block_number) : undefined,
    status: row.status as "pending" | "confirmed" | "failed",
    timestamp: row.created_at as string,
  };
}

// GET / — list all receipts
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      "SELECT * FROM receipts ORDER BY created_at DESC"
    );
    res.json({ data: result.rows.map(rowToReceipt) });
  } catch (err) {
    next(err);
  }
});

// GET /by-request/:requestId — get receipt for a request
// NOTE: must be registered BEFORE /:id to avoid shadowing
router.get(
  "/by-request/:requestId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        "SELECT * FROM receipts WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1",
        [req.params.requestId]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Receipt not found for this request" });
        return;
      }
      res.json({ data: rowToReceipt(result.rows[0]) });
    } catch (err) {
      next(err);
    }
  }
);

// GET /:id — get one receipt
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query("SELECT * FROM receipts WHERE id = $1", [
        req.params.id,
      ]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Receipt not found" });
        return;
      }
      res.json({ data: rowToReceipt(result.rows[0]) });
    } catch (err) {
      next(err);
    }
  }
);

// POST / — create receipt
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      requestId,
      receiptHash,
      txHash,
      contractAddress,
      blockNumber,
      status,
    } = req.body;

    if (!requestId) {
      res.status(400).json({ error: "Missing required field: requestId" });
      return;
    }

    const id = uuidv4();

    const result = await query(
      `INSERT INTO receipts
        (id, request_id, receipt_hash, tx_hash, contract_address, block_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        requestId,
        receiptHash || null,
        txHash || null,
        contractAddress || null,
        blockNumber || null,
        status || "pending",
      ]
    );

    res.status(201).json({ data: rowToReceipt(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PATCH /:id — update status, txHash, blockNumber, failReason
router.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, txHash, blockNumber, failReason } = req.body;
      const { id } = req.params;

      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (status !== undefined) {
        fields.push(`status = $${idx++}`);
        values.push(status);
        if (status === "confirmed") {
          fields.push(`confirmed_at = NOW()`);
        }
      }
      if (txHash !== undefined) {
        fields.push(`tx_hash = $${idx++}`);
        values.push(txHash);
      }
      if (blockNumber !== undefined) {
        fields.push(`block_number = $${idx++}`);
        values.push(blockNumber);
      }
      if (failReason !== undefined) {
        fields.push(`fail_reason = $${idx++}`);
        values.push(failReason);
      }

      if (fields.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      values.push(id);

      const result = await query(
        `UPDATE receipts SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Receipt not found" });
        return;
      }

      res.json({ data: rowToReceipt(result.rows[0]) });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
