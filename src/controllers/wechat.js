import { COLLECTIONS, db } from "../mongo.js";
import { sendEmail } from "../notifier.js";
import { getDataResult } from "../utils.js";

const SESSION_URL = "https://api.weixin.qq.com/sns/jscode2session";

export async function getWechatSession(appid, secret, jscode) {
  const url = `${SESSION_URL}?appid=${appid}&secret=${secret}&js_code=${jscode}&grant_type=authorization_code`;
  const res = await fetch(url);
  return await res.json();
}

export async function getWechatApps(ctx) {
  const appid = ctx.request.headers
    .get("referer")
    ?.match(/^https:\/\/servicewechat.com\/+(\w+)\/.*$/)?.[1];
  if (!appid) {
    log.error("非法访问 /wechat/apps ->", ctx.request.headers.get("referer"));
    if (isProd()) {
      sendEmail(
        "非法访问 /wechat/apps ->" + ctx.request.headers.get("referer")
      );
    }
    ctx.throw(400);
  }
  ctx.response.body = getDataResult(
    await db
      .collection(COLLECTIONS.WECHAT_APP)
      .find({
        appid: { $not: { $eq: appid } },
      })
      .toArray()
  );
}
