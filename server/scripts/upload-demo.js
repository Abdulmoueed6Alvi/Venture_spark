import "dotenv/config";
import { supabase, BUCKET } from "../lib/supabase.js";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#6d28d9"/><text x="200" y="110" font-size="36" fill="#fff" text-anchor="middle" font-family="Arial">Venture Spark</text></svg>`;
const path = "demo/venture-spark.svg";
const { error } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(svg), { contentType: "image/svg+xml", upsert: true });
if (error) throw error;
console.log(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
