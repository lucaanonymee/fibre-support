const path = require("path");
const { spawn } = require("child_process");

const AI_SCRIPT_PATH = path.join(__dirname, "..", "ai", "src", "predict_api.py");
const BACKEND_ROOT = path.join(__dirname, "..");

const toTimeoutMs = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const PYTHON_CANDIDATES = process.env.PYTHON_BIN
  ? [process.env.PYTHON_BIN]
  : process.platform === "win32"
    ? ["python", "py"]
    : ["python3", "python"];

const EXECUTION_TIMEOUT_MS = toTimeoutMs(process.env.AI_PYTHON_TIMEOUT_MS, 30000);
const WARMUP_TIMEOUT_MS = toTimeoutMs(
  process.env.AI_PYTHON_WARMUP_TIMEOUT_MS,
  Math.max(EXECUTION_TIMEOUT_MS * 2, 60000),
);

const runWithInterpreter = (interpreter, payload, timeoutMs = EXECUTION_TIMEOUT_MS) =>
  new Promise((resolve, reject) => {
    const child = spawn(interpreter, [AI_SCRIPT_PATH], {
      cwd: BACKEND_ROOT,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let timeoutHandle = null;
    let didTimeout = false;

    if (timeoutMs > 0) {
      timeoutHandle = setTimeout(() => {
        didTimeout = true;
        child.kill();
        reject(new Error(`AI prediction timed out after ${timeoutMs}ms with interpreter '${interpreter}'`));
      }, timeoutMs);
    }

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      reject(error);
    });

    child.on("close", (code) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (didTimeout) {
        return;
      }

      if (code !== 0) {
        const errorText = stderr.trim() || `Python process exited with code ${code}`;
        reject(new Error(errorText));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (parseError) {
        reject(new Error(`Invalid JSON received from AI module: ${stdout.trim()}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });

const shouldTryAnotherInterpreter = (error) => {
  const message = (error?.message || "").toLowerCase();
  return (
    message.includes("enoent")
    || message.includes("command not found")
    || message.includes("not recognized as an internal or external command")
    || message.includes("timed out")
  );
};

const runPythonPrediction = async (payload, options = {}) => {
  const timeoutMs = toTimeoutMs(options.timeoutMs, EXECUTION_TIMEOUT_MS);
  let lastError = null;

  for (const interpreter of PYTHON_CANDIDATES) {
    try {
      return await runWithInterpreter(interpreter, payload, timeoutMs);
    } catch (error) {
      lastError = error;
      if (!shouldTryAnotherInterpreter(error)) {
        break;
      }
    }
  }

  throw new Error(lastError?.message || "Unable to run AI prediction module");
};

let warmupPromise = null;

const warmupPythonPrediction = () => {
  if (warmupPromise) {
    return warmupPromise;
  }

  const warmupPayload = {
    typeProbleme: "COUPURE_TOTALE",
    nbTicketsOuverts_admin: 0,
    creationDate: new Date().toISOString(),
  };

  warmupPromise = runPythonPrediction(warmupPayload, { timeoutMs: WARMUP_TIMEOUT_MS })
    .then(() => {
      console.log(`IA warm-up termine (${WARMUP_TIMEOUT_MS}ms max)`);
      return true;
    })
    .catch((error) => {
      console.warn(`IA warm-up indisponible: ${error.message}`);
      return false;
    });

  return warmupPromise;
};

module.exports = {
  runPythonPrediction,
  warmupPythonPrediction,
};
