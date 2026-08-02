import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { executeTool } from "./ToolExecutor.js";
import {
  generateResponse,
  summariserPrompt,
  gmailPrompt,
  playWrightPrompt,
} from "./ModelInterface.js";
import {
  gmailToolDeclaration,
  commandToolDeclaration,
  planningToolDeclaration,
} from "./ToolDescriptions.js";

import { playwrightToolsDeclaration } from "./toolDefinitionsPlaywright.js";
import {
  getGmailConfig,
  getScratchPad,
  setScratchPad,
} from "./MongoDBInterface.js";

const EXIT = new Set(["/exit", "/quit", "exit", "quit"]);
function shouldExit(line) {
  return EXIT.has(line.trim().toLowerCase());
}

async function postChatUtility(chatHistory) {}

async function chatSession() {
  let msgHistory = [];
  let scratchPad = "";
  let scratchPadAge = 99999;
  const recentChatLen = -30;
  const rl = createInterface({ input, output });
  const [gmailToolDefinitions, gmailSystemPrompt] = await getGmailConfig(); // use mongodb gmail prompt later for now using application gmail prompt

  while (true) {
    //input
    let userQuery = await rl.question("You> ");
    userQuery = "User Query: " + userQuery;
    msgHistory.push(userQuery);

    if (shouldExit(userQuery)) break;
    console.log(msgHistory.toString());
    let conversation =
      "Scratch Pad Age: " +
      scratchPadAge.toString() +
      "\nScratch Pad Content: " +
      scratchPad +
      "\n" +
      msgHistory.slice(recentChatLen).toString();
    console.log(conversation);
    let modelResponse = await generateResponse(conversation, playWrightPrompt, [
      playwrightToolsDeclaration,
      planningToolDeclaration,
    ]);
    console.log(modelResponse.text);
    let count = 1; // temporary variable, for development
    output.write(`count is: ${count}`);
    while (modelResponse.functionCalls?.length > 0) {
      output.write(
        `\nLength in loop ${count} is: ${modelResponse.functionCalls?.length}`,
      );
      for (let i = 0; i < modelResponse.functionCalls.length; i++) {
        msgHistory.push("[Tool Call]: " + modelResponse.functionCalls[i].name);
        let toolResponse = await executeTool(modelResponse.functionCalls[i]);
        toolResponse = "[Tool Response]: " + toolResponse;
        output.write(`\n${toolResponse}\n`);
        msgHistory.push(toolResponse);
        if (modelResponse.functionCalls[i].name === "save_scratchpad")
          scratchPadAge = 0;
      }
      conversation =
        "Scratch Pad Age: " +
        scratchPadAge.toString() +
        "\nScratch Pad Content: " +
        scratchPad +
        "\n" +
        msgHistory.slice(recentChatLen).toString();
      output.write(`\n${conversation}`);
      modelResponse = await generateResponse(conversation, playWrightPrompt, [
        playwrightToolsDeclaration,
        planningToolDeclaration,
      ]);
      scratchPad = await getScratchPad();
      //output.write(`\nscratch pad: ${scratchPad}`);
      count++;
      scratchPadAge++;
    }
    output.write(`\nSummarising the data...\n`);
    msgHistory.push("\n[LLM Response]: " + modelResponse.text);
    let chatSummary = await generateResponse(
      msgHistory.slice(recentChatLen).toString(),
      summariserPrompt,
      [],
    );
    output.write(
      `\nfinal model output: ${JSON.stringify(modelResponse.text)}\n`,
    );
    //output.write(`\nchat summary: ${chatSummary.text}`);
    msgHistory = [chatSummary.text];
  }
  await postChatUtility(JSON.stringify(msgHistory));
  await setScratchPad("");
  rl.close();
}

export { chatSession };
