const {
  getPendingDeliveryRecords,
  markDeliveryRecordSending,
  markDeliveryRecordSent,
  markDeliveryRecordRetry,
  markDeliveryRecordFailed,
  markDeliveryRecordAbandoned
} = require('./db');
const {
  initFeishuClient,
  getTargetConfig,
  batchCreateRecords
} = require('./feishu-client');

const DELIVERY_POLL_INTERVAL_MS = Number(process.env.DELIVERY_POLL_INTERVAL_MS || 30 * 1000);
const DELIVERY_BATCH_SIZE = Number(process.env.DELIVERY_BATCH_SIZE || 5);

let timer = null;
let isRunning = false;

async function processPendingRecords() {
  if (isRunning) {
    return;
  }

  isRunning = true;
  try {
    const records = getPendingDeliveryRecords(DELIVERY_BATCH_SIZE);
    for (const record of records) {
      await processRecord(record);
    }
  } catch (error) {
    console.error(`[DeliveryWorker] Tick failed: ${error.message}`);
  } finally {
    isRunning = false;
  }
}

async function processRecord(record) {
  if (!record.deliveryTarget) {
    markDeliveryRecordFailed(record.id, 'missing_delivery_target');
    console.error(`[DeliveryWorker] Record ${record.id} has no delivery_target, skipping`);
    return;
  }

  if (!getTargetConfig(record.deliveryTarget)) {
    markDeliveryRecordFailed(record.id, `unknown_target: ${record.deliveryTarget}`);
    console.error(`[DeliveryWorker] Record ${record.id} targets unknown: ${record.deliveryTarget}`);
    return;
  }

  const locked = markDeliveryRecordSending(record.id);
  if (!locked) {
    return;
  }

  try {
    const result = await batchCreateRecords(record.deliveryTarget, [{ fields: record.payload }]);
    if (result.success) {
      markDeliveryRecordSent(record.id);
      console.log(`[DeliveryWorker] Record ${record.id} sent to ${record.deliveryTarget}`);
      return;
    }

    handleDeliveryFailure(record, result.error || 'unknown_delivery_error');
  } catch (error) {
    handleDeliveryFailure(record, error.message || 'unknown_delivery_error');
  }
}

function handleDeliveryFailure(record, errorMessage) {
  const attemptNumber = Number(record.attemptCount || 0) + 1;
  const maxAttempts = Number(record.maxAttempts || 3);

  if (attemptNumber >= maxAttempts) {
    markDeliveryRecordAbandoned(record.id, errorMessage);
    console.error(`[DeliveryWorker] Record ${record.id} abandoned after ${attemptNumber} attempts: ${errorMessage}`);
    return;
  }

  const retryDelayMs = attemptNumber === 1 ? 60 * 1000 : 5 * 60 * 1000;
  const nextRetryAt = new Date(Date.now() + retryDelayMs).toISOString();
  markDeliveryRecordRetry(record.id, errorMessage, nextRetryAt);
  console.warn(`[DeliveryWorker] Record ${record.id} retry scheduled at ${nextRetryAt}: ${errorMessage}`);
}

function start() {
  if (timer) {
    return;
  }

  initFeishuClient();
  timer = setInterval(() => {
    processPendingRecords().catch((error) => {
      console.error(`[DeliveryWorker] Unhandled tick error: ${error.message}`);
    });
  }, DELIVERY_POLL_INTERVAL_MS);

  console.log(`[DeliveryWorker] Started (interval=${DELIVERY_POLL_INTERVAL_MS}ms, batchSize=${DELIVERY_BATCH_SIZE})`);
  processPendingRecords().catch((error) => {
    console.error(`[DeliveryWorker] Initial tick failed: ${error.message}`);
  });
}

function stop() {
  if (!timer) {
    return;
  }

  clearInterval(timer);
  timer = null;
  console.log('[DeliveryWorker] Stopped');
}

module.exports = {
  start,
  stop,
  isStarted: () => Boolean(timer),
  processPendingRecords
};
