import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// 本地檔案資料庫,跟著專案目錄走
const client = createClient({ url: "file:./sales-tracker.db" });

export const db = drizzle(client, { schema });
export { client };
export { schema };
