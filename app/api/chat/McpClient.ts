import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs/promises";
import { stdin as input, stdout as output } from "node:process";

//MCP Client
const mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });

const filePath = "./toolDefinitionsPlaywright.ts";

async function connectMCPToPlaywright() {
  const command = "npx";
  // STDIO transport to access MCP server
  const transport = new StdioClientTransport({
    command,
    args: ["-y", "@playwright/mcp@latest"],
  });
  await mcp.connect(transport);
}

async function closeMCPConnection() {
  try {
    await mcp.close();
  } catch (error) {
    throw error;
  }
}

async function callMCPTool(toolName, toolArgs) {
  try {

    let result = await mcp.callTool({ name: toolName, arguments: toolArgs });
    output.write(`\nMCP tool response for ${toolName}: ${JSON.stringify(result)}\n`);
    output.write(
      `\n content result:  ${JSON.stringify(result.content, null, 2)} \n`,
    );
    return JSON.stringify(result.content, null, 2);
  } catch (e) {
    console.log("Failed to connect to MCP server: ", e);
    throw e;
  }
}

export { callMCPTool, connectMCPToPlaywright, closeMCPConnection };

/*
const toolsResult = await mcp.listTools();
    let tools = toolsResult.tools.map((tool) => {
      return {
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      };
    });
    await fs.writeFile(filePath,JSON.stringify(tools),"utf-8")
    console.log("Connected to server with tools:", tools[3].name,"\n",tools[3].description,"\n",tools[3].input_schema);
*/
