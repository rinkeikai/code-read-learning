import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
export class GitError extends Error {
    constructor(message) {
        super(message);
        this.name = "GitError";
    }
}
async function runGit(args, cwd) {
    try {
        return await execFileAsync("git", args, {
            cwd,
            maxBuffer: 10 * 1024 * 1024,
            encoding: "utf8",
        });
    }
    catch (error) {
        const err = error;
        if (err.code === "ENOENT") {
            throw new GitError("git コマンドが見つかりません。Git がインストールされ、PATH に含まれているか確認してください。");
        }
        const stderr = (err.stderr ?? "").trim();
        const stdout = (err.stdout ?? "").trim();
        const detail = stderr || stdout || err.message;
        if (detail.includes("not a git repository") ||
            detail.includes("fatal: not a git repository")) {
            throw new GitError(`Git リポジトリではありません: ${cwd}\nMCP 設定の cwd を対象リポジトリのルートに指定してください。`);
        }
        throw new GitError(`git ${args.join(" ")} の実行に失敗しました: ${detail}`);
    }
}
function buildPathspecArgs(excludePaths) {
    const args = ["."];
    for (const excludePath of excludePaths) {
        args.push(`:(exclude)${excludePath}`);
    }
    return args;
}
export async function isGitRepository(cwd) {
    try {
        await runGit(["rev-parse", "--is-inside-work-tree"], cwd);
        return true;
    }
    catch (error) {
        if (error instanceof GitError) {
            return false;
        }
        throw error;
    }
}
export async function getStagedDiff(cwd, excludePaths = []) {
    const args = ["diff", "--staged", "--", ...buildPathspecArgs(excludePaths)];
    const { stdout } = await runGit(args, cwd);
    return stdout;
}
export async function getHeadDiff(cwd, excludePaths = []) {
    const args = [
        "show",
        "HEAD",
        "--format=",
        "--patch",
        "--",
        ...buildPathspecArgs(excludePaths),
    ];
    const { stdout } = await runGit(args, cwd);
    return stdout;
}
export async function resolveDiff(cwd, excludePaths = []) {
    const isRepo = await isGitRepository(cwd);
    if (!isRepo) {
        throw new GitError(`Git リポジトリではありません: ${cwd}\nMCP 設定の cwd を対象リポジトリのルートに指定してください。`);
    }
    const stagedDiff = await getStagedDiff(cwd, excludePaths);
    if (stagedDiff.trim().length > 0) {
        return { diff: stagedDiff, source: "staged" };
    }
    try {
        const headDiff = await getHeadDiff(cwd, excludePaths);
        if (headDiff.trim().length > 0) {
            return { diff: headDiff, source: "head" };
        }
    }
    catch (error) {
        if (error instanceof GitError && error.message.includes("bad revision")) {
            throw new GitError("ステージ済みの変更も最新コミットも見つかりません。変更をステージするか、コミットを作成してください。");
        }
        throw error;
    }
    throw new GitError("学習対象の差分がありません。git add でステージするか、コミットを作成してください。");
}
