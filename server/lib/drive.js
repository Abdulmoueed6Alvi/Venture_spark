// Google Drive sync using the signed-in user's OAuth access token (scope: drive.file).
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_NAME = "Venture Spark Posts";

export class DriveAuthError extends Error {}

async function driveFetch(token, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers || {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 401 || res.status === 403) {
    const body = await res.json().catch(() => ({}));
    const reason = body.error?.errors?.[0]?.reason || body.error?.status || "";
    if (res.status === 401 || /auth|insufficient|scope/i.test(reason)) throw new DriveAuthError("Google Drive access expired");
    throw new Error(body.error?.message || `Drive ${res.status}`);
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `Drive error ${res.status}`);
  }
  return res.status === 204 ? {} : res.json();
}

export async function ensureFolder(token, knownId) {
  if (knownId) {
    const f = await driveFetch(token, `${API}/files/${knownId}?fields=id,trashed`);
    if (f && !f.trashed) return f.id;
  }
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const found = await driveFetch(token, `${API}/files?q=${q}&fields=files(id)`);
  if (found?.files?.length) return found.files[0].id;
  const created = await driveFetch(token, `${API}/files?fields=id`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  return created.id;
}

function multipart(metadata, content) {
  const boundary = "vsboundary" + Date.now();
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
  return { body, type: `multipart/related; boundary=${boundary}` };
}

// Create or update the JSON file that represents a post. Returns the Drive file id.
export async function upsertPostFile(token, folderId, post, existingFileId) {
  const content = JSON.stringify(
    {
      id: String(post._id),
      caption: post.caption,
      hashtags: post.hashtags,
      status: post.status,
      scheduledAt: post.scheduledAt,
      platform: post.platform,
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  );
  const name = `post-${post._id}.json`;

  if (existingFileId) {
    const { body, type } = multipart({ name }, content);
    const updated = await driveFetch(token, `${UPLOAD}/files/${existingFileId}?uploadType=multipart&fields=id`, {
      method: "PATCH",
      headers: { "content-type": type },
      body,
    });
    if (updated) return updated.id; // else file was deleted in Drive, fall through and recreate
  }
  const { body, type } = multipart({ name, parents: [folderId], mimeType: "application/json" }, content);
  const created = await driveFetch(token, `${UPLOAD}/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { "content-type": type },
    body,
  });
  return created.id;
}

export async function deleteFile(token, fileId) {
  await driveFetch(token, `${API}/files/${fileId}`, { method: "DELETE" });
}
