# GenAI Lab

GenAI Lab implements a TypeScript-based GenAI agent workflow with semantic search, Retrieval-Augmented Generation (RAG), MCP tools/resources/prompts, and LangGraph-based orchestration.

The project focuses on the technical mechanics behind controlled GenAI systems: retrieval, grounding, structured planning, graph-based routing, bounded retries, and MCP tool exposure.

## Technical Capabilities

- Embedding-based semantic search over a local knowledge base
- Retrieval-Augmented Generation with source-grounded responses
- Source citation support using note IDs
- LangGraph workflow orchestration with explicit shared state
- Structured LLM planning with constrained execution steps
- Retrieval-query extraction before semantic search
- Conditional graph routing based on planner output and retrieval state
- Decomposed RAG flow: retrieval node followed by answer/draft generation nodes
- Bounded retry path for low/no retrieval results
- Safe fallback behavior for unsupported or ungrounded requests
- MCP server exposing tools, resources, and prompt templates
- AI SDK MCP client flow for LLM-driven MCP tool selection

## System Architecture

### Agent workflow

```text
User request
  → planner node
  → conditional routing
  → retrieve context when needed
  → answer question OR draft message
  → retry/fallback when needed
  → final response
```

### MCP flow

```text
LLM client
  → discovers MCP tools
  → chooses search_notes / answer_from_notes
  → MCP server executes backend logic
  → result returns to LLM
  → final response
```

## Setup

Install dependencies:

```bash
pnpm install
```

This project requires an OpenAI API key.

Create `.env.local`:

```bash
OPENAI_API_KEY=your_openai_api_key
```

## Supported Example Flows

| Flow | Path | What it demonstrates | Example command |
|---|---|---|---|
| Grounded Q&A flow | `planner → retrieve_notes → answer_question → final_response` | Answers using retrieved context and source citations | `pnpm agent "Can you explain why retrieval should happen before generation?"` |
| Retrieval-augmented drafting flow | `planner → retrieve_notes → draft_message → final_response` | Retrieves relevant context before generating a draft | `pnpm agent "Use my notes about token-heavy conversations to write a short team update"` |
| Direct drafting flow | `planner → draft_message → final_response` | Generates a draft without retrieval when no knowledge lookup is needed | `pnpm agent "Draft a Slack message saying QA signoff is pending"` |
| Retrieval-only flow | `planner → retrieve_notes → final_response` | Searches notes and returns grounded matching context | `pnpm agent "Search saved notes for deterministic backend functions"` |
| Fallback flow | `planner → final_response` | Avoids unsupported answers when no tool/knowledge path applies | `pnpm agent "Tell me something funny"` |
| Standalone semantic search | `query → embedding → similarity ranking → notes` | Runs vector similarity search directly | `pnpm semantic-search "backend-defined tools and input schemas"` |
| Standalone RAG flow | `question → retrieve context → generate answer → cite source` | Runs retrieval and answer generation without LangGraph | `pnpm rag "Why do long chats become more expensive?"` |
| MCP tool-selection flow | `LLM → MCP tools → selected tool → tool result → final answer` | Lets the LLM choose MCP-exposed tools | `pnpm mcp:llm "Explain how teams reduce LLM cost in long conversations"` |

## Quick Demo

```bash
pnpm agent "Can you explain why retrieval should happen before generation?"

pnpm agent "Use my notes about token-heavy conversations to write a short team update"

pnpm agent "Draft a Slack message saying QA signoff is pending"

pnpm agent "Search saved notes for deterministic backend functions"

pnpm agent "Tell me something funny"

pnpm semantic-search "backend-defined tools and input schemas"

pnpm rag "Why do long chats become more expensive?"

pnpm mcp:llm "Explain how teams reduce LLM cost in long conversations"
```

## Tech Stack

- TypeScript
- Vercel AI SDK
- OpenAI models via `@ai-sdk/openai`
- LangGraph
- Model Context Protocol TypeScript SDK
- Zod
- pnpm

## Project Structure

```text
lib/
  agent/
    agent-state.ts
    mini-agent.ts
  embedding.ts
  knowledge-base.ts
  retrieve-context.ts
  semantic-search.ts
  rag-answer.ts
  rag-types.ts
  vector-utils.ts

mcp/
  server.ts
  client-test.ts
  llm-client-test.ts

scripts/
  agent.ts
  rag.ts
  semantic-search.ts
```

## Implementation Notes

### 1. Semantic search

The project embeds notes and queries, then ranks notes by vector similarity.

```text
query
→ embedding
→ similarity search
→ ranked notes
```

### 2. RAG

The RAG flow retrieves relevant context before generating an answer.

```text
question
→ retrieve context
→ generate grounded answer
→ include source citation
```

### 3. LangGraph orchestration

The agent workflow uses LangGraph to keep explicit state across nodes.

Example plans:

```text
retrieve_notes → answer_question → final_response
retrieve_notes → draft_message → final_response
draft_message → final_response
final_response
```

### 4. Retrieval-query extraction

The planner extracts a focused retrieval query instead of sending the full user request to semantic search.

Example:

```text
User request:
Use my notes about token-heavy conversations to write a short team update

Retrieval query:
token-heavy conversations
```

### 5. Decomposed RAG

RAG is split into retrieval and generation steps inside the agent workflow.

```text
retrieve context
→ answer or draft from retrieved context
→ final response
```

This keeps retrieval, generation, routing, and fallback behavior visible and independently controllable.

### 6. Conditional routing

The graph routes based on the current state.

```text
if context found and answer requested → answer_question
if context found and draft requested → draft_message
if no context → retry or fallback
```

### 7. Bounded retry

When retrieval fails, the agent retries once with a broader query and lower score threshold.

```text
focused query fails
→ retry with broader query
→ succeed or stop safely
```

### 8. Safe fallback

Unsupported or unrelated requests return a bounded fallback instead of generating unsupported answers from missing context.

Example:

```bash
pnpm agent "Tell me something funny"
```

Expected behavior:

```text
returns a bounded fallback instead of answering from unsupported context
```

## MCP Interface

The MCP server exposes:

| MCP Primitive | Name | Purpose |
|---|---|---|
| Tool | `search_notes` | Search saved notes |
| Tool | `answer_from_notes` | Answer questions from notes |
| Resource | `notes://all` | Read local knowledge base |
| Prompt | `rag_answer_prompt` | Prompt template for grounded answers |

The LangGraph agent and MCP examples are intentionally kept as separate flows in this repo.

- The LangGraph flow demonstrates controlled agent orchestration with state, planning, routing, retrieval, drafting, retries, and fallback behavior.
- The MCP flow demonstrates how the same search/RAG capabilities can be exposed to external MCP clients as tools, resources, and prompts.

In a larger application, these patterns can be combined by having LangGraph nodes call MCP tools for external capabilities such as GitHub, Jira, Slack, or Confluence.

## Knowledge Base

The local knowledge base contains notes about:

- RAG basics
- token cost in chat apps
- workflow routing
- tool calling
- semantic search

The knowledge base is intentionally small so retrieval, ranking, grounding, and routing behavior are easy to inspect.

## Design Scope

Current scope:

- local knowledge base
- embedding-based semantic search
- RAG with source citations
- CLI scripts instead of a web UI
- MCP over stdio
- controlled LangGraph workflow

The focus is on the core mechanics of retrieval, grounding, planning, routing, MCP tool exposure, and bounded agent behavior.

## Next Improvements

- Improve CLI output formatting
- Add clearer docs for LangGraph state and routing
- Add sample output snapshots
- Add basic tests for retrieval and RAG behavior

## TODO

### Short Term

- Add more knowledge-base examples
- Add an eval script for expected retrieval results
- Add safer handling for low-confidence retrieval
- Add structured output for final agent responses

### Future Extensions

- Database-backed vector search
- Chunking for longer documents
- Richer source metadata
- External integrations
- Guardrails and approval workflows
- Observability logs
- Eval suite
