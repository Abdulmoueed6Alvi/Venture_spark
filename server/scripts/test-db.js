import "dotenv/config";
import mongoose from "mongoose";
import { redis } from "../lib/redis.js";
try { await redis.set("user:demo", JSON.stringify({ name: "demo" }), "EX", 60); console.log("Redis OK", await redis.get("user:demo")); } catch (e) { console.log("Redis FAIL", e.message); }
redis.disconnect();
try { await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 }); console.log("Mongo OK"); await mongoose.disconnect(); } catch (e) { console.log("Mongo FAIL", e.message); }
