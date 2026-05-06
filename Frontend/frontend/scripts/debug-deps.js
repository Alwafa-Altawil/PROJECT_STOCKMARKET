const fs = require("fs");
const path = require("path");
const http = require("http");

const pkgPath = path.join(process.cwd(), "package.json");
const lockPath = path.join(process.cwd(), "package-lock.json");

function getVersion(source, dep) {
  return source?.dependencies?.[dep] || source?.devDependencies?.[dep] || null;
}

async function sendLog(hypothesisId, message, data) {
  // #region agent log
  const payload = JSON.stringify({
    sessionId: "a1224a",
    runId: "deps-pre-fix",
    hypothesisId,
    location: "scripts/debug-deps.js",
    message,
    data,
    timestamp: Date.now(),
  });

  if (typeof fetch === "function") {
    await fetch("http://127.0.0.1:7425/ingest/01297a46-2c99-4dc6-b228-c1defaa70570", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "a1224a",
      },
      body: payload,
    }).catch(() => {});
  } else {
    await new Promise((resolve) => {
      const req = http.request(
        "http://127.0.0.1:7425/ingest/01297a46-2c99-4dc6-b228-c1defaa70570",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "a1224a",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        () => resolve()
      );
      req.on("error", () => resolve());
      req.write(payload);
      req.end();
    });
  }
  // #endregion
}

async function main() {
  await sendLog("H4", "Runtime logger capability", {
    hasFetch: typeof fetch === "function",
    nodeVersion: process.version,
  });

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  const rootPkg = lock?.packages?.[""] || {};

  const info = {
    packageJson: {
      next: getVersion(pkg, "next"),
      react: getVersion(pkg, "react"),
      reactDom: getVersion(pkg, "react-dom"),
      eslintConfigNext: getVersion(pkg, "eslint-config-next"),
    },
    lockRoot: {
      next: getVersion(rootPkg, "next"),
      react: getVersion(rootPkg, "react"),
      reactDom: getVersion(rootPkg, "react-dom"),
      eslintConfigNext: getVersion(rootPkg, "eslint-config-next"),
    },
  };

  await sendLog("H1", "Declared versions snapshot", info);

  const nextMajor = parseInt((info.packageJson.next || "").replace(/[^0-9]/g, "").slice(0, 2) || "0", 10);
  const reactMajor = parseInt((info.packageJson.react || "").replace(/[^0-9]/g, "").slice(0, 2) || "0", 10);
  await sendLog("H2", "Major compatibility check", {
    nextMajor,
    reactMajor,
    mismatchLikely: nextMajor > 0 && reactMajor > 0 && nextMajor < 13 && reactMajor >= 18,
  });

  const hasOldNextToolchain = (info.packageJson.next || "").includes("9.");
  await sendLog("H3", "Old-next + modern eslint config check", {
    hasOldNextToolchain,
    eslintConfigNext: info.packageJson.eslintConfigNext,
    incompatibleLikely: hasOldNextToolchain && !!info.packageJson.eslintConfigNext,
  });
}

main();
