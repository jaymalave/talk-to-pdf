// db-utils.ts
import { MongoClient, ObjectId } from "mongodb";

/**
 * In a real project, you'll want to store your MongoDB connection info
 * in environment variables, e.g. process.env.MONGODB_URI and process.env.MONGODB_DB
 */
const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB = process.env.MONGODB_DB || "playAI";

// Cache the connection to avoid multiple connections in dev
let cachedClient: MongoClient | null = null;

export interface Agent {
  _id?: ObjectId;
  name: string;
  description: string;
  voice: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Returns a connected MongoClient instance.
 */
async function getClient(): Promise<MongoClient> {
  if (!cachedClient) {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    cachedClient = client;
  }
  return cachedClient;
}

/**
 * Returns the "agents" collection from MongoDB.
 */
async function getAgentsCollection() {
  const client = await getClient();
  const db = client.db(MONGODB_DB);
  return db.collection<Agent>("agents");
}

/**
 * Fetch all agents from MongoDB
 */
export async function getAgents(): Promise<Agent[]> {
  const collection = await getAgentsCollection();
  return collection.find({}).sort({ createdAt: -1 }).toArray();
}

/**
 * Fetch a single agent by its string ID.
 */
export async function getAgentById(agentId: string): Promise<Agent | null> {
  const collection = await getAgentsCollection();
  return collection.findOne({ _id: new ObjectId(agentId) });
}

/**
 * Create a new agent document in MongoDB.
 */
export async function createAgent(
  name: string,
  description: string,
  voice: string
): Promise<Agent> {
  const collection = await getAgentsCollection();
  const now = new Date();
  const newAgent: Omit<Agent, "_id"> = {
    name,
    description,
    voice,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(newAgent);
  return {
    _id: result.insertedId,
    ...newAgent,
  };
}
