import { Annotation } from "@langchain/langgraph";
import type { RetrievedContext } from "../rag-types";

export const MiniAgentState = Annotation.Root({
  userMessage: Annotation<string>(),

  plan: Annotation<string[]>({
    default: () => [],
    reducer: (_current, update) => update,
  }),

  retrievalQuery: Annotation<string | null>({
    default: () => null,
    reducer: (_current, update) => update,
  }),

  retrievedAnswer: Annotation<string | null>({
    default: () => null,
    reducer: (_current, update) => update,
  }),

  retrievedSources: Annotation<RetrievedContext[]>({
    default: () => [],
    reducer: (_current, update) => update,
  }),

  draft: Annotation<string | null>({
    default: () => null,
    reducer: (_current, update) => update,
  }),

  finalResponse: Annotation<string | null>({
    default: () => null,
    reducer: (_current, update) => update,
  }),

  errors: Annotation<string[]>({
    default: () => [],
    reducer: (current, update) => [...current, ...update],
  }),

  retryCount: Annotation<number>({
    default: () => 0,
    reducer: (_current, update) => update,
  }),
});

export type MiniAgentStateType = typeof MiniAgentState.State;
