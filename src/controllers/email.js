import { sendEmail } from "../notifier.js";
import { getDataResult } from "../utils.js";

export async function send(ctx) {
  const { key, subject, content, to } = await ctx.request.body.json();
  if (!content) ctx.throw(400, "content is required");
  if (key !== env.MAIL_PASSWORD) ctx.throw(403, "invalid key");
  await sendEmail(content, subject, to);
  ctx.response.body = getDataResult("ok");
}
