import { exec } from "child_process";
import fs from "fs/promises";
import { stdin as input, stdout as output } from "node:process";
import * as cheerio from "cheerio";
import { generateResponse, categorizerPrompt } from "./ModelInterface.js";
import { categoryToolDeclaration } from "./ToolDescriptions.js";
import { setScratchPad } from "./MongoDBInterface.js";
import { callMCPTool } from "./McpClient.js";
import { appendTaskItem, updateTaskItem } from "./TaskDS.js";

async function executeCmd(cmd) {
  let cmdResponse = "";
  cmdResponse = await new Promise((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve(error.message);
      } else if (stderr) {
        resolve(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
  if (cmdResponse === "") cmdResponse = "task executed successfully.";
  return cmdResponse;
}

let filePath = "E:/React/helper-agent/output.txt";
async function extractMailContent() {
  let jsonStr = await fs.readFile(filePath, "utf-8");
  let mailObj = JSON.parse(jsonStr);
  let headerData = "";
  let decodedBodyData = "";
  let headers = mailObj.payload.headers;
  let result = "";
  for (let header of headers) {
    if (header.name === "From") {
      headerData += "From: " + header.value;
    } else if (header.name === "Date") {
      headerData += "Date: " + header.value;
    } else if (header.name === "Subject") {
      headerData += "Subject: " + header.value;
    } else continue;
  }
  result += headerData + "\n";
  if (mailObj.payload.body.size > 0) {
    decodedBodyData += Buffer.from(
      mailObj.payload.body.data,
      "base64",
    ).toString("utf-8");
  } else {
    for (let pLoad of mailObj.payload.parts) {
      if (pLoad.body.size > 0) {
        decodedBodyData += Buffer.from(pLoad.body.data, "base64").toString(
          "utf-8",
        );
      }
    }
  }
  //let extractHtml = await cheerio.load(decodedData);
  //output.write("cheerio extraction: "+extractHtml);
  result +=
    "Data: " + (await (await cheerio.load(decodedBodyData)).text()) + "\n";

  await fs.writeFile(filePath, result, "utf-8");
}

async function executeCommands(toolResObj, cmd, args) {
  cmd = args.command;
  toolResObj.toolResponse += "[command used]: " + cmd;
  let response = await executeCmd(cmd);
  await fs.writeFile(filePath, response, "utf-8");
}

async function readMessageDetails(toolResObj, cmd, args) {
let params = `{\\"userId\\": \\"me\\", \\"id\\": \\"${args.id}\\"}`
  cmd = `gws gmail users messages get --params "${params}"`;
  output.write("\ntool command: " + cmd);
  toolResObj.toolResponse += "[command used]: " + cmd;
  cmd = cmd + " >output.txt";
  await executeCmd(cmd);
  try {
    await extractMailContent();
  } catch (error) {
    await executeCmd(`echo ${error} > output.txt`);
  }
}

async function listsMessages(toolResObj, cmd, args) {
  let params = `{ \\"userId\\": \\"${args.userId}\\", \\"q\\": \\"${args.q}\\", \\"maxResults\\": \\"1\\" `;
  if (args?.pageToken) params += `,\\"pageToken\\":\\"${args.pageToken}\\"`;
  params += `}`;
  //command to list unread messages: gws gmail users messages list --params "{\"userId\": \"me\", \"q\": \"is:unread\", \"maxResults\": \"2\", \"pageToken\": \"18101350643833213025\"}"

  cmd = `gws gmail users messages list --params "${params}"`;
  output.write("\ntool command: " + cmd);
  toolResObj.toolResponse += "[command used]: " + cmd;
  cmd = cmd + " >output.txt";
  await executeCmd(cmd);
}

async function sendMails(toolResObj, cmd, args) {
  let mailStr = "";
  let len = args.mailList.length - 1;
  for (let i = 0; i < len; i++) {
    mailStr = mailStr + args.mailList[i] + ",";
  }
  mailStr = mailStr + args.mailList[len];
  cmd = `gws gmail +send --to ${mailStr} --subject "${args.subject}" --body "${args.body}" --html`;
  output.write("tool command: " + cmd);
  toolResObj.toolResponse += "[command used]: " + cmd;
  cmd = cmd + " >output.txt";
  await executeCmd(cmd);
}

async function trashGmailMessage(toolResObj, cmd, args) {
  cmd = `gws gmail users messages trash --params "{\\"userId\\":\\"me\\",\\"id\\":\\"${args.id}\\"}"`;
  output.write("\ntool command: " + cmd);
  toolResObj.toolResponse += "[command used]: " + cmd;
  cmd = cmd + " >output.txt";
  await executeCmd(cmd);
}

async function saveContact(toolResObj, cmd, args) {
  cmd = `echo {"name":"${args.name}","mailAddress":"${args.mailAddress}"} >> contacts.txt`;
  output.write("\ntool command: " + cmd);
  toolResObj.toolResponse += "[command used]: " + cmd;
  await executeCmd(cmd);
  await executeCmd(`type Nul > output.txt`);
}

async function readContactsList(toolResObj, cmd, args) {
  cmd = `type contacts.txt`;
  output.write("\ntool command: " + cmd);
  toolResObj.toolResponse += "[command used]: " + cmd;
  cmd = cmd + " >output.txt";
  await executeCmd(cmd);
}

async function trashAutomation(toolResObj, cmd, args) {
  cmd = `gws gmail users messages list --params "{\\"userId\\": \\"me\\", \\"q\\": \\"all\\"}" >output.txt`;
  await executeCmd(cmd);
  let filePath = "E:/SampleAgent/output.txt";
  let msgListStr = await fs.readFile(filePath, "utf-8");
  let msgList = JSON.parse(msgListStr).messages;
  for (let i = 0; i < msgList.length; i++) {
    cmd = `gws gmail users messages get --params "{\\"userId\\": \\"me\\", \\"id\\": \\"${msgList[i].id}\\"}" > output.txt`;
    await executeCmd(cmd);
    output.write(`\nmessageId: ${msgList[i].id}`);
    try {
      await extractMailContent();
    } catch (error) {
      output.write(`error: ${error}`);
      continue;
    }
    let input = await fs.readFile(filePath, "utf-8");
    output.write(`\n input: ${input}\n`);
    let response = await generateResponse(input, categorizerPrompt, [
      categoryToolDeclaration,
    ]);
    if (response.functionCalls?.length > 0) {
      let category = response.functionCalls[0].args.category;
      output.write(`\ncategory: ${category}, : ${i} \n\n`);
      if (category === "Other") continue;
      cmd = `gws gmail users messages trash --params "{\\"userId\\":\\"me\\",\\"id\\":\\"${msgList[i].id}\\"}" >output.txt`;
      await executeCmd(cmd);
    }
  }
  await executeCmd(`type Nul > output.txt`);
}

async function saveScratchPad(toolResObj, cmd, args) {
  //output.write(`scratchpad from llm: ${args.content}`);
  await setScratchPad(args.content);
  await executeCmd(`echo "updated scratchpad successfully." > output.txt`);
}

async function appendTask(toolResObj, cmd, args) {
  let toolNames = [];
  if (args?.tool_names) {
    toolNames = args.tool_names;
  }
  console.log(JSON.stringify(args));
  appendTaskItem(args.id, args.task_description, args.status, toolNames);
  console.log("in append task: ", args.id);
  let toolResponse = `appended given task successfully.`;
  await executeCmd(`echo ${toolResponse} > output.txt`);
}

async function taskFailed(toolResObj, cmd, args) {
  updateTaskItem(args.id, "Failed", args.output);
  let toolResponse = `updated task of id ${args.id} : ${args.output} as failed successfully.`;
  await executeCmd(`echo ${toolResponse} > output.txt`);
}

const toolFnMap = new Map([
  ["execute_commands", executeCommands],
  ["read_message_details", readMessageDetails],
  ["lists_messages", listsMessages],
  ["send_mails", sendMails],
  ["trash_gmail_message", trashGmailMessage],
  ["save_contact", saveContact],
  ["read_contacts_list", readContactsList],
  ["trash_automation", trashAutomation],
  ["save_scratchpad", saveScratchPad],
  ["append_task", appendTask],
  ["task_failed", taskFailed],
]);

async function executeTool(toolCall) {
  let cmd = "";
  const toolResObj = {
    toolResponse: "",
  };
  let args = JSON.parse(toolCall.arguments);
  let name = toolCall.name;
  //calls corresponding functions.
  if (toolFnMap.get(name)) {
    await toolFnMap.get(name)(toolResObj, cmd, args);
  } else {
    output.write(`\n Arguments args : ,${JSON.stringify(args)}\n`);
    let result = await callMCPTool(name, args);
    await fs.writeFile("output.txt", result, "utf-8");
  }

  toolResObj.toolResponse += await executeCmd("type output.txt");
  //console.log(toolResponse);
  return toolResObj.toolResponse;
}

export { executeTool };
