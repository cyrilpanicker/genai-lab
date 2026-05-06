export type RetrievedContext = {
    id: string;
    title: string;
    content: string;
    tags: string[];
    score: number;
  };
  
  export type RagAnswer = {
    answer: string;
    sources: RetrievedContext[];
  };