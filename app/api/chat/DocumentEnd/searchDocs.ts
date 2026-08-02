import fs from "fs/promises";
import {
  createCollection,
  checkCollection,
  addToCollection,
  getMyCollection,
  deleteCollection,
} from "./chroma-fn.js";
import { generateText } from "./model-connector.js";
import { nonOcrToPdf, extractOcrPdf } from "./pdf2text.js";
import { chunkMyDocument } from "./semantic-chunking.js";
import path from "path";

export async function main() {
  const args = process.argv.slice(2);
  const userInput = args[0];

  //"E:/Projects/Input-Pdfs/CompetitionRulebookPUBGM.pdf";
  let pdfFilePath = args[0];
  let baseName = path.basename(pdfFilePath, ".pdf");
  let textFilePath = "E:/SearchDocs/Text-Files/" + baseName + ".txt";

  const collectionName = baseName + "_collection";
  //if collection is not existed create it.
  const isExist = await checkCollection(collectionName).catch((error) =>
    console.log(error),
  );
  //console.log(isExist);
  let collection;
  if (isExist) {
    collection = await getMyCollection({ name: collectionName });
  } else {
    //Step1: pdf to text for ocr, non ocr
    const isOcr = await extractOcrPdf(pdfFilePath, textFilePath).catch(
      console.error,
    );
    //console.log("is ocr: "+isOcr);
    if (!isOcr) {
      await nonOcrToPdf(pdfFilePath, textFilePath).catch(console.error);
    }

    //step2: fn to read text
    let fileData;
    async function readFile(filePath) {
      try {
        const content = await fs.readFile(filePath, "utf8");
        const modifiedFileData = content.replace(/\r?\n/g, "");
        //await fs.writeFile("./sample.txt", modifiedFileData, "utf-8");
        fileData = await chunkMyDocument(modifiedFileData, 0.6).catch((err) =>
          console.log(err),
        );
      } catch (error) {
        console.error(`Error reading file: ${error.message}`);
      }
    }
    // read text to store in vector db
    await readFile(textFilePath);
    //Create a collection to store the records or chunks.
    collection = await createCollection(collectionName);
    //store data in collection
    await addToCollection(fileData, collection);
  } 
  const userQuery = args[1];
  //input query-> search vector db.
  const results = await collection.query({
    queryTexts: [userQuery],
    nResults: 60,
  });
  //console.log(results.documents);
  console.log("User Query: ",userQuery);
  results.documents.forEach((doc) => {
    let response = generateText(doc, userQuery);
    //console.log(doc+"next   "+response);
  });
}

main().catch(console.error);
/*
import { ChromaClient } from "chromadb";
//Create chroma client with server ip address.
const client = new ChromaClient({
  path: "http://localhost:8082",
});
async function deleteCollections() {
  let collections = await client.listCollections();
  collections.forEach((coll)=>{console.log(coll._name);deleteCollection({name:coll._name});});
  //return collections.some((coll) => coll._name === collectionName);
}

deleteCollections();*/
//deleteCollection({name:"HRGuide_Policy_collection"});
