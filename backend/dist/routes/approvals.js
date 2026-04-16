"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const router = (0, express_1.Router)();
function rowToApproval(row) {
    return {
        id: row.id,
        requestId: row.request_id,
        reviewerAddress: row.reviewer_address,
        decision: row.decision,
        reason: row.reason,
        createdAt: row.created_at,
    };
}
// GET / — list all approvals, optionally filtered by ?requestId=
router.get("/", async (req, res, next) => {
    try {
        const { requestId } = req.query;
        let sql = "SELECT * FROM approvals";
        const params = [];
        if (requestId) {
            sql += " WHERE request_id = $1";
            params.push(requestId);
        }
        sql += " ORDER BY created_at DESC";
        const result = await (0, db_1.query)(sql, params);
        res.json({ data: result.rows.map(rowToApproval) });
    }
    catch (err) {
        next(err);
    }
});
// POST / — record approval/rejection and update request status
router.post("/", async (req, res, next) => {
    try {
        const { requestId, reviewerAddress, decision, reason } = req.body;
        if (!requestId || !reviewerAddress || !decision) {
            res.status(400).json({
                error: "Missing required fields: requestId, reviewerAddress, decision",
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
        const requestCheck = await (0, db_1.query)("SELECT id FROM requests WHERE id = $1", [requestId]);
        if (requestCheck.rows.length === 0) {
            res.status(404).json({ error: "Request not found" });
            return;
        }
        const id = (0, uuid_1.v4)();
        // Insert approval record
        const result = await (0, db_1.query)(`INSERT INTO approvals (id, request_id, reviewer_address, decision, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [id, requestId, reviewerAddress, decision, reason || null]);
        // Update the corresponding request status
        await (0, db_1.query)(`UPDATE requests SET status = $1, updated_at = NOW() WHERE id = $2`, [decision, requestId]);
        res.status(201).json({ data: rowToApproval(result.rows[0]) });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=approvals.js.map