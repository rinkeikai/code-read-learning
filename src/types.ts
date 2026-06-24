export interface LearningMaterial {
  files: string[];
  functions: string[];
  diff: string;
  recommendedOrder: string[];
  learningPrompt: string;
}

export type DiffSource = "staged" | "head";

export type ModuleType = "root" | "submodule";

export interface ModuleInfo {
  id: string;
  name: string;
  path: string;
  type: ModuleType;
}

export interface LearningMaterialOptions {
  module?: string;
}

export interface ProjectSelectionRequired {
  requiresProjectSelection: true;
  message: string;
  hint: string;
  detectedCwd: string;
  envProjectRoot?: string;
}

export interface ModuleSelectionRequired {
  requiresModuleSelection: true;
  availableModules: ModuleInfo[];
  message: string;
}
