import { END, START, StateGraph } from "@langchain/langgraph";
import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from "zod";
import { MiniAgentState, type MiniAgentStateType } from "./agent-state";
import { retrieveContext } from "../retrieve-context";

const AgentPlanSchema = z.object({
  steps: z.array(
    z.enum([
      "retrieve_notes",
      "answer_question",
      "draft_message",
      "final_response",
    ]),
  ),
  retrievalQuery: z.string().nullable(),
  reason: z.string(),
});

function routeAfterPlanner(state: MiniAgentStateType) {
  if (state.plan.includes("retrieve_notes")) {
    return "retrieveNotes";
  }

  if (state.plan.includes("draft_message")) {
    return "draftMessage";
  }

  return "finalize";
}

function routeAfterRetrieve(state: MiniAgentStateType) {
  if (
    !state.retrievedAnswer &&
    state.errors.length === 0 &&
    state.retryCount > 0
  ) {
    return "retrieveNotes";
  }

  if (!state.retrievedAnswer || state.errors.length > 0) {
    return "finalize";
  }

  if (state.plan.includes("draft_message")) {
    return "draftMessage";
  }

  if (state.plan.includes("answer_question")) {
    return "answerQuestion";
  }

  return "finalize";
}

async function plannerNode(state: MiniAgentStateType) {
  const { output } = await generateText({
    model: openai("gpt-4.1-mini"),

    output: Output.object({
      schema: AgentPlanSchema,
    }),

    system: `
    You create a small execution plan for a controlled agentic workflow.
    
    Allowed steps:
    - retrieve_notes: use when the request needs information from saved notes.
    - answer_question: use after retrieve_notes when the user asks a conceptual/knowledge question.
    - draft_message: use when the user asks to draft, write, compose, or prepare a message/update.
    - final_response: always include this as the final step.
    
    Output requirements:
    - Return steps, retrievalQuery, and reason.
    - Use only the allowed step names.
    - Always include final_response as the last step.
    - If retrieve_notes is included, retrievalQuery must be a focused search topic.
    - If retrieve_notes is not included, retrievalQuery must be null.
    
    Rules:
    - If the user asks a conceptual question like "what is", "how does", "why", "explain", or "summarize", use retrieve_notes, answer_question, final_response.
    - If the user asks to find, search, retrieve, list, or show notes, use retrieve_notes, final_response.
    - If the user asks to draft from notes, use retrieve_notes, draft_message, final_response.
    - If the user asks to draft, write, compose, or prepare a message without needing notes, use draft_message, final_response.
    - If the request is clearly unsupported and unrelated to notes or drafting, use only final_response.
    - Do not include tool execution, sending actions, or external side effects.
    
    Retrieval query rules:
    - retrievalQuery should be the focused topic to search for, not the full user request.
    - Remove task words like "draft", "Slack update", "create a message", "from my notes", "find my notes", "use my notes".
    - Keep retrievalQuery short and semantic.
    - Examples: "tool calling", "backend tool execution", "reducing token usage", "semantic search".
    
    Examples:
    - "What is tool calling?"
      → steps: retrieve_notes, answer_question, final_response
      → retrievalQuery: "tool calling"
    
    - "How do production apps reduce long chat cost?"
      → steps: retrieve_notes, answer_question, final_response
      → retrievalQuery: "long chat cost"
    
    - "Explain RAG from my notes"
      → steps: retrieve_notes, answer_question, final_response
      → retrievalQuery: "RAG"
    
    - "Find my notes about RAG"
      → steps: retrieve_notes, final_response
      → retrievalQuery: "RAG"
    
    - "Show notes about semantic search"
      → steps: retrieve_notes, final_response
      → retrievalQuery: "semantic search"
    
    - "Find my notes about tool calling and draft a Slack update"
      → steps: retrieve_notes, draft_message, final_response
      → retrievalQuery: "tool calling"
    
    - "Use my notes about RAG to draft a short update"
      → steps: retrieve_notes, draft_message, final_response
      → retrievalQuery: "RAG"
    
    - "Create a Slack update from my notes about backend tool execution"
      → steps: retrieve_notes, draft_message, final_response
      → retrievalQuery: "backend tool execution"
    
    - "Use my notes about reducing token usage to draft a short team update"
      → steps: retrieve_notes, draft_message, final_response
      → retrievalQuery: "reducing token usage"
    
    - "Draft a Slack message saying deployment is delayed"
      → steps: draft_message, final_response
      → retrievalQuery: null
    
    - "Write a friendly message asking Arun to review the PR"
      → steps: draft_message, final_response
      → retrievalQuery: null
    
    - "Tell me a joke"
      → steps: final_response
      → retrievalQuery: null
    `.trim(),

    prompt: state.userMessage,
  });

  const steps = [...new Set([...output.steps, "final_response"])];

  return {
    plan: steps,
    retrievalQuery: output.retrievalQuery,
  };
}

async function retrieveNotesNode(state: MiniAgentStateType) {
  const query =
    state.retryCount > 0
      ? state.userMessage
      : (state.retrievalQuery ?? state.userMessage);
  const sources = await retrieveContext({
    query,
    limit: 3,
    minScore: state.retryCount > 0 ? 0.25 : 0.35,
  });

  if (sources.length === 0) {
    if (state.retryCount === 0) {
      return {
        retryCount: 1,
      };
    }

    return {
      retrievedAnswer: null,
      retrievedSources: [],
      errors: ["No relevant notes found."],
    };
  }

  return {
    retrievedAnswer: sources
      .map((source) => `${source.title}: ${source.content} [${source.id}]`)
      .join("\n\n"),
    retrievedSources: sources,
  };
}

async function draftMessageNode(state: MiniAgentStateType) {
  const context = state.retrievedAnswer
    ? `Retrieved notes:\n${state.retrievedAnswer}`
    : `No retrieved notes were used. Draft directly from the user request.`;

  const { text } = await generateText({
    model: openai("gpt-4.1-mini"),

    system: `
    You draft concise Slack-style messages.
    
    Rules:
    - If retrieved notes are provided, use only those notes as factual context.
    - If no retrieved notes are provided, draft directly from the user's request.
    - If retrieved notes contain citations like [note_4], preserve them in the draft.
    - Do not claim the message was sent.
    - Keep it short and clear.
    - Return only the drafted message.
    `.trim(),

    prompt: `
User request:
${state.userMessage}

${context}

Draft the message.
    `.trim(),
  });

  return {
    draft: text.trim(),
  };
}

async function answerQuestionNode(state: MiniAgentStateType) {
  if (!state.retrievedAnswer) {
    return {
      finalResponse: "I could not find relevant notes to answer that.",
      errors: [
        "Cannot answer question because no relevant notes were retrieved.",
      ],
    };
  }

  const { text } = await generateText({
    model: openai("gpt-4.1-mini"),

    system: `
You answer questions using only the provided retrieved notes.

Rules:
- Use only the retrieved notes.
- Do not add outside knowledge.
- If the notes do not contain enough information, say that.
- Preserve source citations like [note_4].
- Keep the answer concise.
    `.trim(),

    prompt: `
User question:
${state.userMessage}

Retrieved notes:
${state.retrievedAnswer}

Answer the question using only the retrieved notes.
    `.trim(),
  });

  return {
    finalResponse: text.trim(),
  };
}

async function finalResponseNode(state: MiniAgentStateType) {
  if (state.finalResponse) {
    return {
      finalResponse: state.finalResponse,
    };
  }

  if (state.errors.length > 0) {
    return {
      finalResponse: state.errors.join("\n"),
    };
  }

  if (state.draft) {
    return {
      finalResponse: state.draft,
    };
  }

  if (state.retrievedAnswer) {
    return {
      finalResponse: state.retrievedAnswer,
    };
  }

  return {
    finalResponse:
      "This mini agent currently handles note-based retrieval and drafting requests.",
  };
}

export const miniAgentGraph = new StateGraph(MiniAgentState)
  .addNode("planner", plannerNode)
  .addNode("retrieveNotes", retrieveNotesNode)
  .addNode("answerQuestion", answerQuestionNode)
  .addNode("draftMessage", draftMessageNode)
  .addNode("finalize", finalResponseNode)
  .addEdge(START, "planner")
  .addConditionalEdges("planner", routeAfterPlanner, {
    retrieveNotes: "retrieveNotes",
    draftMessage: "draftMessage",
    finalize: "finalize",
  })
  .addConditionalEdges("retrieveNotes", routeAfterRetrieve, {
    retrieveNotes: "retrieveNotes",
    draftMessage: "draftMessage",
    answerQuestion: "answerQuestion",
    finalize: "finalize",
  })
  .addEdge("answerQuestion", "finalize")
  .addEdge("draftMessage", "finalize")
  .addEdge("finalize", END)
  .compile();

export async function runMiniAgent(userMessage: string) {
  return miniAgentGraph.invoke({
    userMessage,
  });
}
