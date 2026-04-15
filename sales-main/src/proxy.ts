import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Basic Auth 保護:只在有設定 BASIC_AUTH_USER / BASIC_AUTH_PASSWORD 時啟用。
// 本地開發若沒設環境變數,會直接放行。
export function proxy(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  if (!user || !pass) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const [u, p] = decoded.split(":");
    if (u === user && p === pass) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="sales-tracker"' },
  });
}

export const config = {
  // 套用到所有路徑,排除 Next 內部資源與 favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
