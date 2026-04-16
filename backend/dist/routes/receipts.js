"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_1 = require("../db");
const router = (0, express_1.Router)();
function rowToReceipt(row) {
    return {
        id: row.id,
        requestId: row.request_id,
        receiptHash: row.receipt_hash,
        txHash: row.tx_hash,
        contractAddress: row.contract_address,
        blockNumber: row.block_number ? Number(row.block_number) : undefined,
        status: row.status,
        timestamp: row.created_at,
    };
}
// GET / — list all receipts
router.get("/", async (_req, res, next) => {
    try {
        const result = await (0, db_1.query)("SELECT * FROM receipts ORDER BY created_at DESC");
        res.json({ data: result.rows.map(rowToReceipt) });
    }
    catch (err) {
        next(err);
    }
});
// GET /by-request/:requestId — get receipt for a request
// NOTE: must be registered BEFORE /:id to avoid shadowing
router.get("/by-request/:requestId", async (req, res, next) => {
    try {
        const result = await (0, db_1.query)("SELECT * FROM receipts WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1", [req.params.requestId]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Receipt not found for this request" });
            return;
        }
        res.json({ data: rowToReceipt(result.rows[0]) });
    }
    catch (err) {
        next(err);
    }
});
// GET /:id — get one receipt
router.get("/:id", async (req, res, next) => {
    try {
        const result = await (0, db_1.query)("SELECT * FROM receipts WHERE id = $1", [
            req.params.id,
        ]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Receipt not found" });
            return;
        }
        res.json({ data: rowToReceipt(result.rows[0]) });
    }
    catch (err) {
        next(err);
    }
});
// POST / — create receipt
router.post("/", async (req, res, next) => {
    try {
        const { requestId, receiptHash, txHash, contractAddress, blockNumber, status, } = req.body;
        if (!requestId) {
            res.status(400).json({ error: "Missing required field: requestId" });
            return;
        }
        const id = (0, uuid_1.v4)();
        const result = await (0, db_1.query)(`INSERT INTO receipts
        (id, request_id, receipt_hash, tx_hash, contract_address, block_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [
            id,
            requestId,
            receiptHash || null,
            txHash || null,
            contractAddress || null,
            blockNumber || null,
            status || "pending",
        ]);
        res.status(201).json({ data: rowToReceipt(result.rows[0]) });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /:id — update status, txHash, blockNumber, failReason
router.patch("/:id", async (req, res, next) => {
    try {
        const { status, txHash, blockNumber, failReason } = req.body;
        const { id } = req.params;
        const fields = [];
        const values = [];
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
        const result = await (0, db_1.query)(`UPDATE receipts SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`, values);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Receipt not found" });
            return;
        }
        res.json({ data: rowToReceipt(result.rows[0]) });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=receipts.js.map