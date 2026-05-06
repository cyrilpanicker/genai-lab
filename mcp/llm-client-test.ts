import { config } from "dotenv";

config({ path: ".env.local" });

import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";

const userMessage = process.argv.slice(2).join(" ");

if (!userMessage) {
  console.error('Usage: pnpm mcp:llm "your message here"');
  process.exit(1);
}

async function main() {
  const transport = new Experimental_StdioMCPTransport({
    command: "pnpm",
    args: ["tsx", "mcp/server.ts"],
  });

  const mcpClient = await createMCPClient({
    transport,
  });

  try {
    const tools = await mcpClient.tools();

    const result = await generateText({
      model: openai("gpt-4.1-mini"),

      system: `
      You are a practical assistant with access to MCP tools.
      
      Tool selection rules:
      - Use search_notes when the user asks to find, search, list, retrieve, or show matching notes.
      - Use answer_from_notes when the user asks a question like what, why, how, explain, summarize, or asks for an answer.
      - Do not use search_notes when the user wants a direct answer.
      - Do not claim information came from notes unless a tool result confirms it.
      - If no MCP tool is relevant, answer briefly.
      `.trim(),

      prompt: userMessage,

      tools,

      stopWhen: stepCountIs(2),
    });

    const allToolCalls = result.steps.flatMap((step) => step.toolCalls);
    const allToolResults = result.steps.flatMap((step) => step.toolResults);

    console.log("\nFinal response:");
    console.log(result.text);

    console.log("\nMCP tool calls:");
    console.log(JSON.stringify(allToolCalls, null, 2));

    console.log("\nMCP tool results:");
    console.log(JSON.stringify(allToolResults, null, 2));
  } finally {
    await mcpClient.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
