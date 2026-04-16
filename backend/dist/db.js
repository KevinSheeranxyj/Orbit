"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432", 10),
        database: process.env.DB_NAME || "orbit",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "password",
    });
pool.on("error", (err) => {
    console.error("Unexpected PostgreSQL pool error", err);
});
async function query(text, params) {
    return pool.query(text, params);
}
exports.default = pool;
//# sourceMappingURL=db.js.map