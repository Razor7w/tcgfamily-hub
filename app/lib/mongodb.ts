/**
 * Conexión MongoDB/Mongoose para Next.js en Vercel (y local).
 *
 * Cada **deploy** genera procesos nuevos: no hay conexión “heredada” entre versiones.
 * Dentro de una misma instancia (función caliente), `global.mongoose` evita abrir
 * múltiples sockets en requests seguidos y deduplica llamadas concurrentes a `connect`.
 *
 * @see https://mongoosejs.com/docs/lambda.html
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB_NAME || "tcgfamily-hub";

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

/** Por instancia serverless conviene un pool acotado; Atlas tiene límite global de conexiones. */
function maxPoolSizeFromEnv(): number {
  const raw = process.env.MONGODB_MAX_POOL_SIZE?.trim();
  if (!raw) return 10;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 10;
  return Math.min(100, n);
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: DB_NAME,
      maxPoolSize: maxPoolSizeFromEnv(),
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        return mongoose;
      })
      .catch((error) => {
        console.error("❌ Error al conectar:", error);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
