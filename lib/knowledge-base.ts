export type KnowledgeNote = {
    id: string;
    title: string;
    content: string;
    tags: string[];
  };
  
  export const knowledgeBase: KnowledgeNote[] = [
    {
      id: 'note_1',
      title: 'RAG basics',
      content:
        'RAG means retrieval-augmented generation. It retrieves relevant context from a knowledge base before generating an answer.',
      tags: ['rag', 'retrieval', 'genai'],
    },
    {
      id: 'note_2',
      title: 'Token cost in chat apps',
      content:
        'Long conversations become more expensive because more input tokens are sent to the model. Production apps reduce cost using summaries, recent-message windows, and retrieval.',
      tags: ['tokens', 'cost', 'memory'],
    },
    {
      id: 'note_3',
      title: 'Workflow router pattern',
      content:
        'A workflow router maps classified user intents to deterministic backend functions. The LLM interprets intent, but backend code executes workflows.',
      tags: ['workflow', 'routing', 'backend'],
    },
    {
      id: 'note_4',
      title: 'Tool calling pattern',
      content:
        'Tool calling lets the model choose from backend-defined tools using descriptions and input schemas. The backend executes the selected tool and returns a structured result.',
      tags: ['tools', 'function-calling', 'ai-sdk'],
    },
    {
      id: 'note_5',
      title: 'Semantic search',
      content:
        'Semantic search uses embeddings to find content with similar meaning, even when the exact keywords are different.',
      tags: ['embeddings', 'semantic-search', 'vector-search'],
    },
  ];