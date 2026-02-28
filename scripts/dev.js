#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { createServer, createLogger } from "vite";
import cac from "cac";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// VDF Parser & Path Finding
// ============================================================================

function parseVDF(content) {
  const result = {};
  const stack = [result];
  const keyValueRegex = /^\s*"([^"]+)"\s*"([^"]*)"/;
  const keyStartRegex = /^\s*"([^"]+)"\s*$/;

  let currentKey = null;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("//")) continue;

    if (trimmed === "{") {
      if (currentKey !== null) {
        const newObj = {};
        stack[stack.length - 1][currentKey] = newObj;
        stack.push(newObj);
        currentKey = null;
      }
      continue;
    }

    if (trimmed === "}") {
      stack.pop();
      currentKey = null;
      continue;
    }

    const kvMatch = line.match(keyValueRegex);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      stack[stack.length - 1][key] = value;
      continue;
    }

    const keyMatch = line.match(keyStartRegex);
    if (keyMatch) {
      currentKey = keyMatch[1];
    }
  }

  return result;
}

function getSteamLibraryFolders() {
  const paths = [];
  const steamConfigPath = join(
    homedir(),
    "Library",
    "Application Support",
    "Steam",
    "config",
    "libraryfolders.vdf"
  );

  if (!existsSync(steamConfigPath)) return paths;

  try {
    const content = readFileSync(steamConfigPath, "utf8");
    const parsed = parseVDF(content);
    const libraryFolders = parsed.libraryfolders;

    if (!libraryFolders) return paths;

    for (const key of Object.keys(libraryFolders)) {
      if (!isNaN(Number(key))) {
        const folder = libraryFolders[key];
        if (folder && folder.path) paths.push(folder.path);
      }
    }
  } catch {
    // Silently fail
  }

  return paths;
}

function findRMMZPath(libraryFolders) {
  const appId = "1059510";
  const possibleNames = ["RPG Maker MZ", "RPGMakerMZ"];

  for (const libraryPath of libraryFolders) {
    for (const name of possibleNames) {
      const commonPath = join(libraryPath, "steamapps", "common", name);
      if (existsSync(commonPath)) return commonPath;
    }

    const manifestPath = join(libraryPath, "steamapps", `appmanifest_${appId}.acf`);
    if (existsSync(manifestPath)) {
      try {
        const content = readFileSync(manifestPath, "utf8");
        const parsed = parseVDF(content);
        const installDir = parsed?.AppState?.installdir;
        if (installDir) {
          const gamePath = join(libraryPath, "steamapps", "common", installDir);
          if (existsSync(gamePath)) return gamePath;
        }
      } catch {
        // Continue
      }
    }
  }

  return null;
}

function findNWJS(rmmzPath) {
  if (!rmmzPath) return null;

  const possiblePaths = [
    "RPGMZ.app/Contents/Resources/nwjs-mac/nwjs.app/Contents/MacOS/nwjs",
    "RPG Maker MZ.app/Contents/Resources/nwjs-mac/nwjs.app/Contents/MacOS/nwjs",
    "nwjs-mac/nwjs.app/Contents/MacOS/nwjs",
    "nwjs/nwjs.app/Contents/MacOS/nwjs",
  ];

  for (const relativePath of possiblePaths) {
    const fullPath = join(rmmzPath, relativePath);
    if (existsSync(fullPath)) return fullPath;
  }

  return null;
}

function getNWJSPath() {
  if (process.env.RMMZ_NW_PATH && existsSync(process.env.RMMZ_NW_PATH)) {
    return process.env.RMMZ_NW_PATH;
  }

  const libraryFolders = getSteamLibraryFolders();
  const rmmzPath = findRMMZPath(libraryFolders);
  return findNWJS(rmmzPath);
}

function getProjectPath(customPath = null) {
  if (customPath && existsSync(customPath)) return customPath;

  const defaultPath = join(__dirname, "..", "project");
  if (existsSync(defaultPath)) return defaultPath;

  return null;
}

// ============================================================================
// Command Functions
// ============================================================================

function commandFind() {
  console.log("Searching for RPG Maker MZ...");

  const libraryFolders = getSteamLibraryFolders();
  if (libraryFolders.length === 0) {
    console.error("No Steam library folders found.");
    process.exit(1);
  }

  const rmmzPath = findRMMZPath(libraryFolders);
  if (!rmmzPath) {
    console.error("RPG Maker MZ not found in Steam libraries.");
    process.exit(1);
  }

  const nwjsPath = findNWJS(rmmzPath);
  if (!nwjsPath) {
    console.error("nwjs executable not found within RMMZ.");
    process.exit(1);
  }

  console.log("\n✅ Found nwjs at:");
  console.log(nwjsPath);
  console.log("\n📝 Environment variable:");
  console.log(`RMMZ_NW_PATH="${nwjsPath}"`);
}

function commandGame(options) {
  const nwjsPath = getNWJSPath();
  if (!nwjsPath) {
    console.error("Could not find nwjs executable.");
    process.exit(1);
  }

  const projectPath = getProjectPath(options.projectPath);
  if (!projectPath) {
    console.error("Project path not found.");
    process.exit(1);
  }

  console.log("Launching game...");
  console.log("  nwjs:", nwjsPath);
  console.log("  project:", projectPath);
  console.log();

  const child = spawn(nwjsPath, [projectPath], {
    stdio: "inherit",
  });

  child.on("error", (err) => {
    console.error("Failed to start process:", err);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

async function commandDev(options) {
  const nwjsPath = getNWJSPath();
  if (!nwjsPath) {
    console.error("Could not find nwjs executable.");
    process.exit(1);
  }

  const projectPath = getProjectPath(options.projectPath);
  if (!projectPath) {
    console.error("Project path not found.");
    process.exit(1);
  }

  let gameProcess = null;

  // Create prefixed logger for Vite
  const createPrefixedLogger = (prefix) => {
    const logger = createLogger();
    const prefixOutput = (fn) => (msg, ...args) => {
      const lines = msg.split("\n").filter(Boolean);
      for (const line of lines) {
        fn(`[${prefix}] ${line}`, ...args);
      }
    };
    return {
      ...logger,
      info: prefixOutput(logger.info),
      warn: prefixOutput(logger.warn),
      error: prefixOutput(logger.error),
    };
  };

  // Start Vite dev server with JavaScript API
  console.log("[vite] Starting...");
  const viteServer = await createServer({
    root: join(__dirname, ".."),
    customLogger: createPrefixedLogger("vite"),
  });

  await viteServer.listen();

  // Launch game after Vite is ready
  setTimeout(() => {
    console.log("[game] Starting...");
    gameProcess = spawn(nwjsPath, [projectPath], {
      cwd: join(__dirname, ".."),
      stdio: "pipe",
    });

    const prefixOutput = (prefix, fn) => (data) => {
      const lines = data.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        fn(`[${prefix}] ${line}`);
      }
    };

    gameProcess.stdout?.on("data", prefixOutput("game", console.log));
    gameProcess.stderr?.on("data", prefixOutput("game", console.error));

    gameProcess.on("error", (err) => {
      console.error("[game] Failed to start:", err);
    });

    gameProcess.on("exit", async (code) => {
      console.log(`[game] Exited with code ${code}`);
      await viteServer.close();
      process.exit(code ?? 0);
    });
  }, 1000);

  // Handle shutdown signals
  const shutdown = async () => {
    console.log("\nShutting down...");
    if (gameProcess && !gameProcess.killed) {
      gameProcess.kill("SIGTERM");
      setTimeout(() => {
        if (!gameProcess.killed) gameProcess.kill("SIGKILL");
      }, 2000);
    }
    await viteServer.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// ============================================================================
// Setup CLI with cac
// ============================================================================

const cli = cac("rmmz-dev");

cli
  .command("[project-path]", "Start Vite dev server + game (default)")
  .action(async (projectPath) => {
    await commandDev({ projectPath });
  });

cli
  .command("dev [project-path]", "Start Vite dev server + game")
  .action(async (projectPath) => {
    await commandDev({ projectPath });
  });

cli
  .command("game [project-path]", "Start only the game")
  .action((projectPath) => {
    commandGame({ projectPath });
  });

cli
  .command("find", "Find and display nwjs path")
  .action(() => {
    commandFind();
  });

cli.help();
cli.parse();
