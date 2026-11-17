import "dotenv/config";
import { redis } from "../lib/redis.js";
import { supabase, BUCKET } from "../lib/supabase.js";

try {
  await redis.set("user:demo", JSON.stringify({ name: "demo" }), "EX", 60);
  console.log("Redis OK ->", await redis.get("user:demo"), "(stored as vs:user:demo)");
} catch (e) { console.error("Redis FAIL:", e.message); }

try {
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) throw bErr;
  if (!buckets.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw error;
    console.log(`Created bucket "${BUCKET}"`);
  }
  const path = `test/demo-${Date.now()}.txt`;
  const { error: uErr } = await supabase.storage.from(BUCKET).upload(path, Buffer.from("hello venture spark"), { contentType: "text/plain" });
  if (uErr) throw uErr;
  console.log("Supabase OK ->", supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  await supabase.storage.from(BUCKET).remove([path]);
} catch (e) { console.error("Supabase FAIL:", e.message); }

redis.disconnect();
