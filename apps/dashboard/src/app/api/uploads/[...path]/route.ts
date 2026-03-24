import { readFile } from "node:fs/promises";
import { resolve, basename, extname } from "node:path";
import { NextResponse, type NextRequest } from "next/server";

const UPLOAD_DIR = resolve(process.env.UPLOADS_DIR || "/app/uploads");

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  // Expect exactly workspace-slug/filename
  if (path.length !== 2) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [workspace, file] = path;

  // Only allow alphanumeric, hyphens, underscores in workspace slug
  if (!/^[a-z0-9_-]+$/i.test(workspace)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Strip anything but the base filename
  const safeFile = basename(file);
  const ext = extname(safeFile).toLowerCase();

  // Only serve known image types
  if (!MIME_TYPES[ext]) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Resolve and verify the path stays within UPLOAD_DIR
  const filePath = resolve(UPLOAD_DIR, workspace, safeFile);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const data = await readFile(filePath);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME_TYPES[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
