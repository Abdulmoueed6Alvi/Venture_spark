import { validationResult } from "express-validator";
import { redis } from "../lib/redis.js";
import { HttpError } from "../lib/httpError.js";

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new HttpError(400, details[0].message, details));
}

// Redis fixed-window rate limit per user. Fails open if Redis is down.
export const rateLimit = (name, max, windowSec) => async (req, _res, next) => {
  try {
    const key = `rl:${name}:${req.user?.uid || req.ip}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, windowSec);
    if (n > max) return next(new HttpError(429, `Too many requests. Try again in ${windowSec} seconds.`));
  } catch (e) {
    console.warn("rateLimit skipped:", e.message);
  }
  next();
};

export function errorHandler(err, _req, res, _next) {
  if (err.name === "MulterError") err = new HttpError(400, err.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller" : err.message);
  if (err.name === "CastError") err = new HttpError(404, "Not found");
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.status ? "Something went wrong" : err.message, details: err.details });
}
