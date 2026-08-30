import fs from "fs";

const runNum = parseInt(process.env.GITHUB_RUN_NUMBER || "15", 10);
// Offset so the 2.1 minor series starts cleanly (run 15 -> 2.1.5, run 16 -> 2.1.6)
const RUN_OFFSET = parseInt(process.env.RUN_OFFSET || "10", 10);
const patch = Math.max(1, runNum - RUN_OFFSET);

try {
  // 1. Update tauri.conf.json
  const tauriConfPath = "./src-tauri/tauri.conf.json";
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
  const parts = (tauriConf.version || "2.1.0").split(".");
  const major = parts[0] || "2";
  const minor = parts[1] || "1";
  const newVersion = `${major}.${minor}.${patch}`;
  tauriConf.version = newVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));

  // 2. Update package.json
  const pkgPath = "./package.json";
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  // 3. Update Cargo.toml
  const cargoPath = "./src-tauri/Cargo.toml";
  let cargo = fs.readFileSync(cargoPath, "utf8");
  cargo = cargo.replace(/^version\s*=\s*"[^"]*"/m, `version = "${newVersion}"`);
  fs.writeFileSync(cargoPath, cargo);

  console.log(`[Version Bump] Successfully bumped release version to ${newVersion}`);
} catch (err) {
  console.error("[Version Bump] Error:", err);
  process.exit(1);
}
