"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const router = (0, express_1.Router)();
function rowToPolicy(row) {
    return {
        id: row.id,
        name: row.name,
        maxAutoAmount: Number(row.max_auto_amount),
        requireWhitelist: row.require_whitelist,
        requireManualReviewAbove: Number(row.require_manual_review_above),
        active: row.active,
        updatedAt: row.updated_at,
    };
}
// GET / — list all active policies
router.get("/", async (_req, res, next) => {
    try {
        const result = await (0, db_1.query)("SELECT * FROM policies WHERE active = true ORDER BY created_at DESC");
        res.json({ data: result.rows.map(rowToPolicy) });
    }
    catch (err) {
        next(err);
    }
});
// GET /:id — get one policy
router.get("/:id", async (req, res, next) => {
    try {
        const result = await (0, db_1.query)("SELECT * FROM policies WHERE id = $1", [
            req.params.id,
        ]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Policy not found" });
            return;
        }
        res.json({ data: rowToPolicy(result.rows[0]) });
    }
    catch (err) {
        next(err);
    }
});
// POST / — create policy
router.post("/", async (req, res, next) => {
    try {
        const { name, maxAutoAmount, requireWhitelist, requireManualReviewAbove } = req.body;
        if (!name ||
            maxAutoAmount === undefined ||
            requireWhitelist === undefined ||
            requireManualReviewAbove === undefined) {
            res.status(400).json({
                error: "Missing required fields: name, maxAutoAmount, requireWhitelist, requireManualReviewAbove",
            });
            return;
        }
        const id = (0, uuid_1.v4)();
        const result = await (0, db_1.query)(`INSERT INTO policies
        (id, name, max_auto_amount, require_whitelist, require_manual_review_above, active, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       RETURNING *`, [id, name, maxAutoAmount, requireWhitelist, requireManualReviewAbove]);
        res.status(201).json({ data: rowToPolicy(result.rows[0]) });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=policies.js.map