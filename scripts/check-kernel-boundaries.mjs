import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

const repositoryRoot = process.cwd();
const packagesRoot = path.join(repositoryRoot, "packages");
const kernelRoot = path.join(packagesRoot, "kernel");

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? filesBelow(file) : [file];
    }),
  );
  return nested.flat();
}

function packageName(specifier) {
  if (!specifier.startsWith("@")) return specifier.split("/", 1)[0];
  return specifier.split("/", 2).join("/");
}

function isOutside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative.startsWith("..") || path.isAbsolute(relative);
}

const workspaceDirectories = (await readdir(packagesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesRoot, entry.name));
const workspaces = await Promise.all(
  workspaceDirectories.map(async (directory) => ({
    directory,
    manifest: await readJson(path.join(directory, "package.json")),
  })),
);
const workspaceNames = new Set(workspaces.map(({ manifest }) => manifest.name));
const kernelManifest = await readJson(path.join(kernelRoot, "package.json"));
const failures = [];

for (const dependency of Object.keys(kernelManifest.dependencies ?? {})) {
  if (workspaceNames.has(dependency)) {
    failures.push(`kernel package depends on scenario workspace ${dependency}`);
  }
}

const authoritativeWorkspaces = workspaces.filter(
  ({ manifest }) => manifest.name === "@hex-empires/kernel" || manifest.name.startsWith("@hex-empires/scenario-"),
);

let checkedFileCount = 0;
for (const { directory, manifest } of authoritativeWorkspaces) {
  const sourceRoot = path.join(directory, "src");
  const runtimeDependencies = new Set(Object.keys(manifest.dependencies ?? {}));
  const benchmarkDependencies = [...runtimeDependencies].filter((dependency) => dependency.includes("benchmark"));
  for (const dependency of benchmarkDependencies) {
    failures.push(`${manifest.name} depends on benchmark package ${dependency}`);
  }

  const sourceFiles = (await filesBelow(sourceRoot)).filter(
    (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
  );
  checkedFileCount += sourceFiles.length;

  for (const file of sourceFiles) {
    const sourceText = await readFile(file, "utf8");
    const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

    function checkSpecifier(specifier, line) {
      if (specifier.startsWith(".")) {
        const target = path.resolve(path.dirname(file), specifier);
        if (isOutside(sourceRoot, target)) {
          failures.push(`${path.relative(repositoryRoot, file)}:${line} imports outside package source: ${specifier}`);
        }
        return;
      }

      if (specifier.startsWith("node:")) {
        failures.push(`${path.relative(repositoryRoot, file)}:${line} imports forbidden Node authority: ${specifier}`);
        return;
      }
      const dependency = packageName(specifier);
      if (!runtimeDependencies.has(dependency)) {
        failures.push(
          `${path.relative(repositoryRoot, file)}:${line} imports undeclared runtime dependency: ${specifier}`,
        );
      }
    }

    function visit(node) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier !== undefined &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        checkSpecifier(node.moduleSpecifier.text, line);
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] !== undefined
      ) {
        if (ts.isStringLiteral(node.arguments[0])) checkSpecifier(node.arguments[0].text, line);
        else failures.push(`${path.relative(repositoryRoot, file)}:${line} uses a non-literal dynamic import`);
      }
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ((node.expression.text === "Math" && node.name.text === "random") ||
          (node.expression.text === "Date" && node.name.text === "now") ||
          (node.expression.text === "performance" && node.name.text === "now"))
      ) {
        failures.push(
          `${path.relative(repositoryRoot, file)}:${line} reads ambient time or randomness: ${node.getText(source)}`,
        );
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ["fetch", "queueMicrotask", "setImmediate", "setInterval", "setTimeout", "requestAnimationFrame", "require"].includes(node.expression.text)
      ) {
        failures.push(
          `${path.relative(repositoryRoot, file)}:${line} calls forbidden host authority: ${node.expression.text}`,
        );
      }
      if (
        ts.isIdentifier(node) &&
        ["Atomics", "Buffer", "Date", "SharedArrayBuffer", "Worker", "WebSocket", "crypto", "document", "globalThis", "navigator", "performance", "process", "window"].includes(
          node.text,
        )
      ) {
        failures.push(`${path.relative(repositoryRoot, file)}:${line} references forbidden host global: ${node.text}`);
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
  }
}

if (failures.length > 0) {
  console.error(["authority boundary check failed", ...failures.map((failure) => `- ${failure}`)].join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `authority boundary check passed: ${checkedFileCount} production files across ${authoritativeWorkspaces.length} authoritative packages`,
  );
}
