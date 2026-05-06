import { config } from "dotenv";

config({ path: ".env.local" });
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { semanticSearchNotes } from "../lib/semantic-search";
import { answerFromNotes } from "../lib/rag-answer";
import { knowledgeBase } from "../lib/knowledge-base";

const server = new McpServer({
  name: "genai-lab-mcp",
  version: "0.1.0",
});

server.registerTool(
  "search_notes",
  {
    title: "Search Notes",
    description:
      "Search saved notes and return matching note entries. Use only when the user asks to find, search, list, retrieve, or show notes.",
    inputSchema: {
      query: z.string().describe("The search query."),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of notes to return."),
    },
  },
  async ({ query, limit }) => {
    const results = await semanticSearchNotes({
      query,
      limit: limit ?? 3,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              query,
              results: results.map((result) => ({
                id: result.note.id,
                title: result.note.title,
                content: result.note.content,
                tags: result.note.tags,
                score: result.score,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "answer_from_notes",
  {
    title: "Answer From Notes",
    description:
      "Answer conceptual or explanatory questions using the saved notes knowledge base. Use for what, why, how, explain, or summarize questions.",
    inputSchema: {
      question: z.string().describe("The question to answer from saved notes."),
    },
  },
  async ({ question }) => {
    const result = await answerFromNotes(question);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.registerResource(
  "notes",
  "notes://all",
  {
    title: "Saved Notes",
    description: "All saved notes in the local knowledge base.",
    mimeType: "application/json",
  },
  async (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(knowledgeBase, null, 2),
        },
      ],
    };
  },
);

server.registerPrompt(
  "rag_answer_prompt",
  {
    title: "RAG Answer Prompt",
    description:
      "Prompt template for answering questions using only provided sources.",
    argsSchema: {
      question: z.string().describe("The user question."),
      sources: z.string().describe("Retrieved source content."),
    },
  },
  ({ question, sources }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `
Answer the question using only the provided sources.

Rules:
- Do not use outside knowledge.
- If the sources do not contain enough information, say that.
- Cite sources inline using source IDs.

Question:
${question}

Sources:
${sources}
          `.trim(),
        },
      },
    ],
  }),
);

async function main() {
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
