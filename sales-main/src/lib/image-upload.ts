const MAX_EDGE = 1600; // 長邊最多 1600px
const JPEG_QUALITY = 0.8;

/**
 * 在瀏覽器端把圖片縮小、轉成 JPEG。
 * 手機直拍的照片動輒 5–8MB，Vercel 的 request body 上限只有 4.5MB，
 * 不壓縮的話會在平台層就被擋掉（而且錯誤訊息是英文的，看不出原因）。
 * 壓縮失敗時直接回傳原檔，讓後端的大小檢查去擋。
 */
export async function compressImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  // GIF 壓成 JPEG 會失去動畫，SVG 畫到 canvas 也不可靠，直接放行
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("圖片讀取失敗"));
      el.src = objectUrl;
    });

    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    // 已經夠小且不大於 1.5MB 就不用重壓
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * 壓縮後上傳到 /api/upload，回傳可直接顯示的圖片網址。
 * 失敗時丟出帶有中文訊息的 Error。
 */
export async function uploadImage(file: File): Promise<string> {
  const prepared = await compressImage(file);

  const fd = new FormData();
  fd.append("file", prepared);

  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body: fd });
  } catch {
    throw new Error("圖片上傳失敗：無法連線，請檢查網路");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `圖片上傳失敗（${res.status}）`);
  }

  const data = await res.json().catch(() => null);
  if (!data?.url) throw new Error("圖片上傳失敗：伺服器沒有回傳網址");
  return String(data.url);
}
