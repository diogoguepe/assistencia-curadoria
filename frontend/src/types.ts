export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  targetAudience: string; // público-alvo
  publicationYear: number;
  synopsis: string;
  price: number;
  pages: number;
  isbn: string;
  tags: string[];
  marketingHooks: string[];
  coverColor: string; // For creating beautiful CSS simulated covers
}

export interface PipelineStep {
  title: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  description: string;
  details?: string;
  durationMs?: number;
}

export interface AnswerResponse {
  answer: string;
  references: Book[];
  pipeline: PipelineStep[];
  responseTimeMs: number;
  booksCount: number;
}
