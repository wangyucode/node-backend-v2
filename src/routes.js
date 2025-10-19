import Router from "@koa/router";
import { state } from "./controllers/state.js";
import * as comments from "./controllers/comment.js";
import * as wechat from "./controllers/wechat.js";
import * as clipboard from "./controllers/clipboard.js";
import * as email from "./controllers/email.js";
import * as config from "./controllers/config.js";
import * as coze from "./controllers/coze.js";
import * as blog from "./controllers/blog.js";

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
  // coze
  .get("/coze/token", coze.token)
  // blog counter
  .get("/blog-view", blog.view)
  .get("/popular-posts", blog.getPopularPosts)

export default router;
