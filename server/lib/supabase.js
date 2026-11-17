import { createClient } from "@supabase/supabase-js";

// Service-role key: server only, never expose to the client.
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
export const BUCKET = process.env.SUPABASE_BUCKET || "media";
export const VIDEO_BUCKET = process.env.SUPABASE_VIDEO_BUCKET || "video";
