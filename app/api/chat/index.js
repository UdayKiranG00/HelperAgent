import { stdin as input, stdout as output } from "node:process";
import { getDBConnection, closeMongoDBConnection } from "./MongoDBInterface.js";
import { connectMCPToPlaywright, closeMCPConnection } from "./McpClient.js";
import { planTasks, evaluateTask, planTasksBySchema } from "./TaskPlanner.js";
import { createInterface } from "node:readline/promises";
import { executeTask } from "./TaskExecutor.js";
import {
  getTasks,
  clearTasks,
  readTaskById,
  updateTaskItem,
} from "./TaskDS.js";

export default async function mainFn(userQuery, streamWriter) {
  await connectMCPToPlaywright(); //starts and connects mcp server.

  let taskItems = await planTasksBySchema(userQuery); //loops user chat session.
  let taskHistory = [];
  while (taskItems.length > 0) {
    output.write(
      `\nIn main\n planned tasks are: ${JSON.stringify(taskItems)}.`,
    );
    for (let task of taskItems) {
      taskHistory.push(`Task ${task.getId}: ${task.getName}\n`);
      let taskResponse = await executeTask(task);
      taskHistory.push(`Task ${task.getId} Response: ${taskResponse}\n`);
      let taskItem = readTaskById(task.getId);
      if (taskItem.getStatus === "Failed") {
        output.write(`\n in main failed: ${taskItem.getOutput}`);
        taskHistory.push(`Task ${task.getId} Response: ${taskItem.getOutput}`);
        break;
      } else {
        output.write(`\n in main passed: ${taskItem.getOutput}`);
        updateTaskItem(taskItem.getId, "Done", taskResponse);
        continue;
      }
    }
    output.write(`\n\nIn main tasks completed: ${taskHistory.toString()}`);
    let result = await evaluateTask(userQuery, taskHistory.toString());
    if (result === "YES") {
      output.write(`\n\n In main evaluation output: ${result}\n`);
      break;
    } else {
      taskItems = await planTasks(
        `User Query: ${userQuery}\n` + taskHistory.toString(),
      );
    }
  }
  await closeMCPConnection();
  return taskHistory.toString();
}

//main("get a latest mail content and summarise it.",undefined)
/*
let arr = ['hi','uday','kiran',2,3];
console.log(arr.toString()+"\n");
console.log(JSON.stringify(arr));
*/
