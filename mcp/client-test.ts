import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "pnpm",
  args: ["tsx", "mcp/server.ts"],
});

const client = new Client({
  name: "genai-assistant-lab-mcp-test-client",
  version: "0.1.0",
});

async function main() {
  await client.connect(transport);

  const tools = await client.listTools();

  console.log("\nAvailable tools:");
  console.log(JSON.stringify(tools, null, 2));

  const searchResult = await client.callTool({
    name: "search_notes",
    arguments: {
      query: "reducing long chat cost",
      limit: 3,
    },
  });

  console.log("\nsearch_notes result:");
  console.log(JSON.stringify(searchResult, null, 2));

  const ragResult = await client.callTool({
    name: "answer_from_notes",
    arguments: {
      question: "How do production apps reduce long chat cost?",
    },
  });

  console.log("\nanswer_from_notes result:");
  console.log(JSON.stringify(ragResult, null, 2));

  const resources = await client.listResources();
  console.log(JSON.stringify(resources, null, 2));

  const notesResource = await client.readResource({
    uri: "notes://all",
  });
  console.log(JSON.stringify(notesResource, null, 2));

  const prompts = await client.listPrompts();
  console.log(JSON.stringify(prompts, null, 2));

  const prompt = await client.getPrompt({
    name: "rag_answer_prompt",
    arguments: {
      question: "How do production apps reduce long chat cost?",
      sources: "note_2: Long conversations become more expensive...",
    },
  });
  console.log(JSON.stringify(prompt, null, 2));

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
