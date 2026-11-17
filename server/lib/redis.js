import Redis from "ioredis";

// Every key is auto-prefixed with "vs:" (e.g. vs:user:ali) so Venture Spark keys stay separate.
export const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  keyPrefix: "vs:",
  maxRetriesPerRequest: 2,
});
