import { Hono } from "hono";
import type { Env } from "../types";
import { newId, slugify } from "../lib/id";
import { fail, ok } from "../lib/response";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function publicUrl(c: { env: Env }, key: string): string {
  const base = (c.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/images/${key}`;
}

/* ----------------------------- public routes ----------------------------- */
export const publicImages = new Hono<{ Bindings: Env }>();

// GET /images/<key...> — streams an object straight from R2 (public, cached).
publicImages.get("/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/images\//, ""));
  if (!key) return fail(c, "Missing image key.", 400);

  const object = await c.env.MEDIA.get(key);
  if (!object) return fail(c, "Image not found.", 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/octet-stream");
  return new Response(object.body, { headers });
});

/* ------------------------------ admin routes ------------------------------ */
export const adminImages = new Hono<{ Bindings: Env }>();

// POST /admin/images — multipart upload (field "file"); returns { key, url }.
adminImages.post("/", async (c) => {
  const contentType = c.req.header("Content-Type") || "";

  let data: ArrayBuffer;
  let mime: string;
  let originalName = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || typeof (file as Blob).arrayBuffer !== "function") {
      return fail(c, "Expected a `file` field.", 400);
    }
    mime = (file as File).type || "application/octet-stream";
    originalName = (file as File).name || "";
    data = await (file as Blob).arrayBuffer();
  } else {
    // Raw body upload: Content-Type is the image type.
    mime = contentType || "application/octet-stream";
    data = await c.req.arrayBuffer();
  }

  if (!ALLOWED.has(mime)) {
    return fail(c, `Unsupported image type: ${mime}.`, 415);
  }
  if (data.byteLength === 0) return fail(c, "Empty upload.", 400);
  if (data.byteLength > MAX_BYTES) return fail(c, "Image exceeds 10 MB limit.", 413);

  const ext = EXT[mime] ?? "bin";
  const base = slugify(originalName.replace(/\.[^.]+$/, "")) || "image";
  const key = `products/${base}-${newId("i").slice(2, 12)}.${ext}`;

  await c.env.MEDIA.put(key, data, {
    httpMetadata: { contentType: mime, cacheControl: "public, max-age=31536000, immutable" },
  });

  return ok(c, { key, url: publicUrl(c, key) }, 201);
});

// DELETE /admin/images/<key...>
adminImages.delete("/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/admin\/images\//, ""));
  if (!key) return fail(c, "Missing image key.", 400);
  await c.env.MEDIA.delete(key);
  return ok(c, { key, deleted: true });
});
