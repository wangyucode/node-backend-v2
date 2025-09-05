import Router from "koa-router";
import { state } from "./controllers/state.js";
import * as comments from "./controllers/comment.js";
import * as wechat from "./controllers/wechat.js";
import * as clipboard from "./controllers/clipboard.js";
import * as analysis from "./controllers/analysis.js";
import * as email from "./controllers/email.js";
// import * as chat from "./controllers/chat.js";
import * as config from "./controllers/config.js";
import * as vending from "./controllers/vending.js";
import { apiKeyGuard } from "./middleware.js";
import { logFromClient } from "./controllers/logger.js";

const router = new Router()
  .prefix("/api/v1")
  // basic
  .get("/", state)
  .post("/email", email.send)
  .get("/wechat/apps", wechat.getWechatApps)
  // comment
  .post("/comment", comments.postComment)
  .get("/comment", comments.getComments)
  // config
  .get("/config", config.getConfig)
  // clipboard
  .get("/clipboard/wx/:code", clipboard.getByWxCode)
  .get("/clipboard/notification", clipboard.getNotification)
  .get("/clipboard/:id", clipboard.getById)
  .get("/clipboard/openid/:openid", clipboard.getByOpenid)
  .post("/clipboard", clipboard.saveById)

export default router;
