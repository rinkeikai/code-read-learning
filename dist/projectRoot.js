import { resolve } from "node:path";
import { isGitRepository } from "./git.js";
export async function resolveProjectRoot(explicit) {
    if (explicit?.trim()) {
        const projectRoot = resolve(explicit.trim());
        if (!(await isGitRepository(projectRoot))) {
            return {
                requiresProjectSelection: true,
                message: `指定されたパスは Git リポジトリではありません: ${projectRoot}`,
                hint: "開発中のプロジェクトルート（.git があるディレクトリ）を projectRoot に指定してください。",
                detectedCwd: process.cwd(),
                envProjectRoot: process.env.CODE_READ_LEARNING_CWD?.trim(),
            };
        }
        return { projectRoot };
    }
    const envProjectRoot = process.env.CODE_READ_LEARNING_CWD?.trim();
    if (envProjectRoot) {
        const resolvedEnvRoot = resolve(envProjectRoot);
        if (await isGitRepository(resolvedEnvRoot)) {
            return { projectRoot: resolvedEnvRoot };
        }
    }
    const detectedCwd = process.cwd();
    if (await isGitRepository(detectedCwd)) {
        return { projectRoot: detectedCwd };
    }
    return {
        requiresProjectSelection: true,
        message: "学習対象の Git リポジトリが特定できません。projectRoot パラメータで開発リポジトリのパスを指定してください。",
        hint: "MCP のインストール先（code-read-learning）ではなく、実装したプロジェクトのルートを projectRoot に指定してください。",
        detectedCwd,
        envProjectRoot,
    };
}
