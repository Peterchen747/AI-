import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ["verbose"],
    sequence: { concurrent: false },
    // 整合測試共用同一個資料庫，平行跑會互相鎖住（SQLITE_BUSY）
    fileParallelism: false,
  },
});
