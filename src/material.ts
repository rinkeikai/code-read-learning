import {
  extractFilesFromDiff,
  extractFunctionsFromDiff,
} from "./diffParser.js";
import { resolveDiff } from "./git.js";
import {
  getExcludePathsForRoot,
  getGitRootForModule,
  hasMultipleModules,
  listModules,
  resolveModule,
} from "./modules.js";
import { inferRecommendedOrder } from "./order.js";
import { LEARNING_PROMPT } from "./prompt.js";
import type {
  LearningMaterial,
  LearningMaterialOptions,
  ModuleInfo,
  ModuleSelectionRequired,
} from "./types.js";

export type LearningMaterialResult =
  | (LearningMaterial & {
      source: "staged" | "head";
      module: ModuleInfo;
      availableModules: ModuleInfo[];
    })
  | ModuleSelectionRequired;

function buildModuleSelectionRequired(
  modules: ModuleInfo[]
): ModuleSelectionRequired {
  const submoduleNames = modules
    .filter((module) => module.type === "submodule")
    .map((module) => module.id)
    .join(", ");

  return {
    requiresModuleSelection: true,
    availableModules: modules,
    message: `複数のモジュールが見つかりました。module パラメータで対象を指定してください（例: root, ${submoduleNames}）。list_modules ツールで一覧を取得できます。`,
  };
}

export async function buildLearningMaterial(
  projectRoot: string,
  options: LearningMaterialOptions = {}
): Promise<LearningMaterialResult> {
  const modules = await listModules(projectRoot);
  const multipleModules = hasMultipleModules(modules);
  const selectedModule = resolveModule(modules, options.module);

  if (multipleModules && !selectedModule) {
    return buildModuleSelectionRequired(modules);
  }

  const targetModule = selectedModule ?? modules[0];
  const gitRoot = getGitRootForModule(projectRoot, targetModule);
  const excludePaths =
    targetModule.type === "root" ? getExcludePathsForRoot(modules) : [];

  const { diff, source } = await resolveDiff(gitRoot, excludePaths);
  const files = extractFilesFromDiff(diff);
  const { functions, hunks } = extractFunctionsFromDiff(diff);
  const recommendedOrder = inferRecommendedOrder(functions, hunks);

  return {
    files,
    functions,
    diff,
    recommendedOrder,
    learningPrompt: LEARNING_PROMPT,
    source,
    module: targetModule,
    availableModules: modules,
  };
}

export { listModules };
