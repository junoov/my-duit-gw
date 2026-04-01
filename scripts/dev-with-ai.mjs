import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const aiPort = Number(process.env.AI_SERVER_PORT || 8787);
const viteScriptName = process.env.DEV_VITE_SCRIPT || "dev:lan";

function spawnNpmScript(scriptName) {
  if (isWindows) {
    return spawn("cmd.exe", ["/d", "/s", "/c", `npm run ${scriptName}`], {
      stdio: "inherit",
      env: process.env
    });
  }

  return spawn("npm", ["run", scriptName], {
    stdio: "inherit",
    env: process.env
  });
}

async function isAiServerRunning() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 800);

  try {
    const response = await fetch(`http://localhost:${aiPort}/api/health`, {
      method: "GET",
      signal: controller.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

const hasExternalAiServer = await isAiServerRunning();
const aiProcess = hasExternalAiServer ? null : spawnNpmScript("ai:server");
const devProcess = spawnNpmScript(viteScriptName);

if (hasExternalAiServer) {
  console.log(`[dev:ai] menggunakan AI server yang sudah aktif di port ${aiPort}`);
}

if (aiProcess) {
  aiProcess.on("error", (error) => {
    console.error("[dev:ai] gagal menjalankan ai:server", error);
  });
}

devProcess.on("error", (error) => {
  console.error(`[dev:ai] gagal menjalankan ${viteScriptName}`, error);
});

const shutdown = () => {
  if (aiProcess && !aiProcess.killed) {
    aiProcess.kill("SIGINT");
  }
  if (!devProcess.killed) {
    devProcess.kill("SIGINT");
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (aiProcess) {
  aiProcess.on("exit", (code) => {
    if (code !== 0) {
      console.error(`[dev:ai] ai server exited with code ${code}`);
      console.error("[dev:ai] Vite tetap berjalan. Cek port AI / konfigurasi jika butuh fitur AI.");
    }
  });
}

devProcess.on("exit", (code) => {
  if (code !== 0) {
    console.error(`[dev:ai] ${viteScriptName} exited with code ${code}`);
  }
  if (aiProcess && !aiProcess.killed) {
    aiProcess.kill("SIGINT");
  }
});
