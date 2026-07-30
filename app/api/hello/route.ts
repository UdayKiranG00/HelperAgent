// app/api/hello/route.ts
import { createAssistantStreamResponse } from "assistant-stream";
import { NextResponse } from "next/server";
import { OpenRouter } from '@openrouter/sdk';
import { stdin as input, stdout as output } from "node:process";

const question = 'How would you build the tallest building ever?';

const stream = await openRouter.chat.send({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: question }],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices?.[0]?.delta?.content;
  if (content) {
    console.log(content);
  }

  // Final chunk includes usage stats
  if (chunk.usage) {
    console.log('Usage:', chunk.usage);
  }
}





export async function POST(request: Request) {
    process.loadEnvFile();
    const openrouter = new OpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });

  const { messages, tools, system, threadId } = await request.json();

  return createAssistantStreamResponse(async (controller) => {

      const stream = await openRouter.chat.send({
        model: 'openai/gpt-4o',
        messages: [{ role: 'user', content: question }],
        stream: true,
      });

    const stream = await processWithAI({ messages, tools, system });
    for await (const chunk of stream) {
      controller.appendText(chunk.text);
    }
  });
}