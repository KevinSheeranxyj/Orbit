import { Pool, QueryResult } from "pg";
declare const pool: Pool;
export declare function query(text: string, params?: unknown[]): Promise<QueryResult>;
export default pool;
//# sourceMappingURL=db.d.ts.map