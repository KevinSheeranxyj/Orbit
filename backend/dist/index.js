"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const requests_1 = __importDefault(require("./routes/requests"));
const policies_1 = __importDefault(require("./routes/policies"));
const receipts_1 = __importDefault(require("./routes/receipts"));
const approvals_1 = __importDefault(require("./routes/approvals"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// CORS — allow localhost:3000 explicitly and all origins in dev
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowed = ["http://localhost:3000", "http://localhost:3001"];
        if (!origin || allowed.includes(origin) || process.env.NODE_ENV !== "production") {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
// Body parser
app.use(express_1.default.json());
// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Routes
app.use("/api/requests", requests_1.default);
app.use("/api/policies", policies_1.default);
app.use("/api/receipts", receipts_1.default);
app.use("/api/approvals", approvals_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});
// Global error handler
app.use((err, _req, res, _next) => {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || "Internal server error" });
});
app.listen(PORT, () => {
    console.log(`Orbit backend running on http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map