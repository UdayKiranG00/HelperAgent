import { stdin as input, stdout as output } from "node:process";
import { executeTool } from "./ToolExecutor.js";
import { generateResponse, summariserPrompt } from "./ModelInterface.js";
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
  getToolsDefinition,
} from "./MongoDBInterface.js";

const executorPrompt = `you are an expert in task execution, you get a task and required tools to accomplish the task.
You will also get complete history of previous tasks, tools called and tool responses where you can refer for details.
Perform the current task. when tool responses have errors try alternative way, hit a wall? consider task as failed.

##ScratchPad(tool: save_scratchpad, it gets overwrite)
Use scratchpad to write your thoughts/approach/notes to carry out the current task, update it first and mind your actions align with it.

##Output Instructions:
1. when task accomplishes, output with every single detail.
2. when task fails, call tool failed_task and output "Unable to finish the task." with reasons.

##Order of input
1. Previous Task descriptions/responses, tool calls/responses.
2. Scratch pad.
3. Current Task to execute with it's tool call/responses.
`;
let msgHistory = [];
async function executeTask(taskItem) {
  const recentChatLen = -30;
  let scratchPad = "";
  let toolNames = taskItem.getTools;
  toolNames.push("task_failed");
  //toolNames.push("save_scratchpad");
  const taskTools = await getToolsDefinition(toolNames);
  console.log(taskTools);
  let prevMsgHistory = msgHistory;
  let currMsgHistory = [];
  //input
  let taskMessage = {
    content: taskItem.getName,
    role: "user",
  };
  //console.log(JSON.stringify(prevMsgHistory));
  currMsgHistory.push(taskMessage);
  let conversation = prevMsgHistory.concat(currMsgHistory);

  console.log("conversation: ", JSON.stringify(conversation));

  let modelResponse = await generateResponse(conversation, executorPrompt,taskTools);
  console.log(JSON.stringify(modelResponse.choices[0].message));
  let count = 1;
  output.write(`count is: ${count}`);
  let seqToolName = "";
  let seqToolCount = 0;
  let responseMessage = modelResponse.choices[0].message;
  while (responseMessage.toolCalls?.length > 0) {
    currMsgHistory.push(responseMessage);
    output.write(
      `\ntask of id ${taskItem.getId} Length in loop ${count} is: ${responseMessage.toolCalls?.length}`,
    );
    let fnCallArr = responseMessage.toolCalls;
    for (let i = 0; i < fnCallArr.length; i++) {
      let toolResponse = await executeTool(fnCallArr[i].function);
      if (seqToolCount == 1 && seqToolName === fnCallArr[i].function.name) {
        toolResponse = seqToolName + " is failed, do not call me again.\n";
      }
      toolResponse = {
        name: fnCallArr[i].name,
        content: `${toolResponse}`,
        toolCallId: fnCallArr[i].id,
        role: "tool",
      };
      output.write(`\n${JSON.stringify(toolResponse)}\n`);
      currMsgHistory.push(toolResponse);
      if (seqToolName === fnCallArr[i].function.name) {
        seqToolCount++;
      } else {
        seqToolName = fnCallArr[i].function.name;
        seqToolCount = 1;
      }
    }
    //scratchPad = await getScratchPad();
    conversation = prevMsgHistory.concat(currMsgHistory);
    modelResponse = await generateResponse(conversation, executorPrompt,taskTools);
    responseMessage = modelResponse.choices[0].message;
    count++;
  }

  msgHistory = prevMsgHistory.concat(currMsgHistory);
  await setScratchPad("");
  output.write(
    `\nFinal task response ${taskItem.getId} output: ${modelResponse.choices[0].message.content}\n`,
  );
  return modelResponse.choices[0].message.content;
}

export { executeTask };
//let text = await executeTask({id:"1",taskDescription:"list unread messages to find first message id.",status:"pending",tools:[]});
//console.log(text);
/*
let chatSummary = await generateResponse(
      msgHistory.slice(recentChatLen).toString(),
      summariserPrompt,
      [],
    );
*/
