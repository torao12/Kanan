import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";
import { MongoClient, Db } from "mongodb";
import neo4j, { Driver } from "neo4j-driver";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || "kanan_db",
  user: process.env.POSTGRES_USER || "kanan",
  password: process.env.POSTGRES_PASSWORD || "kanan_local",
});

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/kanan_docs";
const mongoDbName = process.env.MONGO_DATABASE || "kanan_docs";
export const mongoClient = new MongoClient(mongoUri);
let mongoDbInstance: Db | null = null;

export function getMongoDb(): Db {
  if (!mongoDbInstance) {
    throw new Error("MongoDB no inicializado");
  }
  return mongoDbInstance;
}

export const neo4jDriver: Driver = neo4j.driver(
  process.env.NEO4J_URI || "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER || "neo4j",
    process.env.NEO4J_PASSWORD || "kanan_local"
  )
);

export async function initDatabases(): Promise<void> {
  const pgClient = await pgPool.connect();
  await pgClient.query("SELECT 1");
  pgClient.release();

  await mongoClient.connect();
  mongoDbInstance = mongoClient.db(mongoDbName);
  await mongoDbInstance.command({ ping: 1 });

  await neo4jDriver.verifyConnectivity();
}
