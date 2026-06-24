function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildCallPattern(functionName) {
    const bareName = functionName.startsWith("#")
        ? functionName.slice(1)
        : functionName;
    const escaped = escapeRegExp(bareName);
    if (functionName.startsWith("#")) {
        return new RegExp(`(?:this\\.)?#${escaped}\\s*\\(`, "g");
    }
    return new RegExp(`\\b${escaped}\\s*\\(`, "g");
}
export function inferRecommendedOrder(functions, hunks) {
    if (functions.length <= 1) {
        return [...functions];
    }
    const hunkMap = new Map();
    for (const hunk of hunks) {
        const existing = hunkMap.get(hunk.name) ?? [];
        existing.push(...hunk.lines);
        hunkMap.set(hunk.name, existing);
    }
    const dependencies = new Map();
    for (const fn of functions) {
        dependencies.set(fn, new Set());
    }
    for (const fn of functions) {
        const lines = hunkMap.get(fn) ?? [];
        const body = lines.join("\n");
        for (const other of functions) {
            if (other === fn) {
                continue;
            }
            const pattern = buildCallPattern(other);
            if (pattern.test(body)) {
                dependencies.get(fn)?.add(other);
            }
        }
    }
    const ordered = [];
    const visited = new Set();
    const visiting = new Set();
    const visit = (fn) => {
        if (visited.has(fn)) {
            return;
        }
        if (visiting.has(fn)) {
            return;
        }
        visiting.add(fn);
        const deps = dependencies.get(fn) ?? new Set();
        for (const dep of deps) {
            if (functions.includes(dep)) {
                visit(dep);
            }
        }
        visiting.delete(fn);
        visited.add(fn);
        ordered.push(fn);
    };
    for (const fn of functions) {
        visit(fn);
    }
    if (ordered.length === functions.length) {
        const hasInferredEdges = [...dependencies.values()].some((deps) => deps.size > 0);
        if (hasInferredEdges) {
            return ordered;
        }
    }
    return [...functions];
}
