import { embedText, embedTexts } from './embedding';
import { knowledgeBase, type KnowledgeNote } from './knowledge-base';
import { cosineSimilarity } from './vector-utils';

export type SemanticSearchResult = {
  note: KnowledgeNote;
  score: number;
};

function noteToSearchText(note: KnowledgeNote) {
  return [
    note.title,
    note.content,
    `Tags: ${note.tags.join(', ')}`,
  ].join('\n');
}

export async function semanticSearchNotes(params: {
  query: string;
  limit?: number;
}): Promise<SemanticSearchResult[]> {
  const limit = params.limit ?? 3;

  const noteTexts = knowledgeBase.map(noteToSearchText);

  const [queryEmbedding, noteEmbeddings] = await Promise.all([
    embedText(params.query),
    embedTexts(noteTexts),
  ]);

  return knowledgeBase
    .map((note, index) => ({
      note,
      score: cosineSimilarity(queryEmbedding, noteEmbeddings[index]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}