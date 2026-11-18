import { supabase, BUCKET } from "./supabase.js";
import { HttpError } from "./httpError.js";

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function uploadImage(uid, file) {
  const ext = EXT[file.mimetype];
  if (!ext) throw new HttpError(400, "Only JPG, PNG, WEBP or GIF images are allowed");
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file.buffer, { contentType: file.mimetype });
  if (error) throw new HttpError(502, "Image upload failed: " + error.message);
  return path;
}

export async function signedImageUrl(path, seconds = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  return error ? null : data.signedUrl;
}

export async function removeImage(path) {
  if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}
