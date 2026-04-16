import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db";

const router = Router();

interface Policy {
  id: string;
  name: string;
  maxAutoAmount: number;
  requireWhitelist: boolean;
  requireManualReviewAbove: number;
  active: boolean;
  updatedAt: string;
}

function rowToPolicy(row: Record<string, unknown>): Policy {
  return {
    id: row.id as string,
    name: row.name as string,
    maxAutoAmount: Number(row.max_auto_amount),
    requireWhitelist: row.require_whitelist as boolean,
    requireManualReviewAbove: Number(row.require_manual_review_above),
    active: row.active as boolean,
    updatedAt: row.updated_at as string,
  };
}

// GET / — list all active policies
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      "SELECT * FROM policies WHERE active = true ORDER BY created_at DESC"
    );
    res.json({ data: result.rows.map(rowToPolicy) });
  } catch (err) {
    next(err);
  }
});

// GET /:id — get one policy
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query("SELECT * FROM policies WHERE id = $1", [
        req.params.id,
      ]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Policy not found" });
        return;
      }
      res.json({ data: rowToPolicy(result.rows[0]) });
    } catch (err) {
      next(err);
    }
  }
);

// POST / — create policy
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, maxAutoAmount, requireWhitelist, requireManualReviewAbove } =
      req.body;

    if (
      !name ||
      maxAutoAmount === undefined ||
      requireWhitelist === undefined ||
      requireManualReviewAbove === undefined
    ) {
      res.status(400).json({
        error:
          "Missing required fields: name, maxAutoAmount, requireWhitelist, requireManualReviewAbove",
      });
      return;
    }

    const id = uuidv4();

    const result = await query(
      `INSERT INTO policies
        (id, name, max_auto_amount, require_whitelist, require_manual_review_above, active, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING *`,
      [id, name, maxAutoAmount, requireWhitelist, requireManualReviewAbove]
    );

    res.status(201).json({ data: rowToPolicy(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;
