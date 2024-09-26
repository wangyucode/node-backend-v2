import fs from 'fs';

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getDataResult(payload) {
  return { payload, success: true };
}

export function getErrorResult(message) {
  return { message, success: false };
}

export function getSuccessResult(message) {
  return { message, success: true };
}

export function getPackageJsonVersion() {
  const packageJsonPath = "./package.json";
  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
  const packageData = JSON.parse(packageJsonContent);
  return packageData.version;
}
