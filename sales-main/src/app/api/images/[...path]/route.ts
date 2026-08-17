import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";

/**
 * 訂單圖片代理。
 *
 * Blob store 是私有的，圖片網址不能直接給瀏覽器開，
 * 所以走這支路由：先確認有登入，再從 Blob 把內容串流出去。
 * 資料庫裡存的 imageUrl 就是 /api/images/<pathname>。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { path } = await params;
  const pathname = (path ?? []).join("/");
  if (!pathname) {
    return NextResponse.json({ error: "缺少圖片路徑" }, { status: 400 });
  }

  try {
    const result = await get(pathname, { access: "private" });
    if (!result || !result.stream) {
      return NextResponse.json({ error: "找不到圖片" }, { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "application/octet-stream",
        // 私有內容，只讓瀏覽器自己快取，不要讓 CDN 或中介快取
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知錯誤";
    return NextResponse.json({ error: `讀取圖片失敗：${message}` }, { status: 500 });
  }
}
