import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildLearningMaterial } from "./material.js";
import { GitError } from "./git.js";

function getWorkingDirectory(): string {
  return process.env.CODE_READ_LEARNING_CWD?.trim() || process.cwd();
}

export function createServer() {
  const server = new McpServer({
    name: "code-read-learning",
    version: "1.0.0",
  });

  server.registerTool(
    "get_learning_material",
    {
      description:
        "Git 差分からコード読解学習用の教材を生成する。ステージ済み変更を優先し、なければ最新コミット (HEAD) を利用する。コード解説は行わず、教材データのみ返す。",
      inputSchema: {},
    },
    async () => {
      const cwd = getWorkingDirectory();

      try {
        const material = await buildLearningMaterial(cwd);

        const response = {
          files: material.files,
          functions: material.functions,
          diff: material.diff,
          recommendedOrder: material.recommendedOrder,
          learningPrompt: material.learningPrompt,
          meta: {
            source: material.source,
            workingDirectory: cwd,
          },
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response, null, 2),
            },
            {
              type: "text" as const,
              text: material.learningPrompt,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof GitError
            ? error.message
            : error instanceof Error
              ? `教材の生成に失敗しました: ${error.message}`
              : "教材の生成に失敗しました: 不明なエラー";

        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    }
  );

  return server;
}
