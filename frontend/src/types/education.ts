export interface EducationalContext {
  concept: string;
  what_happened: string;
  why_it_matters: string;
  attacker_could_learn: string;
  how_to_protect: string;
}

export interface LearningStep {
  title: string;
  body: string;
}

export interface KnowledgeCheck {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface LearningModule {
  id: string;
  title: string;
  duration_minutes: number;
  summary: string;
  objectives: string[];
  steps: LearningStep[];
  check: KnowledgeCheck;
}
