import crypto from "node:crypto";
import { z } from "zod";

import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// PNG, JPEG, GIF, WEBP, ICO magic bytes
const SIGNATURES: [string, number[]][] = [
  [".png", [0x89, 0x50, 0x4e, 0x47]],
  [".jpg", [0xff, 0xd8, 0xff]],
  [".gif", [0x47, 0x49, 0x46]],
  [".webp", [0x52, 0x49, 0x46, 0x46]], // RIFF header
  [".ico", [0x00, 0x00, 0x01, 0x00]],
];

function detectExtension(buffer: Buffer): string | null {
  for (const [ext, sig] of SIGNATURES) {
    if (sig.every((byte, i) => buffer[i] === byte)) return ext;
  }
  return null;
}

export const blobRouter = createTRPCRouter({
  upload: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        file: z.string().min(1),
      }),
    )
    .mutation(async (opts) => {
      const { filename, file } = opts.input;

      const base64 = file.includes("base64,")
        ? file.split("base64,").pop()
        : file;

      if (!base64) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid file",
        });
      }

      const buffer = Buffer.from(base64, "base64");

      if (buffer.length > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File exceeds 10 MB limit",
        });
      }

      // Validate extension from the original filename
      const path = await import("node:path");
      const ext = path.extname(filename).toLowerCase();

      if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `File type ${ext || "(none)"} is not allowed`,
        });
      }

      // Verify magic bytes match the claimed extension
      const detected = detectExtension(buffer);
      if (!detected) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File content does not match a supported image format",
        });
      }

      // Use Vercel Blob if token is available, otherwise use local filesystem
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = await import("@vercel/blob");
        const blob = await put(
          `${opts.ctx.workspace.slug}/${filename}`,
          buffer,
          { access: "public" },
        );
        return blob;
      }

      // Local filesystem storage for self-hosted setups
      const fs = await import("node:fs/promises");

      const uploadDir = process.env.UPLOADS_DIR || "/app/uploads";
      const workspaceDir = path.join(uploadDir, opts.ctx.workspace.slug);
      await fs.mkdir(workspaceDir, { recursive: true });

      // Content-hash the file to produce a unique, collision-free name
      const hash = crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex")
        .slice(0, 16);
      const safeName = `${hash}${ext}`;

      const filePath = path.join(workspaceDir, safeName);
      await fs.writeFile(filePath, buffer, { flag: "wx" }).catch(async (err) => {
        // wx fails if file exists — that's fine, same content = same hash
        if (err.code !== "EEXIST") throw err;
      });

      const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
      const url = `${baseUrl}/api/uploads/${opts.ctx.workspace.slug}/${safeName}`;

      return { url, pathname: `${opts.ctx.workspace.slug}/${safeName}` };
    }),
});
