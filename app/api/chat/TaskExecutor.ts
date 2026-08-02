import { stdin as input, stdout as output } from "node:process";
import { executeTool } from "./ToolExecutor.ts";
import { generateResponse, summariserPrompt } from "./ModelInterface.ts";
import {
  gmailToolDeclaration,
  commandToolDeclaration,
  planningToolDeclaration,
} from "./ToolDescriptions.ts";

import { playwrightToolsDeclaration } from "./toolDefinitionsPlaywright.ts";
import {
  getGmailConfig,
  getScratchPad,
  setScratchPad,
  getToolsDefinition,
} from "./MongoDBInterface.ts";
import * as z from "zod"
import type {taskType} from "./TaskDS.ts"

const executorPrompt = `you are an expert in task execution, you get a task and required tools to accomplish the task.
You will also get complete history of previous tasks, tools called and tool responses where you can refer for details.
Perform the current task. when tool responses have errors try alternative way, hit a wall? consider task as failed.

##ScratchPad(tool: save_scratchpad, it gets overwrite)
Use scratchpad to write your thoughts/approach/notes to carry out the current task, update it first and mind your actions align with it.

##Output Instructions:
1. when task accomplishes, provide json output as success with every single detail.
2. when task fails, provide json output "Unable to finish the task." with reasons.
`;

const taskOutputSchema = {
    type:"json_schema",
    jsonSchema:{
        name:"task_execution_output",
        strict:true,
        schema:{
            type:"object",
            properties:{
                output:{
                    type:"string",
                    description:"result of the task being executed, include every detail.",
                },
                status:{
                    type:"string",
                    description:"does the task goal achieved or not.",
                    enum:["Success","Failure"],
                }
            },
            required:["output","status"],
            additionalProperties:false,
        },
    },
};

let msgHistory = [];
async function executeTask(taskItem) {
  const recentChatLen = -30;
  let scratchPad = "";
  let toolNames = taskItem.getTools;
  toolNames.push("task_failed");
  //toolNames.push("save_scratchpad");
  let taskToolsPromise = getToolsDefinition(toolNames);

  let prevMsgHistory = msgHistory;
  let currMsgHistory = [];
  //input
  let taskMessage = {
    content: taskItem.getName,
    role: "user",
  };
  const zSchemaValidator = z.fromJSONSchema(taskOutputSchema.jsonSchema.schema);
  let modelForJsonOutput = "google/gemma-4-26b-a4b-it:free"
  //console.log(JSON.stringify(prevMsgHistory));
  currMsgHistory.push(taskMessage);
  let conversation = prevMsgHistory.concat(currMsgHistory);
  const taskTools = await taskToolsPromise
  console.log(taskTools);
  let modelResponse = await generateResponse(conversation, executorPrompt,taskTools,taskOutputSchema,modelForJsonOutput);
  console.log(JSON.stringify(modelResponse.choices[0].message));
  let count = 1;
  output.write(`count is: ${count}`);
  let responseMessage = modelResponse.choices[0].message;
  while (responseMessage.toolCalls?.length > 0) {
    currMsgHistory.push(responseMessage);
    output.write(`\ntask of id ${taskItem.getId} Length in loop ${count} is: ${responseMessage.toolCalls?.length}`,);
    let fnCallArr = responseMessage.toolCalls;

    for (let i = 0; i < fnCallArr.length; i++) {
      let toolResponse = await executeTool(fnCallArr[i].function);

      toolResponse = {
        name: fnCallArr[i].name,
        content: `${toolResponse}`,
        toolCallId: fnCallArr[i].id,
        role: "tool",
      };

      output.write(`\n${JSON.stringify(toolResponse)}\n`);
      currMsgHistory.push(toolResponse);
    }
    //scratchPad = await getScratchPad();
    conversation = prevMsgHistory.concat(currMsgHistory);
    modelResponse = await generateResponse(conversation, executorPrompt,taskTools,taskOutputSchema,modelForJsonOutput);
    responseMessage = modelResponse.choices[0].message;
    count++;
  }
  currMsgHistory.push(responseMessage);
  let taskResult = zSchemaValidator.parse(JSON.parse(responseMessage.content))
  msgHistory = prevMsgHistory.concat(currMsgHistory);
  setScratchPad("");
  output.write(`\nFinal task response ${taskItem.getId} output: ${JSON.stringify(taskResult)}\n`);
  return taskResult;
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
