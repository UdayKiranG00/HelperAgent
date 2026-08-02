import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";

//Create embedding function.
const embedder = new DefaultEmbeddingFunction();
 
//Create chroma client with server ip address.
const client = new ChromaClient({
  host: "localhost", 
  port: 8082, 
  ssl: false 
});
//  path: "http://localhost:8082",
async function checkCollection(collectionName) {
  let collections = await client.listCollections();

  return collections.some((coll) => coll._name === collectionName);
}

async function createCollection(collectionName) {
  const collection = await client.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: embedder,
  });
  return collection;
}

async function addToCollection(fileData, collection) {
  let j = 0;
  while (true) {
    //Store index and docs in arrays from fileData.
    const idArr = [];
    const docArr = [];
    for (let i = j * 100; i < (j + 1) * 100; i++) {
      if (i == fileData.length) break;
      idArr.push(i.toString());
      docArr.push(fileData[i]);
    }
    //Add records to collection.
    await collection.add({
      ids: idArr,
      documents: docArr,
    });
    //console.log("converted " + idArr.length + " chunks.");
    if (idArr.length < 100) {
      break;
    }
    j++;
  }
}

async function getMyCollection(coll) {
  return await client.getCollection(coll);
}

async function deleteCollection(coll) {
  await client.deleteCollection(coll);
}
export {
  createCollection,
  checkCollection,
  addToCollection,
  getMyCollection,
  deleteCollection,
};
