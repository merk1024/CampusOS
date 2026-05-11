function createServiceError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getServiceErrorStatus(error) {
  return Number.isInteger(error?.status) ? error.status : null;
}

module.exports = {
  createServiceError,
  getServiceErrorStatus
};
