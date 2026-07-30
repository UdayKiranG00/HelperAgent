import { google } from "@ai-sdk/google";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  convertToModelMessages,
  streamText,
  tool,
  generateText,
  createUIMessageStreamResponse,
  createUIMessageStream,
  toUIMessageStream,
} from "ai";
import { z } from "zod";
import mainFn from "./index.js";
export const maxDuration = 150;

function isToolCall(messages) {
  for (let message of messages) {
    if (message.role === "tool") return true;
  }
  return false;
}
export async function POST(req: Request) {
  let { messages, system, tools } = await req.json();

  system = `You are an helpful assistant. you have runAgentTask tool to call an agent, it is a super agent that can execute any task.`;

  const createTools = (writer) => {
    return {
      runAgentTask: tool({
        description: "Its a super agent that can do any task, has access to all capabilities and functions.",
        parameters: z.object({
          task: z
            .string()
            .describe(
              "Complete task description to achieve the user intent, understandable by another LLM.",
            ),
        }),
        execute: async (input) => {
          console.log("Raw task:", JSON.stringify(input));
          let taskDescription = input?.task || input?.description;
          // Pass the actual dynamic task from input into your main function
          let agentOutput = await mainFn(taskDescription, writer);

          return { result: String(agentOutput ?? "") };
        },
      }),
    };
  };

  const modelMessages = await convertToModelMessages(messages);

  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      let modelResponseMessages;
      let modelResult;
      let allMessages = [...modelMessages];
      tools = createTools(writer);
      while (true) {
        modelResult = streamText({
          model: google("gemma-4-31b-it"),
          messages: allMessages,
          toolChoice: "auto",
          tools: tools,
        });

        // Merge and await completion
        writer.merge(
          toUIMessageStream({
            stream: modelResult.stream,
            omitFinishEvent: true,
          }),
        );
        await modelResult.consumeStream();
        modelResponseMessages = (await modelResult.response).messages;
        console.log("model Response: ", JSON.stringify(modelResponseMessages));
        allMessages = [...allMessages, ...modelResponseMessages];
        if (isToolCall(modelResponseMessages)) continue;
        else break;
      }
    },
  });

  return createUIMessageStreamResponse({ stream: uiMessageStream });
}
