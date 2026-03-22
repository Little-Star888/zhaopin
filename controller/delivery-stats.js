const {
  getDeliveryStats,
  getDeliveryRecords
} = require('./db');

function fetchDeliveryStats() {
  return getDeliveryStats();
}

function fetchDeliveryRecords(options = {}) {
  return getDeliveryRecords(options);
}

module.exports = {
  fetchDeliveryStats,
  fetchDeliveryRecords
};
