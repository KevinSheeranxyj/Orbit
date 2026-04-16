import { Pool, QueryResult } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432", 10),
        database: process.env.DB_NAME || "orbit",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "password",
      }
);

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error", err);
});

export async function query(
  text: string,
  params?: unknown[]
): Promise<QueryResult> {
  return pool.query(text, params);
}

export default pool;
