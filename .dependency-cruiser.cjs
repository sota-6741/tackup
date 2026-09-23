const LAYER = "^src/(modules/[^/]+|shared)";
const PACKAGES = [
  "npm",
  "npm-dev",
  "npm-optional",
  "npm-peer",
  "npm-bundled",
  "npm-no-pkg",
  "npm-unknown",
];

/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "domain-depends-on-domain-only",
      comment: "domain は domain 以外に依存しない",
      severity: "error",
      from: { path: `${LAYER}/domain/` },
      to: { path: "^src/", pathNot: `${LAYER}/domain/` },
    },
    {
      name: "domain-no-packages",
      comment: "domain は外部パッケージに依存しない",
      severity: "error",
      from: { path: `${LAYER}/domain/` },
      to: { dependencyTypes: PACKAGES },
    },
    {
      name: "application-depends-on-inner-only",
      comment: "application は domain と application 以外に依存しない",
      severity: "error",
      from: { path: `${LAYER}/application/` },
      to: { path: "^src/", pathNot: `${LAYER}/(domain|application)/` },
    },
    {
      name: "application-no-packages",
      comment: "application は外部パッケージに依存しない",
      severity: "error",
      from: { path: `${LAYER}/application/` },
      to: { dependencyTypes: PACKAGES },
    },
    {
      name: "infrastructure-not-outer",
      comment: "infrastructure は presentation / app / di に依存しない",
      severity: "error",
      from: { path: `${LAYER}/infrastructure/` },
      to: { path: [`${LAYER}/presentation/`, "^src/(app|di)/"] },
    },
    {
      name: "presentation-not-infrastructure",
      comment: "presentation は infrastructure を直接使わず di を経由する",
      severity: "error",
      from: { path: `${LAYER}/presentation/` },
      to: { path: `${LAYER}/infrastructure/` },
    },
    {
      name: "app-via-presentation-or-di",
      comment: "app は presentation か di を経由する",
      severity: "error",
      from: { path: "^src/app/" },
      to: { path: `${LAYER}/(application|infrastructure)/` },
    },
    {
      name: "di-not-presentation",
      comment: "di は presentation / app に依存しない",
      severity: "error",
      from: { path: "^src/di/" },
      to: { path: [`${LAYER}/presentation/`, "^src/app/"] },
    },
    {
      name: "no-testing-code-in-app",
      comment: "本番のコードはテスト用のコード（testing/）を使わない",
      severity: "error",
      from: { path: "^src/", pathNot: "/testing/" },
      to: { path: "/testing/" },
    },
    {
      name: "no-scripts-in-app",
      comment: "本番のコードは開発用のスクリプト（scripts/）を使わない",
      severity: "error",
      from: { path: "^src/" },
      to: { path: "^scripts/" },
    },
    {
      name: "env-in-infrastructure-only",
      comment: "環境変数は infrastructure でのみ読む",
      severity: "error",
      from: { path: `${LAYER}/(domain|application|presentation)/` },
      to: { path: "^src/env\\.ts$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.tsx?$" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
  },
};
