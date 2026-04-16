"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const router = (0, express_1.Router)();
function rowToRequest(row) {
    return {
        id: row.id,
        actionType: row.action_type,
        amount: Number(row.amount),
        token: row.token,
        recipient: row.recipient,
        createdBy: row.created_by,
        createdAt: row.created_at,
        memo: row.memo,
        status: row.status,
        riskLevel: row.risk_level,
        recommendation: row.recommendation,
        confidence: row.confidence ? Number(row.confidence) : undefined,
        policyId: row.policy_id,
    };
}
function assessRisk(amount) {
    if (amount > 1000) {
        return {
            riskLevel: "high",
            recommendation: "review",
            confidence: 0.9,
            status: "review_required",
        };
    }
    else if (amount > 100) {
        return {
            riskLevel: "medium",
            recommendation: "review",
            confidence: 0.75,
            status: "review_required",
        };
    }
    else {
        return {
            riskLevel: "low",
            recommendation: "approve",
            confidence: 0.95,
            status: "approved",
        };
    }
}
// GET / — list all requests, newest first
router.get("/", async (_req, res, next) => {
    try {
        const result = await (0, db_1.query)("SELECT * FROM requests ORDER BY created_at DESC");
        res.json({ data: result.rows.map(rowToRequest) });
    }
    catch (err) {
        next(err);
    }
});
// GET /:id — get one request
router.get("/:id", async (req, res, next) => {
    try {
        const result = await (0, db_1.query)("SELECT * FROM requests WHERE id = $1", [
            req.params.id,
        ]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Request not found" });
            return;
        }
        res.json({ data: rowToRequest(result.rows[0]) });
    }
    catch (err) {
        next(err);
    }
});
// POST / — create request
router.post("/", async (req, res, next) => {
    try {
        const { actionType, amount, token, recipient, createdBy, memo, policyId, onChainRequestId, txHash, } = req.body;
        if (!actionType || amount === undefined || !token || !recipient || !createdBy) {
            res.status(400).json({
                error: "Missing required fields: actionType, amount, token, recipient, createdBy",
            });
            return;
        }
        const id = (0, uuid_1.v4)();
        const { riskLevel, recommendation, confidence, status } = assessRisk(Number(amount));
        const result = await (0, db_1.query)(`INSERT INTO requests
        (id, action_type, amount, token, recipient, created_by, memo,
         status, risk_level, recommendation, confidence,
         policy_id, on_chain_request_id, tx_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`, [
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
        ]);
        res.status(201).json({ data: rowToRequest(result.rows[0]) });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /:id — update status/txHash/onChainRequestId
router.patch("/:id", async (req, res, next) => {
    try {
        const { status, txHash, onChainRequestId } = req.body;
        const { id } = req.params;
        const fields = [];
        const values = [];
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
        const result = await (0, db_1.query)(`UPDATE requests SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`, values);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Request not found" });
            return;
        }
        res.json({ data: rowToRequest(result.rows[0]) });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=requests.js.map