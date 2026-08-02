import { stdin as input, stdout as output } from "node:process";
import { connectMCPToPlaywright, closeMCPConnection } from "./McpClient.ts";
import { evaluateTask, planTasksBySchema } from "./TaskPlanner.ts";
import { executeTask } from "./TaskExecutor.ts";
import {
  getTasks,
  readTaskById,
  updateTaskItem,
} from "./TaskDS.ts";
import type {taskType} from "./TaskDS.ts"
export default async function mainFn(userQuery:string, streamWriter): string {
  let playwrightPromise = connectMCPToPlaywright(); //starts and connects mcp server as background task.

  let taskItems: taskType[] = await planTasksBySchema(userQuery); //plans and creates tasks.
  let taskHistory: string[] = [];
  let planAgain: boolean = false
  await playwrightPromise//awaits for mcp playwright to connect properly before task execution.
  while (taskItems.length > 0) {
    output.write(`\nIn main\n planned tasks are: ${JSON.stringify(taskItems)}.`);
    for (let task of taskItems) {
      //taskHistory.push(`Task ${task.getId}: ${task.getName}\n`);
      let taskResult = await executeTask(task);
      taskHistory.push(`Task ${task.getId} Response: ${taskResult.output}\n`);
      output.write(`\n in main task status: ${taskResult.status}`);
      if (taskResult.status === "Failure") {
        planAgain = true
        break;
      } else {
        updateTaskItem(task.getId, "Done", taskResult.output);
        continue;
      }
    }
    //let result = await evaluateTask(userQuery, taskHistory.toString());
    if (planAgain) {
      taskItems = await planTasksBySchema(`User Query: ${userQuery}\n this user task has failed before, for your information: ${taskHistory.toString()}`)
    } else {break}
  }
  await closeMCPConnection();
  output.write(`run agent task Final tasks output: ${taskHistory.toString()}`)
  return taskHistory.toString();
}

//main("get a latest mail content and summarise it.",undefined)
/*
let arr = ['hi','uday','kiran',2,3];
console.log(arr.toString()+"\n");
console.log(JSON.stringify(arr));
*/
