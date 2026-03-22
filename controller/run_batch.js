#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_CONTROLLER_URL = process.env.CONTROLLER_URL || 'http://127.0.0.1:7893';
const DEFAULT_POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 30 * 1000);
const DEFAULT_TASK_TIMEOUT_MS = Number(process.env.TASK_TIMEOUT_MS || 10 * 60 * 1000);
const DEFAULT_BATCH_TIMEOUT_MS = Number(process.env.BATCH_TIMEOUT_MS || 30 * 60 * 1000);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadBatchFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  if (!payload.batchId || !Array.isArray(payload.tasks) || payload.tasks.length === 0) {
    throw new Error('Batch file must include batchId and non-empty tasks[]');
  }
  return { absolutePath, payload };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text}`);
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function enqueueTasks(controllerUrl, batchId, tasks, batchDeliveryTarget = null) {
  const submitted = [];

  for (const task of tasks) {
    const payload = {
      city: task.city,
      keyword: task.keyword,
      priority: task.priority || 'normal',
      source: task.source || 'openclaw',
      batchId,
      codeVersion: task.codeVersion || null,
      pipelineVersion: task.pipelineVersion || null
    };
    const resolvedDeliveryTarget = task.deliveryTarget || batchDeliveryTarget || null;
    if (resolvedDeliveryTarget) {
      payload.deliveryTarget = resolvedDeliveryTarget;
    }
    const data = await requestJson(`${controllerUrl}/enqueue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    submitted.push({
      city: payload.city,
      keyword: payload.keyword,
      priority: payload.priority,
      source: payload.source,
      batchId: payload.batchId,
      deliveryTarget: resolvedDeliveryTarget,
      taskId: data.taskId,
      enqueuedAt: Date.now(),
      terminalStatus: null,
      finalResult: null,
      enqueueError: null
    });
  }

  return submitted;
}

function isTerminalStatus(status) {
  return ['completed', 'blocked_retry', 'failed', 'timeout'].includes(status);
}

async function pollBatch(controllerUrl, tasks, options) {
  const startedAt = Date.now();
  const byTaskId = new Map(tasks.map(task => [task.taskId, task]));

  while (true) {
    const now = Date.now();
    const elapsed = now - startedAt;
    const batchTimedOut = elapsed >= options.batchTimeoutMs;
    const queue = await requestJson(`${controllerUrl}/queue`);

    for (const queueTask of queue) {
      const tracked = byTaskId.get(queueTask.id);
      if (!tracked || isTerminalStatus(tracked.terminalStatus)) {
        continue;
      }

      const taskTimedOut = now - tracked.enqueuedAt >= options.taskTimeoutMs;
      if (batchTimedOut || taskTimedOut) {
        tracked.terminalStatus = 'timeout';
        tracked.finalState = queueTask.status;
        tracked.finalResult = queueTask.result || tracked.finalResult;
        tracked.lastObservedAt = now;
        continue;
      }

      tracked.finalState = queueTask.status;
      tracked.finalResult = queueTask.result || tracked.finalResult;
      tracked.lastObservedAt = now;
      if (['completed', 'blocked_retry', 'failed'].includes(queueTask.status)) {
        tracked.terminalStatus = queueTask.status;
      }
    }

    const allDone = tasks.every(task => isTerminalStatus(task.terminalStatus));
    if (allDone || batchTimedOut) {
      if (batchTimedOut) {
        for (const task of tasks) {
          if (!isTerminalStatus(task.terminalStatus)) {
            task.terminalStatus = 'timeout';
            task.lastObservedAt = now;
          }
        }
      }
      return { startedAt, finishedAt: Date.now(), batchTimedOut };
    }

    await sleep(options.pollIntervalMs);
  }
}

async function collectSnapshot(controllerUrl) {
  try {
    return await requestJson(`${controllerUrl}/export`);
  } catch (error) {
    return {
      exportedAt: new Date().toISOString(),
      exportError: error.message
    };
  }
}

function buildSummary(batchId, controllerUrl, tasks, execution, snapshotPath, batchDeliveryTarget = null) {
  const counters = {
    completed: 0,
    blocked_retry: 0,
    failed: 0,
    timeout: 0
  };

  for (const task of tasks) {
    const status = task.terminalStatus || 'timeout';
    counters[status] = (counters[status] || 0) + 1;
  }

  return {
    batchId,
    controllerUrl,
    batchDeliveryTarget,
    submittedAt: new Date(execution.startedAt).toISOString(),
    completedAt: new Date(execution.finishedAt).toISOString(),
    submitted: tasks.length,
    completed: counters.completed,
    blocked_retry: counters.blocked_retry,
    failed: counters.failed,
    timeout: counters.timeout,
    snapshotPath,
    taskIds: tasks.map(task => task.taskId),
    tasks: tasks.map(task => ({
      taskId: task.taskId,
      city: task.city,
      keyword: task.keyword,
      priority: task.priority,
      source: task.source,
      batchId: task.batchId,
      deliveryTarget: task.deliveryTarget || null,
      codeVersion: task.finalResult?.codeVersion || null,
      pipelineVersion: task.finalResult?.pipelineVersion || null,
      status: task.terminalStatus,
      lastObservedState: task.finalState || null,
      total: task.finalResult?.total || 0,
      pushed: task.finalResult?.pushed || 0,
      filtered: task.finalResult?.filtered || 0,
      listCount: task.finalResult?.listCount || 0,
      pagesFetched: task.finalResult?.pagesFetched || 0,
      missingEncryptJobIdCount: task.finalResult?.missingEncryptJobIdCount || 0,
      detailSkippedSeenCount: task.finalResult?.detailSkippedSeenCount || 0,
      detailRequestedCount: task.finalResult?.detailRequestedCount || 0,
      detailSuccessCount: task.finalResult?.detailSuccessCount || 0,
      detailDescriptionNonEmptyCount: task.finalResult?.detailDescriptionNonEmptyCount || 0,
      filterReasonStats: task.finalResult?.filterReasonStats || null,
      errorCode: task.finalResult?.errorCode || null,
      errorMessage: task.finalResult?.errorMessage || task.enqueueError || null,
      enqueuedAt: new Date(task.enqueuedAt).toISOString(),
      lastObservedAt: task.lastObservedAt ? new Date(task.lastObservedAt).toISOString() : null
    })),
    pollIntervalSeconds: DEFAULT_POLL_INTERVAL_MS / 1000,
    taskTimeoutSeconds: DEFAULT_TASK_TIMEOUT_MS / 1000,
    batchTimeoutSeconds: DEFAULT_BATCH_TIMEOUT_MS / 1000,
    batchTimedOut: execution.batchTimedOut
  };
}

async function main() {
  const batchFile = process.argv[2];
  if (!batchFile) {
    console.error('Usage: node run_batch.js <batch-file.json>');
    process.exit(1);
  }

  const { absolutePath, payload } = loadBatchFile(batchFile);
  const outputDir = path.join(__dirname, 'batches', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`[run_batch] Batch file: ${absolutePath}`);
  console.log(`[run_batch] Controller: ${DEFAULT_CONTROLLER_URL}`);
  console.log(`[run_batch] Batch ID: ${payload.batchId}`);

  const tasks = await enqueueTasks(DEFAULT_CONTROLLER_URL, payload.batchId, payload.tasks, payload.deliveryTarget || null);
  console.log(`[run_batch] Submitted ${tasks.length} tasks: ${tasks.map(task => task.taskId).join(', ')}`);

  const execution = await pollBatch(DEFAULT_CONTROLLER_URL, tasks, {
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
    taskTimeoutMs: DEFAULT_TASK_TIMEOUT_MS,
    batchTimeoutMs: DEFAULT_BATCH_TIMEOUT_MS
  });

  const snapshot = await collectSnapshot(DEFAULT_CONTROLLER_URL);
  const snapshotPath = path.join(outputDir, `${payload.batchId}.export.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  const summary = buildSummary(payload.batchId, DEFAULT_CONTROLLER_URL, tasks, execution, snapshotPath, payload.deliveryTarget || null);
  const summaryPath = path.join(outputDir, `${payload.batchId}.summary.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`[run_batch] Summary written to ${summaryPath}`);
  console.log(`[run_batch] Snapshot written to ${snapshotPath}`);
  console.log(JSON.stringify({
    batchId: summary.batchId,
    submitted: summary.submitted,
    completed: summary.completed,
    blocked_retry: summary.blocked_retry,
    failed: summary.failed,
    timeout: summary.timeout
  }, null, 2));
}

main().catch(error => {
  console.error(`[run_batch] ${error.message}`);
  process.exit(1);
});
