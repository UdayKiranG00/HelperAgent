import { MongoClient, ServerApiVersion } from 'mongodb';
import dns from "node:dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const options = {serverApi: {
                     version: ServerApiVersion.v1,
                     strict: true,
                     deprecationErrors: true,
                   }};

const userName = process.env.MONGODB_USERNAME;
const password = process.env.MONGODB_PASSWORD;
//const uri = `mongodb+srv://${userName}:${password}@cluster0.fzx6hvu.mongodb.net/?appName=Cluster0`
const uri = `mongodb://${userName}:${password}@ac-egx25yc-shard-00-00.fzx6hvu.mongodb.net:27017,ac-egx25yc-shard-00-01.fzx6hvu.mongodb.net:27017,ac-egx25yc-shard-00-02.fzx6hvu.mongodb.net:27017/?ssl=true&replicaSet=atlas-dw2xzy-shard-0&authSource=admin&appName=Cluster0`
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'DEV') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri!, options);
  clientPromise = client.connect();
}

export default clientPromise;
