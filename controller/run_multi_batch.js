#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_DELAY_BETWEEN_ROUNDS_MS = Number(process.env.DELAY_BETWEEN_ROUNDS_MS || 15 * 1000);
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'batches', 'output');
const DEFAULT_TMP_DIR = path.join(__dirname, 'batches', '.tmp');
const SINGLE_BATCH_RUNNER = path.join(__dirname, 'run_batch.js');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function parseArgs(argv) {
  const args = {
    rounds: 3,
    delayMs: DEFAULT_DELAY_BETWEEN_ROUNDS_MS,
    keepTmpFiles: false,
    dryRun: false,
    batchFile: null
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (!token.startsWith('--') && !args.batchFile) {
      args.batchFile = token;
      continue;
    }

    if (token === '--rounds') {
      args.rounds = Number(argv[++i]);
      continue;
    }

    if (token === '--delay-ms') {
      args.delayMs = Number(argv[++i]);
      continue;
    }

    if (token === '--prefix') {
      args.prefix = argv[++i];
      continue;
    }

    if (token === '--keep-tmp-files') {
      args.keepTmpFiles = true;
      continue;
    }

    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.help) {
    if (!args.batchFile) {
      throw new Error('Usage: node run_multi_batch.js <batch-file.json> [--rounds N] [--delay-ms MS] [--prefix BATCH-ID]');
    }

    if (!Number.isInteger(args.rounds) || args.rounds < 1 || args.rounds > 100) {
      throw new Error('--rounds must be an integer between 1 and 100');
    }

    if (!Number.isInteger(args.delayMs) || args.delayMs < 0) {
      throw new Error('--delay-ms must be an integer >= 0');
    }
  }

  return args;
}

function printHelp() {
  console.log('Usage: node run_multi_batch.js <batch-file.json> [--rounds N] [--delay-ms MS] [--prefix BATCH-ID]');
  console.log('');
  console.log('Options:');
  console.log('  --rounds N          Number of sequential single-batch runs (default: 3)');
  console.log(`  --delay-ms MS       Delay between rounds in milliseconds (default: ${DEFAULT_DELAY_BETWEEN_ROUNDS_MS})`);
  console.log('  --prefix BATCH-ID   Override batch ID prefix; each round becomes <prefix>-RUN1..N');
  console.log('  --keep-tmp-files    Keep generated per-round temp batch files');
  console.log('  --dry-run           Print the per-round plan without executing');
}

function loadTemplate(batchFile) {
  const absolutePath = path.resolve(batchFile);
  const payload = readJson(absolutePath);

  if (!payload.batchId || !Array.isArray(payload.tasks) || payload.tasks.length === 0) {
    throw new Error('Batch file must include batchId and non-empty tasks[]');
  }

  return { absolutePath, payload };
}

function buildBaseBatchId(batchId, prefix) {
  const raw = prefix || batchId;
  return raw.replace(/-RUN\d+$/i, '');
}

function createRoundBatchPayload(templatePayload, batchId) {
  return {
    ...templatePayload,
    batchId,
    tasks: templatePayload.tasks.map(task => ({ ...task, batchId }))
  };
}

function runSingleBatch(batchFile, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SINGLE_BATCH_RUNNER, batchFile], {
      cwd: __dirname,
      env,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`run_batch.js exited with code ${code}`));
    });
  });
}

function readRoundSummary(batchId) {
  const summaryPath = path.join(DEFAULT_OUTPUT_DIR, `${batchId}.summary.json`);
  const exportPath = path.join(DEFAULT_OUTPUT_DIR, `${batchId}.export.json`);

  return {
    summaryPath,
    exportPath,
    summary: readJson(summaryPath),
    snapshot: readJson(exportPath)
  };
}

function summarizeTaskTrend(roundIndex, task) {
  return {
    round: roundIndex,
    batchId: task.batchId,
    taskId: task.taskId,
    city: task.city,
    keyword: task.keyword,
    status: task.status,
    total: task.total,
    pushed: task.pushed,
    filtered: task.filtered,
    listCount: task.listCount,
    pagesFetched: task.pagesFetched,
    detailSkippedSeenCount: task.detailSkippedSeenCount,
    detailRequestedCount: task.detailRequestedCount,
    detailSuccessCount: task.detailSuccessCount,
    detailDescriptionNonEmptyCount: task.detailDescriptionNonEmptyCount,
    errorMessage: task.errorMessage
  };
}

function buildAggregateSummary(baseBatchId, templatePath, rounds, delayMs, roundOutputs) {
  const taskTrends = roundOutputs.flatMap(({ round, summary }) =>
    (summary.tasks || []).map(task => summarizeTaskTrend(round, task))
  );

  const totals = taskTrends.reduce((acc, task) => {
    acc.total += task.total || 0;
    acc.pushed += task.pushed || 0;
    acc.filtered += task.filtered || 0;
    acc.detailSkippedSeenCount += task.detailSkippedSeenCount || 0;
    acc.detailRequestedCount += task.detailRequestedCount || 0;
    acc.detailSuccessCount += task.detailSuccessCount || 0;
    return acc;
  }, {
    total: 0,
    pushed: 0,
    filtered: 0,
    detailSkippedSeenCount: 0,
    detailRequestedCount: 0,
    detailSuccessCount: 0
  });

  const pushedPerRound = roundOutputs.map(({ round, summary }) => ({
    round,
    batchId: summary.batchId,
    pushed: (summary.tasks || []).reduce((sum, task) => sum + (task.pushed || 0), 0),
    total: (summary.tasks || []).reduce((sum, task) => sum + (task.total || 0), 0),
    detailSkippedSeenCount: (summary.tasks || []).reduce((sum, task) => sum + (task.detailSkippedSeenCount || 0), 0),
    detailRequestedCount: (summary.tasks || []).reduce((sum, task) => sum + (task.detailRequestedCount || 0), 0)
  }));

  return {
    generatedAt: new Date().toISOString(),
    templatePath,
    baseBatchId,
    rounds,
    delayBetweenRoundsMs: delayMs,
    roundBatchIds: roundOutputs.map(item => item.summary.batchId),
    totals,
    pushedPerRound,
    taskTrends,
    roundOutputs: roundOutputs.map(item => ({
      round: item.round,
      batchId: item.summary.batchId,
      summaryPath: item.summaryPath,
      exportPath: item.exportPath,
      submittedAt: item.summary.submittedAt,
      completedAt: item.summary.completedAt,
      completed: item.summary.completed,
      blocked_retry: item.summary.blocked_retry,
      failed: item.summary.failed,
      timeout: item.summary.timeout
    }))
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const { absolutePath, payload } = loadTemplate(args.batchFile);
  const baseBatchId = buildBaseBatchId(payload.batchId, args.prefix);

  ensureDir(DEFAULT_OUTPUT_DIR);
  ensureDir(DEFAULT_TMP_DIR);

  const plannedRounds = Array.from({ length: args.rounds }, (_, index) => {
    const round = index + 1;
    const batchId = `${baseBatchId}-RUN${round}`;
    const batchFile = path.join(DEFAULT_TMP_DIR, `${batchId}.json`);
    return { round, batchId, batchFile };
  });

  if (args.dryRun) {
    console.log(JSON.stringify({
      templatePath: absolutePath,
      baseBatchId,
      rounds: plannedRounds
    }, null, 2));
    return;
  }

  const roundOutputs = [];
  const childEnv = {
    ...process.env
  };

  for (const plan of plannedRounds) {
    console.log(`[run_multi_batch] Starting round ${plan.round}/${args.rounds}: ${plan.batchId}`);
    writeJson(plan.batchFile, createRoundBatchPayload(payload, plan.batchId));
    await runSingleBatch(plan.batchFile, childEnv);

    const roundResult = readRoundSummary(plan.batchId);
    roundOutputs.push({
      round: plan.round,
      ...roundResult
    });

    if (!args.keepTmpFiles) {
      fs.rmSync(plan.batchFile, { force: true });
    }

    if (plan.round < args.rounds && args.delayMs > 0) {
      console.log(`[run_multi_batch] Waiting ${(args.delayMs / 1000).toFixed(1)}s before next round`);
      await sleep(args.delayMs);
    }
  }

  const aggregate = buildAggregateSummary(
    baseBatchId,
    absolutePath,
    args.rounds,
    args.delayMs,
    roundOutputs
  );

  const aggregatePath = path.join(DEFAULT_OUTPUT_DIR, `${baseBatchId}.multi.summary.json`);
  writeJson(aggregatePath, aggregate);

  console.log(`[run_multi_batch] Aggregate summary written to ${aggregatePath}`);
  console.log(JSON.stringify({
    baseBatchId,
    rounds: args.rounds,
    aggregatePath,
    totals: aggregate.totals
  }, null, 2));
}

main().catch(error => {
  console.error(`[run_multi_batch] ${error.message}`);
  process.exit(1);
});
