"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.neo4jDriver = exports.mongoClient = exports.pgPool = void 0;
exports.getMongoDb = getMongoDb;
exports.initDatabases = initDatabases;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const mongodb_1 = require("mongodb");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../../.env") });
exports.pgPool = new pg_1.Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || "kanan_db",
    user: process.env.POSTGRES_USER || "kanan",
    password: process.env.POSTGRES_PASSWORD || "kanan_local",
});
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/kanan_docs";
const mongoDbName = process.env.MONGO_DATABASE || "kanan_docs";
exports.mongoClient = new mongodb_1.MongoClient(mongoUri);
let mongoDbInstance = null;
function getMongoDb() {
    if (!mongoDbInstance) {
        throw new Error("MongoDB no inicializado");
    }
    return mongoDbInstance;
}
exports.neo4jDriver = neo4j_driver_1.default.driver(process.env.NEO4J_URI || "bolt://localhost:7687", neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER || "neo4j", process.env.NEO4J_PASSWORD || "kanan_local"));
async function initDatabases() {
    const pgClient = await exports.pgPool.connect();
    await pgClient.query("SELECT 1");
    pgClient.release();
    await exports.mongoClient.connect();
    mongoDbInstance = exports.mongoClient.db(mongoDbName);
    await mongoDbInstance.command({ ping: 1 });
    await exports.neo4jDriver.verifyConnectivity();
}
