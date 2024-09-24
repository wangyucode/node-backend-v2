import Koa from "koa";
import cors from "@koa/cors";
import dotenv from "dotenv";

import { loggerMiddleware, errorMiddleware } from "./middleware.js";
import router from "./routes.js";
import { connectToMongo } from "./mongo.js";
import { sendEmail } from "./notifier.js";

const app = new Koa();

async function startHttpServer() {
  try {
    dotenv.config({ override: true, path: [".env.local", ".env"] });

    await connectToMongo();
    app
      .use(loggerMiddleware)
      .use(cors())
      .use(errorMiddleware)
      .use(router.routes())
      .use(router.allowedMethods());

    app.listen(process.env.PORT, () => {
      console.log(`server listening on ${process.env.PORT}`);
      // 发送邮件通知
      sendEmail(
        `node-backend start successfully on: ${new Date().toISOString()}.`
      );
    });
  } catch (e) {
    console.error("node-backend 启动时发生错误", e);
    sendEmail(`node-backend start failed: ${e.toString()}`);
  }
}

startHttpServer();
