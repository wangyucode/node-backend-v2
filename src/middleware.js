import { sendEmail } from "./notifier.js";
import { getErrorResult } from "./utils.js";

// 错误中间件
export async function errorMiddleware(ctx, next) {
  try {
    await next();
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    ctx.status = status;
    ctx.body = getErrorResult(message);
    if (status >= 500) {
      console.error(status, message, err.stack);
      sendEmail(`Unexpected error: ${status} ${message} \n ${err.stack}`);
    }
  }
}

// API 密钥验证中间件
export async function apiKeyGuard(ctx, next) {
  const apiKey = ctx.header["x-api-key"];
  if (apiKey !== process.env.VENDING_API_KEY) ctx.throw(401);
  await next();
}

// 日志中间件
export async function loggerMiddleware(ctx, next) {
  const now = new Date();
  await next();
  const time = new Date() - now;
  console.log(
    `${ctx.method} ${ctx.url} ${ctx.status} ${time}ms ${now.toISOString()}`
  );
}
