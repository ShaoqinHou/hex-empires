import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import ts from "typescript";

const repositoryRoot = process.cwd();
const packagesRoot = path.join(repositoryRoot, "packages");
const kernelRoot = path.join(packagesRoot, "kernel");
const kernelSourceRoot = path.join(kernelRoot, "src");

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
const workspacePackages = await Promise.all(
  workspaceDirectories.map((directory) => readJson(path.join(directory, "package.json"))),
);
const workspaceNames = new Set(workspacePackages.map((manifest) => manifest.name));
const kernelManifest = await readJson(path.join(kernelRoot, "package.json"));
const runtimeDependencies = new Set(Object.keys(kernelManifest.dependencies ?? {}));
const failures = [];

for (const dependency of runtimeDependencies) {
  if (workspaceNames.has(dependency)) {
    failures.push(`kernel package depends on scenario workspace ${dependency}`);
  }
}

const sourceFiles = (await filesBelow(kernelSourceRoot)).filter(
  (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
);

for (const file of sourceFiles) {
  const sourceText = await readFile(file, "utf8");
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

  function checkSpecifier(specifier, line) {
    if (specifier.startsWith(".")) {
      const target = path.resolve(path.dirname(file), specifier);
      if (isOutside(kernelSourceRoot, target)) {
        failures.push(`${path.relative(repositoryRoot, file)}:${line} imports outside kernel source: ${specifier}`);
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
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      checkSpecifier(node.arguments[0].text, line);
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
      ["fetch", "setInterval", "setTimeout", "requestAnimationFrame", "require"].includes(node.expression.text)
    ) {
      failures.push(
        `${path.relative(repositoryRoot, file)}:${line} calls forbidden host authority: ${node.expression.text}`,
      );
    }
    if (
      ts.isIdentifier(node) &&
      ["Date", "performance", "document", "window", "navigator", "process", "Buffer", "WebSocket", "Worker"].includes(
        node.text,
      )
    ) {
      failures.push(`${path.relative(repositoryRoot, file)}:${line} references forbidden host global: ${node.text}`);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
}

if (failures.length > 0) {
  console.error(["kernel boundary check failed", ...failures.map((failure) => `- ${failure}`)].join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `kernel boundary check passed: ${sourceFiles.length} production files, no scenario dependencies or host authority`,
  );
}
