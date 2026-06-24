export interface LearningMaterial {
  files: string[];
  functions: string[];
  diff: string;
  recommendedOrder: string[];
  learningPrompt: string;
}

export type DiffSource = "staged" | "head";
