import { stdin as input, stdout as output } from "node:process";
import { executeTool } from "./ToolExecutor.ts";
import {
  generateResponse,
  summariserPrompt,
  gmailPrompt,
  playWrightPrompt,
} from "./ModelInterface.ts";
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
} from "./MongoDBInterface.ts";
import { getTasks, appendTaskItem } from "./TaskDS.ts";
import type { taskType } from "./TaskDS.ts";
import * as z from "zod";

const evaluatorPrompt = `you are an expert evaluator, your will get a sequence of user and assistant messages,
analyze assistant response and validate if user query/goal is reached. output text whether goal reached or not with reason and details.
Output Instructions:
1. only output either YES or NO in capital letters.
2. Just one word with out double quotes, do not output even a single extra word or full stop or symbol.
`;
async function evaluateTask(userQuery, assistantResponse): "YES" | "NO" {
  let userMessage = {
    role: "user",
    content: userQuery,
  };
  let assistantMessage = {
    role: "assistant",
    content: assistantResponse,
    refusal: null,
  };
  let response = await generateResponse(
    [userMessage, assistantMessage],
    evaluatorPrompt,
    [],
  );
  return response.choices[0].message.content as "YES" | "NO";
}

const planningPromptBySchema = `you are an expert task planner. your sole purpose is to create tasks and never run tasks on your own.
                       output the expected schema result.
                       1. analyse user request/goal(important).
                       2. Break down the task to sub-tasks.

                       ##Instructions on creating tasks:
                       1. First analyse all the tools and their descriptions you have, and create tasks based on user request/goal.
                       2. provide all tool names required even having a probability of 1 in 50., to get the task accomplished.
                       3. create tasks that only user asked or intended, *never assume*.

                       Here is the list of tool_names and their descriptions:
                       *Email Tools*
                       tool_name: send_mails
                       tool_description: Sends emails to multiple users.

                       tool_name: lists_messages
                       tool_description: Lists unread Gmail messages for the authenticated user matching optional search filters.

                       tool_name: read_message_details
                       tool_description: Retrieves the sender, subject, body, and headers of a specific Gmail message by its messageID.

                       tool_name: trash_gmail_message
                       tool_description: Moves a specific Gmail message to the trash folder using its message ID.

                       tool_name: trash_automation
                       tool_description: To initiate a process that deletes unwanted/unuseful mails.

                       *System Tools*
                       tool_name: execute_commands
                       tool_description: execute any command in the windows command prompt like create folders/file, read/write files etc.. in current directory as root.`;

//outputs a structured json of task list with required tools.
async function planTasksBySchema(inputQuery): taskType[] {
  let msgHistory = []; //type should be union of user,assistant,tool messages types
  let userMessage = {
    role: "user",
    content: inputQuery,
  };
  msgHistory.push(userMessage);
  console.log(userMessage);
  let outputSchema = {
    type: "json_schema",
    jsonSchema: {
      name: "task_execution_plan",
      strict: true,
      schema: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            description:
              "A list of tasks and the specific tools required to execute them.",
            items: {
              type: "object",
              properties: {
                task_description: {
                  type: "string",
                  description: "Clear description of the task to be performed.",
                },
                tool_names: {
                  type: "array",
                  description:
                    "List of tool names or identifiers relevant to this task.",
                  items: {
                    type: "string",
                  },
                },
              },
              required: ["task_description", "tool_names"],
              additionalProperties: false,
            },
          },
        },
        required: ["tasks"],
        additionalProperties: false,
      },
    },
  };
  const zSchemaValidator = z.fromJSONSchema(outputSchema.jsonSchema.schema);
  const modelForJsonOutput = "google/gemma-4-26b-a4b-it:free";
  let modelResponse = await generateResponse(
    msgHistory,
    planningPromptBySchema,
    [],
    outputSchema,
    modelForJsonOutput,
  );

  console.log(
    "json structured output: ",
    modelResponse.choices[0].message.content,
  );
  let taskItems = zSchemaValidator.parse(
    JSON.parse(modelResponse.choices[0].message.content),
  );
  console.log("validated schema", JSON.stringify(taskItems));

  for (let i = 0; i < taskItems.tasks.length; i++) {
    let task = taskItems.tasks[i];
    appendTaskItem(i, task.task_description, "pending", task.tool_names);
  }
  output.write(`\nPlanning completed appended tasks.\n`);

  return getTasks();
}

export { evaluateTask, planTasksBySchema };

/*
Contact Tools
                       tool_name: read_contacts_list
                       tool_description: gets a list of contacts with name and mail address.

                       tool_name: save_contact
                       tool_description: saves a new contact with name and email address.

                       Browser Automation Tools
                       tool_name: browser_close
                       tool_description: Close the page

                       tool_name: browser_resize
                       tool_description: Resize the browser window

                       tool_name: browser_console_messages
                       tool_description: Returns all console messages

                       tool_name: browser_handle_dialog
                       tool_description: Handle a dialog

                       tool_name: browser_evaluate
                       tool_description: Evaluate JavaScript expression on page or element

                       tool_name: browser_file_upload
                       tool_description: Upload one or multiple files

                       tool_name: browser_drop
                       tool_description: Drop files or MIME-typed data onto an element, as if dragged from outside the page. At least one of "paths" or "data" must be provided.

                       tool_name: browser_fill_form
                       tool_description: Fill multiple form fields

                       tool_name: browser_press_key
                       tool_description: Press a key on the keyboard

                       tool_name: browser_type
                       tool_description: Type text into editable element

                       tool_name: browser_navigate
                       tool_description: Navigate to a URL

                       tool_name: browser_navigate_back
                       tool_description: Go back to the previous page in the history

                       tool_name: browser_network_requests
                       tool_description: Returns a numbered list of network requests since loading the page. Use browser_network_request with the number to get full details.

                       tool_name: browser_network_request
                       tool_description: Returns full details (headers and body) of a single network request, or a single part if part is set. Use the number from browser_network_requests.

                       tool_name: browser_run_code_unsafe
                       tool_description: Run a Playwright code snippet. Unsafe: executes arbitrary JavaScript in the Playwright server process and is RCE-equivalent.

                       tool_name: browser_take_screenshot
                       tool_description: Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.

                       tool_name: browser_snapshot
                       tool_description: Capture accessibility snapshot of the current page, this is better than screenshot

                       tool_name: browser_click
                       tool_description: Perform click on a web page

                       tool_name: browser_drag
                       tool_description: Perform drag and drop between two elements

                       tool_name: browser_hover
                       tool_description: Hover over element on page

                       tool_name: browser_select_option
                       tool_description: Select an option in a dropdown

                       tool_name: browser_tabs
                       tool_description: List, create, close, or select a browser tab.

                       tool_name: browser_wait_for
                       tool_description: Wait for text to appear or disappear or a specified time to pass
                       */
