"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";

// These imports depend on whether you used shadcn or manual setup.
// Adjust the paths to your actual component files:
import { Thread } from "@/components/thread";

export default function HomePage() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "../api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-screen w-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
