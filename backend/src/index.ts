import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

import requestsRouter from "./routes/requests";
import policiesRouter from "./routes/policies";
import receiptsRouter from "./routes/receipts";
import approvalsRouter from "./routes/approvals";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS — allow localhost:3000 explicitly and all origins in dev
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = ["http://localhost:3000", "http://localhost:3001"];
      if (!origin || allowed.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/requests", requestsRouter);
app.use("/api/policies", policiesRouter);
app.use("/api/receipts", receiptsRouter);
app.use("/api/approvals", approvalsRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = (err as { status?: number }).status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Orbit backend running on http://localhost:${PORT}`);
});

export default app;
