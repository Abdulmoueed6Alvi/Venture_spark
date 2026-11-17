import "dotenv/config";
import { supabase, BUCKET, VIDEO_BUCKET } from "../lib/supabase.js";

for (const [bucket, path, type] of [[BUCKET, "demo/venture-spark.svg", null], [VIDEO_BUCKET, `test/clip-${Date.now()}.mp4`, "video/mp4"]]) {
  try {
    if (type) {
      const { error } = await supabase.storage.from(bucket).upload(path, Buffer.alloc(2048), { contentType: type });
      if (error) throw error;
    }
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error) throw error;
    const res = await fetch(data.signedUrl);
    console.log(`${bucket}: ${type ? "upload OK, " : ""}signed URL fetch -> HTTP ${res.status}`);
    if (type) await supabase.storage.from(bucket).remove([path]);
  } catch (e) { console.log(`${bucket}: FAIL`, e.message); }
}
