import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { auth } from "@/auth";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * 找出 Vercel Blob 的讀寫 token。
 * 預設叫 BLOB_READ_WRITE_TOKEN，但如果 Blob store 取了自訂名稱，
 * Vercel 會改注入 <STORE_NAME>_READ_WRITE_TOKEN，所以要一起找。
 */
function findBlobToken(): string | undefined {
  const direct = process.env.BLOB_READ_WRITE_TOKEN;
  if (direct) return direct;

  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_READ_WRITE_TOKEN") && value?.startsWith("vercel_blob_rw_")) {
      return value;
    }
  }
  return undefined;
}

/** 部署在 Vercel 上（檔案系統唯讀，一定要用 Blob） */
const ON_VERCEL = process.env.VERCEL === "1";

/** 健康檢查：讓使用者可以直接開 /api/upload 確認 Blob 設好了沒 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const token = findBlobToken();
  return NextResponse.json({
    onVercel: ON_VERCEL,
    blobConfigured: Boolean(token),
    storage: token ? "vercel-blob" : ON_VERCEL ? "無法儲存" : "本機檔案",
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "無效的表單" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少 file 欄位" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "只接受圖片檔" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "圖片不能超過 5MB" }, { status: 400 });
  }

  const ext =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const token = findBlobToken();

  // 線上沒有 Blob token 就直接講清楚，不要退回去寫檔案
  // （Vercel 檔案系統唯讀，寫檔只會得到看不懂的 ENOENT / EROFS）
  if (!token && ON_VERCEL) {
    return NextResponse.json(
      {
        error:
          "圖片上傳失敗：這個部署沒有讀到 Vercel Blob 的權杖。請到 Vercel → Storage 建立 Blob store 並 Connect 到本專案，然後重新部署一次（環境變數只會套用到新的部署）。",
      },
      { status: 500 }
    );
  }

  try {
    if (token) {
      const blob = await put(`sales/${filename}`, file, {
        access: "public",
        contentType: file.type,
        token,
      });
      return NextResponse.json({ url: blob.url });
    }

    // 本機開發：沒設定 Blob token 時，寫進 public/uploads/sales/
    const dir = path.join(process.cwd(), "public", "uploads", "sales");
    await mkdir(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buf);
    return NextResponse.json({ url: `/uploads/sales/${filename}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知錯誤";
    return NextResponse.json({ error: `圖片上傳失敗：${message}` }, { status: 500 });
  }
}
