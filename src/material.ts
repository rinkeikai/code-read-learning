import {
  extractFilesFromDiff,
  extractFunctionsFromDiff,
} from "./diffParser.js";
import { resolveDiff } from "./git.js";
import { inferRecommendedOrder } from "./order.js";
import { LEARNING_PROMPT } from "./prompt.js";
import type { LearningMaterial } from "./types.js";

export async function buildLearningMaterial(
  cwd: string
): Promise<LearningMaterial & { source: "staged" | "head" }> {
  const { diff, source } = await resolveDiff(cwd);
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
  };
}
