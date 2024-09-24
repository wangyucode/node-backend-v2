export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getDataResult(payload) {
  return { payload, success: true };
}

export function getErrorResult(message) {
  return { message, success: false };
}
