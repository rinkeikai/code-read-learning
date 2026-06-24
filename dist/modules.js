import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isGitRepository } from "./git.js";
const GITMODULES_PATH_RE = /^\s*path\s*=\s*(.+)\s*$/;
async function readSubmodulePaths(projectRoot) {
    try {
        const content = await readFile(join(projectRoot, ".gitmodules"), "utf8");
        const paths = [];
        for (const line of content.split("\n")) {
            const match = line.match(GITMODULES_PATH_RE);
            if (match) {
                paths.push(match[1].trim());
            }
        }
        return paths;
    }
    catch {
        return [];
    }
}
function toModuleId(path) {
    return path === "." ? "root" : path.replace(/\\/g, "/");
}
function toDisplayName(path) {
    return path === "." ? "ルート（親リポジトリ）" : path;
}
export async function listModules(projectRoot) {
    const submodulePaths = await readSubmodulePaths(projectRoot);
    const modules = [
        {
            id: "root",
            name: toDisplayName("."),
            path: ".",
            type: "root",
        },
    ];
    for (const submodulePath of submodulePaths) {
        const submoduleRoot = join(projectRoot, submodulePath);
        if (await isGitRepository(submoduleRoot)) {
            modules.push({
                id: toModuleId(submodulePath),
                name: toDisplayName(submodulePath),
                path: submodulePath.replace(/\\/g, "/"),
                type: "submodule",
            });
        }
    }
    return modules;
}
export function hasMultipleModules(modules) {
    return modules.some((module) => module.type === "submodule");
}
export function resolveModule(modules, moduleId) {
    if (!moduleId || moduleId.trim().length === 0) {
        return null;
    }
    const normalized = moduleId.trim().replace(/\\/g, "/");
    const aliases = new Set([normalized, normalized.replace(/^\.\//, "")]);
    if (aliases.has("root") || aliases.has(".")) {
        return modules.find((module) => module.type === "root") ?? null;
    }
    return (modules.find((module) => aliases.has(module.id) ||
        aliases.has(module.path) ||
        aliases.has(module.name)) ?? null);
}
export function getGitRootForModule(projectRoot, module) {
    if (module.type === "root") {
        return projectRoot;
    }
    return join(projectRoot, module.path);
}
export function getExcludePathsForRoot(modules) {
    return modules
        .filter((module) => module.type === "submodule")
        .map((module) => module.path);
}
