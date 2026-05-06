import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import type { RagAnswer, RetrievedContext } from "./rag-types";
import { retrieveContext } from "./retrieve-context";

function formatContext(sources: RetrievedContext[]) {
  return sources
    .map((source) =>
      `
Source ID: ${source.id}
Title: ${source.title}
Content: ${source.content}
Tags: ${source.tags.join(", ")}
Similarity score: ${source.score.toFixed(4)}
`.trim(),
    )
    .join("\n\n---\n\n");
}

export async function answerFromNotes(question: string): Promise<RagAnswer> {
  const sources = await retrieveContext({
    query: question,
    limit: 3,
    minScore: 0.35,
  });

  if (sources.length === 0) {
    return {
      answer: "I could not find relevant notes to answer that.",
      sources: [],
    };
  }

  const { text } = await generateText({
    model: openai("gpt-4.1-mini"),

    system: `
You answer questions using only the provided notes.

Rules:
- Use only the provided sources.
- Do not add outside knowledge.
- If the sources do not contain enough information, say that.
- Cite sources inline using their Source ID, like [note_2].
- Keep the answer concise.
    `.trim(),

    prompt: `
Question:
${question}

Sources:
${formatContext(sources)}

Answer the question using only the sources above.
    `.trim(),
  });

  return {
    answer: text.trim(),
    sources,
  };
}
