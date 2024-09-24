import { sendEmail } from "../notifier.js";
import { getDataResult } from "../utils.js";

export async function send(ctx) {
  const { key, subject, content, to } = ctx.request.body;
  if (!content) ctx.throw(400, "content is required");
  if (key !== process.env.MAIL_PASSWORD) ctx.throw(403, "invalid key");
  await sendEmail(content, subject, to);
  ctx.response.body = getDataResult("ok");
}
