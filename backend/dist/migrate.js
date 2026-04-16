"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
async function migrate() {
    const schemaPath = path_1.default.join(__dirname, "schema.sql");
    const sql = fs_1.default.readFileSync(schemaPath, "utf-8");
    console.log("Running migrations against the database...");
    try {
        await (0, db_1.query)(sql);
        console.log("Migrations completed successfully.");
    }
    catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
    process.exit(0);
}
migrate();
//# sourceMappingURL=migrate.js.map