import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitError } from "./git.js";
import { buildLearningMaterial, listModules } from "./material.js";

function getWorkingDirectory(): string {
  return process.env.CODE_READ_LEARNING_CWD?.trim() || process.cwd();
}

function formatError(error: unknown): string {
  if (error instanceof GitError) {
    return error.message;
  }
  if (error instanceof Error) {
    return `処理に失敗しました: ${error.message}`;
  }
  return "処理に失敗しました: 不明なエラー";
}

export function createServer() {
  const server = new McpServer({
    name: "code-read-learning",
    version: "1.1.0",
  });

  server.registerTool(
    "list_modules",
    {
      description:
        "学習対象プロジェクト内のモジュール一覧を返す。親リポジトリ（root）と Git サブモジュールを列挙する。",
      inputSchema: {},
    },
    async () => {
      const projectRoot = getWorkingDirectory();

      try {
        const modules = await listModules(projectRoot);
        const response = {
          modules,
          workingDirectory: projectRoot,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "get_learning_material",
    {
      description:
        "Git 差分からコード読解学習用の教材を生成する。ステージ済み変更を優先し、なければ最新コミット (HEAD) を利用する。サブモジュールがある場合は module で対象を指定する。コード解説は行わず、教材データのみ返す。",
      inputSchema: {
        module: z
          .string()
          .optional()
          .describe(
            "学習対象モジュール。root（親リポジトリ）またはサブモジュール名（例: luna, tokuto）。省略時、サブモジュールが存在すれば選択を要求する。"
          ),
      },
    },
    async ({ module }) => {
      const projectRoot = getWorkingDirectory();

      try {
        const material = await buildLearningMaterial(projectRoot, { module });

        if ("requiresModuleSelection" in material) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(material, null, 2),
              },
            ],
          };
        }

        const response = {
          files: material.files,
          functions: material.functions,
          diff: material.diff,
          recommendedOrder: material.recommendedOrder,
          learningPrompt: material.learningPrompt,
          meta: {
            source: material.source,
            workingDirectory: projectRoot,
            module: material.module,
            availableModules: material.availableModules,
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
        return {
          content: [{ type: "text" as const, text: formatError(error) }],
          isError: true,
        };
      }
    }
  );

  return server;
}
