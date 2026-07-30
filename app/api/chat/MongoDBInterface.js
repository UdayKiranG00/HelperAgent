import { MongoClient, ServerApiVersion } from "mongodb";
import mongoClientPromise from "@/lib/mongodb.ts"

async function getGmailConfig() {
  try {
    let client = await mongoClientPromise
    let pa = client.db("pa");
    let gmailToolsDeclaration = await (
      await pa.collection("tools_coll").find(
        {
          $or: [
            { name: "gmailToolDeclaration" },
            { name: "commandToolDeclaration" },
            { name: "planningToolDeclaration" },
          ],
        },
        { projection: { _id: 0, functionDeclarations: 1 } },
      )
    ).toArray();
    let gmailSystemPrompt = (
      await pa
        .collection("prompts_coll")
        .findOne(
          { title: "gmailManager" },
          { projection: { _id: 0, prompt: 1 } },
        )
    ).prompt;
    return [gmailToolsDeclaration, gmailSystemPrompt];
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function getScratchPad() {
  try {
    let client = await mongoClientPromise
    let pa = client.db("pa");
    let scratchPadContent = (await pa.collection("general_coll").findOne())
      .content;
    //console.log(scratchPadContent);
    return scratchPadContent;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function setScratchPad(approach) {
  try {
    let client = await mongoClientPromise
    let pa = client.db("pa");
    await pa
      .collection("general_coll")
      .updateOne({}, { $set: { content: approach } });
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function getToolsDefinition(toolNames) {
  const toolDefinitions = [];
  try {
    let client = await mongoClientPromise
    let pa = client.db("pa");
    for (let toolName of toolNames) {
      try {
        let response = await pa
          .collection("tools_coll")
          .findOne({ "functionDeclarations.name": toolName });
        response = response.functionDeclarations.filter(
          (obj) => obj.name === toolName,
        )[0];
        let formattedResponse = {
          type: "function",
          function: response,
        };
        toolDefinitions.push(formattedResponse);
      } catch (error) {
        console.log("error getting tool: ", toolName);
        continue;
      }
    }
    //toolDefinitions = toolDefinitions.join(',');
    return toolDefinitions;
  } catch (error) {
    console.log(error);
  }
}

/*let tool = await getToolsDefinition(["send_mails", "save_category"]);
console.log(tool);
await closeMongoDBConnection();*/
export {
  getGmailConfig,
  setScratchPad,
  getScratchPad,
  getDBConnection,
  closeMongoDBConnection,
  getToolsDefinition,
};
