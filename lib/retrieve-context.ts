import type { RetrievedContext } from './rag-types';
import { semanticSearchNotes } from './semantic-search';

export async function retrieveContext(params: {
  query: string;
  limit?: number;
  minScore?: number;
}): Promise<RetrievedContext[]> {
  const results = await semanticSearchNotes({
    query: params.query,
    limit: params.limit ?? 3,
  });

  const minScore = params.minScore ?? 0;

  return results
    .filter((result) => result.score >= minScore)
    .map((result) => ({
      id: result.note.id,
      title: result.note.title,
      content: result.note.content,
      tags: result.note.tags,
      score: result.score,
    }));
}