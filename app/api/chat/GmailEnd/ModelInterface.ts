//import { GoogleGenAI } from "@google/genai";
import process from "node:process";
import { OpenRouter } from "@openrouter/sdk";

import type { components } from "@openrouter/sdk";

// Type an array of messages matching OpenRouter's shape
type ChatMessage = components["schemas"]["ChatCompletionMessageParam"];

const gmailPrompt = `you are a technical gmail manager understands user query, plans and calls tools if necessary and gets tools responses,
                       you will also get a summary of previous conversation(chat history) of user intent, tool call, tool response along with latest user query/tool response,
                       chat history is where the work got paused and can be referred for details, its imperative to read it before taking any action, Call multiple tools at once if possible.
                       **never assume, stop and ask user**, Calling a single tool or hit a wall? if no response in <2 tries stop and inform user.

                       Use a scratchpad to write down your approach and thoughts(tool: save_scratchpad, the scratchpad gets overwrite,
                       Age of scratchpad is number of sequential tool calls executed since it's last modification, age>3 ? reflect yourself if execution aligning with goal).

                       As a task planner fully analyse user request/goal(important) and break down the task to sub-tasks, if number of tasks is >3 then append task items to task list for tracking.
                       Task management tools(append_task,update_task,read_tasks,delete_task). Each task item has id,task_description,status("pending","done","cancelled","failed").
                       Instructions on tasks management:
                       1. when a task completes update as "done".
                       2. when a task fails or a breakdown occurs, replan your approach efficiently relative to current state(update scratchpad), update task items with new values.
                       3. when a task is not required update as "cancelled".
                       4. is goal reached? check status of task items,confirm user with final response, delete task items.

                       Instructions as gmail manager for different operations:
                        - use only following tools for gmail operations(read_contacts_list,save_contact,trash_gmail_message,send_mails,list_unread_messages,read_message_details,trash_automation)
                        - Mail output instructions:
                          1. use the following structure From,Subject, Body(decode if encoded,summary), messageId.
                        - Mail send instructions:
                          1. if mail address not provided check contacts list,if not found stop and ask user.
                          2. clear subject, body(html format) start with greeting, write professionally and end with thanks, Uday G..
                        - Delete Instructions (**use this instructions only when user asks to "delete or trash mail"**)
                             1. analyse the intent of the mail and categorise.
                             2. *confirm with user* and delete.
                        - Trash automation(when user asked for trash automation).
                        - (Post-Operation) contact mail saving instructions:
                          1. encountered mail address? if details not present in contacts then save it.
                          scratchpad and chat in user prompt: `;

const playWrightPrompt = `you are an expert to apply for jobs understands user query, plans and calls tools if necessary and gets tools responses,
                       you will also get a summary of previous conversation(chat history) of user intent, tool call, tool response along with latest user query/tool response,
                       chat history is where the work got paused and can be referred for details, its imperative to read it before taking any action, Call multiple tools at once if possible.
                       **never assume, stop and ask user**, Calling a single tool or hit a wall? if no response in <2 tries stop and inform user.
                       when tool response is an error, understand the error and proceed in an alternative way, learn from mistakes.
                       Use a scratchpad to write down your approach and thoughts(tool: save_scratchpad, the scratchpad gets overwrite,
                       Age of scratchpad is number of sequential tool calls executed since it's last modification, age>3 ? reflect yourself if execution aligning with goal).

                       As a task planner fully analyse user request/goal(important) and break down the task to sub-tasks, if number of tasks is >3 then append task items to task list for tracking.
                       Task management tools(append_task,update_task,read_tasks,delete_task). Each task item has id,task_description,status("pending","done","cancelled","failed").
                       Instructions on tasks management:
                       1. when a task completes update as "done".
                       2. when a task fails or a breakdown occurs, replan your approach efficiently relative to current state(update scratchpad), update task items with new values.
                       3. when a task is not required update as "cancelled".
                       4. is goal reached? check status of task items,confirm user with final response, delete task items.

                       To ensure 100% reliability and avoid further errors, I will adopt the following professional workflow:
                       Phase 1: Intelligence Gathering (Current Step)I cannot guess your qualifications.
                       To proceed, I need:Your Resume/CV (or a detailed summary of your experience).
                       Your Preferences: Preferred location, job category (e.g., IT, Engineering, HR),
                       and employment type (Permanent/Fixed term).Specific Job ID/Title: If you already know which of the 173 jobs you want.
                       Phase 2: Targeted Filtering & SelectionOnce I have your profile, I will:Apply Filters: Use the site's filters to narrow the 173 jobs down to the top 3–5 most relevant matches.Comparative Analysis:
                       I will present these options to you with a brief explanation of why they match your profile.User Confirmation: I will wait for you to pick the exact position you want to apply for.
                       Phase 3: Systematic Application (The "Reliability" Framework)Once the job is selected, I will not just "start typing."
                       I will follow this strict technical sequence:Decomposition: Break the application form into logical sections
                       (e.g., Personal Info $\rightarrow$ Work History $\rightarrow$ Document Upload).
                       Discovery: Use browser_snapshot to map every single required field's
                       exact selector to avoid the "strict mode" errors I had previously.
                       Batch Execution: Fill entire sections using browser_fill_form to minimize tool calls and increase speed.
                       Validation: Perform a final snapshot of the filled form to verify all data is correct before clicking "Submit."
                       scratchpad and chat in user prompt: `;

const summariserPrompt = `You are a chat history summarizer. Analyze the provided conversation,
                            which consists of user queries, tool calls initiated by LLM and corresponding tool responses.
                            The tool response can be in different format (e.g., text, JSON, tables).
                            For all interaction turns, analyze the data and output a clear and concise summary detailing:
                            User Intent: stating the user's query.
                            Tool Call: tool called by LLM.
                            Tool Response : The result of specific function, do not miss even one notes,details,facts from function response, every detail is important.
                            Ensure the output is structured simply, so that another LLM can easily interpret the sequential context.
                            Here is the chat history: `;

const categorizerPrompt = `you are an expert decision maker, you will get content of a mail, analyse the content and execute the tool save_category
                            providing the category as an argument. tool call is expected for any input. Below is the list of categories.
                            1. "Promotional"(for any promotional/advertisement content).
                            2. "Rejection"(for any job application rejection mail).
                            3. "Other"(if not one of "Promotional" or "Rejection").
                            Here is the mail content: `;
let retries: number = 0;
const openrouter = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
async function generateResponse(
  inputMessages,
  systemPrompt,
  toolDeclarations,
  outputSchema,
  modelId = "openrouter/auto-beta",
) {
  let systemMessage = {
    role: "system",
    content: systemPrompt,
  };

  let messages = [systemMessage, ...inputMessages];
  try {
    let chatRequestObj = {
      model: modelId,
      messages: messages,
      modalities: ["text"],
      tools: toolDeclarations,
      provider: {
        requireParameters: true,
      },
    };
    if (outputSchema) {
      chatRequestObj["responseFormat"] = outputSchema;
    }

    console.log("Before model call: ", JSON.stringify(chatRequestObj));
    const response = await openrouter.chat.send({
      chatRequest: chatRequestObj,
    });

    console.log("openrouter response: ", JSON.stringify(response));
    retries = 0;
    return response;
  } catch (error) {
    console.log("model error is: ", JSON.stringify(error));
    if (retries < 3) {
      retries++;
      return generateResponse(
        inputMessages,
        systemPrompt,
        toolDeclarations,
        outputSchema,
      );
    }
    return "Error communicating with Gemini API:";
  }
}

export {
  generateResponse,
  summariserPrompt,
  gmailPrompt,
  categorizerPrompt,
  playWrightPrompt,
};

/*const message = response.choices[0].message; //for image output
if (message.images) {
  message.images.forEach((image, index) => {
    const imageUrl = image.image_url.url;
    console.log(`Generated image ${index + 1}: ${imageUrl.substring(0, 50)}...`);
  });
}*/
/*
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  //const prompt = `${systemPrompt} ${query}`;
  try {
    console.log("before model call");
    const response = await ai.models.generateContent({
      model: "gemma-4-31b-it", //"gemini-3.5-flash","gemini-2.5-flash","gemma-4-31b-it""gemini-2.5-flash-lite"
      contents: query,
      config: {
        temperature: 0.5,
        systemInstruction: systemPrompt,
        tools: toolDeclarations,
      },
    });

*/
