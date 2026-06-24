import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitError } from "./git.js";
import { buildLearningMaterial, listModules } from "./material.js";
import { resolveProjectRoot } from "./projectRoot.js";
const projectRootSchema = z
    .string()
    .optional()
    .describe("学習対象の開発リポジトリルート（.git があるディレクトリ）。MCP のインストール先とは別パスを指定する。例: /home/gs/gsmcu-livekit");
function formatError(error) {
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
        version: "1.2.0",
    });
    server.registerTool("list_modules", {
        description: "学習対象プロジェクト内のモジュール一覧を返す。親リポジトリ（root）と Git サブモジュールを列挙する。projectRoot に開発リポジトリを指定すること。",
        inputSchema: {
            projectRoot: projectRootSchema,
        },
    }, async ({ projectRoot }) => {
        try {
            const resolved = await resolveProjectRoot(projectRoot);
            if ("requiresProjectSelection" in resolved) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(resolved, null, 2),
                        },
                    ],
                };
            }
            const modules = await listModules(resolved.projectRoot);
            const response = {
                modules,
                projectRoot: resolved.projectRoot,
            };
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(response, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: formatError(error) }],
                isError: true,
            };
        }
    });
    server.registerTool("get_learning_material", {
        description: "Git 差分からコード読解学習用の教材を生成する。projectRoot に開発リポジトリを指定すること。ステージ済み変更を優先し、なければ最新コミット (HEAD) を利用する。サブモジュールがある場合は module で対象を指定する。コード解説は行わず、教材データのみ返す。",
        inputSchema: {
            projectRoot: projectRootSchema,
            module: z
                .string()
                .optional()
                .describe("学習対象モジュール。root（親リポジトリ）またはサブモジュール名（例: luna, tokuto）。省略時、サブモジュールが存在すれば選択を要求する。"),
        },
    }, async ({ projectRoot, module }) => {
        try {
            const resolved = await resolveProjectRoot(projectRoot);
            if ("requiresProjectSelection" in resolved) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(resolved, null, 2),
                        },
                    ],
                };
            }
            const material = await buildLearningMaterial(resolved.projectRoot, {
                module,
            });
            if ("requiresModuleSelection" in material) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ ...material, projectRoot: resolved.projectRoot }, null, 2),
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
                    projectRoot: resolved.projectRoot,
                    module: material.module,
                    availableModules: material.availableModules,
                },
            };
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(response, null, 2),
                    },
                    {
                        type: "text",
                        text: material.learningPrompt,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: formatError(error) }],
                isError: true,
            };
        }
    });
    return server;
}
