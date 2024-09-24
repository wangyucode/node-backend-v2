import { sendEmail } from "../notifier.js";

export async function logFromClient(ctx) {
  const { message, type } = ctx.request.body;
  if (type === "ERROR") {
    console.error(message);
    sendEmail(`客户端错误:\n${message}`);
  } else {
    console.info(message);
  }

  ctx.response.status = 200;
}
