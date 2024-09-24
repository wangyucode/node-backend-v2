import { COLLECTIONS, db } from "../mongo.js";
import { getDataResult, getErrorResult } from "../utils.js";
import { sendEmail } from "../notifier.js";

let wxPay;
let lastHeartbeat = 0;
let heartbeatTimeoutId = 0;
const HEARTBEAT_TIMEOUT = 120 * 1000;
let heartbeatContent = {};

export async function getBanners(ctx) {
  const cc = db.collection(COLLECTIONS.VENDING_BANNER);
  const result = await cc.find().toArray();
  ctx.response.body = result ? getDataResult(result) : getErrorResult("未找到");
}

export async function getGoods(ctx) {
  const type = ctx.request.url.searchParams.get("type");
  const cc = db.collection(COLLECTIONS.VENDING_GOODS);
  const result = await cc.find({ type }, {
    sort: { track: 1 },
  }).toArray();
  ctx.response.body = result ? getDataResult(result) : getErrorResult("未找到");
}

export async function putGoods(ctx) {
  const data = await ctx.request.body.json();
  const track = data.track;
  if (!track) ctx.throw(400, "track required");

  data.mainImg =
    `https://wycode.cn/upload/image/vending/goods/${track}/main.webp`;
  data.images = [];
  for (let index = 1; index <= data.imageCount; index++) {
    data.images.push(
      `https://wycode.cn/upload/image/vending/goods/${track}/${index}.webp`,
    );
  }
  data.imageCount = undefined;
  const cc = db.collection(COLLECTIONS.VENDING_GOODS);
  const res = await cc.updateOne({ track }, { $set: data }, { upsert: true });
  heartbeatContent.updateGoods = true;
  ctx.response.body = getDataResult(res);
}

export async function getOrder(ctx) {
  const id = ctx.request.url.searchParams.get("id");
  const cc = db.collection(COLLECTIONS.VENDING_ORDER);
  const result = id
    ? await cc.findOne({ _id: new ObjectId(id) })
    : await cc.find({}, { sort: { createDate: -1 } }).toArray();
  ctx.response.body = getDataResult(result);
}

export async function getCode(ctx) {
  const code = ctx.request.url.searchParams.get("code");
  const cc = db.collection(COLLECTIONS.VENDING_CODE);
  if (!code) {
    const result = await cc.find({ usedTime: { $exists: false } }).toArray();
    ctx.response.body = getDataResult(result);
  } else {
    const result = await cc.findOne({ code });
    if (result) {
      if (!result.usedTime) {
        await cc.updateOne({ _id: result._id }, {
          $set: { usedTime: new Date() },
        });
        sendEmail(`提货码 ${code} 被使用`);
      }
      ctx.response.body = getDataResult(result);
    } else {
      ctx.response.body = getErrorResult("未找到");
    }
  }
}

export async function postCode(ctx) {
  const data = await ctx.request.body.json();
  if (!data.code || !data.goods || !data.goods.length) ctx.throw(400);
  const cc = db.collection(COLLECTIONS.VENDING_CODE);

  ctx.response.body = getDataResult(await cc.insertOne(data));
}

export async function reduce(ctx) {
  const track = Number.parseInt(
    ctx.request.url.searchParams.get("track") || "",
  );
  const cc = db.collection(COLLECTIONS.VENDING_GOODS);
  const result = await cc.updateOne({ track }, { $inc: { stock: -1 } });
  ctx.response.body = getDataResult(result);
  sendEmail(`出货: ${track}, result: ${JSON.stringify(result)}`);
}

export function heartbeat(ctx) {
  clearTimeout(heartbeatTimeoutId);
  heartbeatTimeoutId = setTimeout(
    () => sendEmail("客户端掉线"),
    HEARTBEAT_TIMEOUT,
  );

  const now = new Date().getTime();
  ctx.response.body = getDataResult(heartbeatContent);
  if (now - lastHeartbeat < HEARTBEAT_TIMEOUT) {
    heartbeatContent = {};
  }
  lastHeartbeat = now;
}

export function putHeartbeat(ctx) {
  const field = ctx.request.url.searchParams.get("field");
  if (!field) ctx.throw(400);
  heartbeatContent[field] = true;
  ctx.response.body = getDataResult("ok");
}

export async function createOrder(ctx) {
  const { description, total, goodsDetail } = await ctx.request.body.json();
  log.info("createOrder:", description, total, goodsDetail.length);
  if (!description || !total || !goodsDetail || !goodsDetail.length) {
    ctx.throw(400);
  }
  const out_trade_no = new ObjectId();
  const params = {
    description,
    appid: process.env.VENDING_APP_ID,
    mchid: process.env.VENDING_MCH_ID,
    out_trade_no,
    amount: { total },
    notify_url: "https://wycode.cn/api/v1/vending/wx-notify",
  };
  const nonce_str = Math.random().toString(36).substring(2, 15), // 随机字符串
    timestamp = parseInt(+new Date() / 1000 + "").toString(), // 时间戳 秒
    url = "/v3/pay/transactions/native";
  const pay = getWxPay();
  const signature = pay.getSignature("POST", nonce_str, timestamp, url, params);
  const authorization = pay.getAuthorization(nonce_str, timestamp, signature);
  const res = await fetch(
    "https://api.mch.weixin.qq.com/v3/pay/transactions/native",
    {
      body: JSON.stringify(params),
      method: "POST",
      headers: {
        "Authorization": authorization,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Accept-Language": "zh-CN",
      },
    },
  );
  const data = await res.json();
  data.out_trade_no = out_trade_no;
  log.info("createOrder: data: ", JSON.stringify(data));
  if (res.status === 200) {
    const cc = db.collection(COLLECTIONS.VENDING_ORDER);
    await cc.insertOne({
      _id: out_trade_no,
      createDate: new Date(),
      trade_state: "CREATED",
      goodsDetail,
    });
    ctx.response.body = getDataResult(data);
    sendEmail(`下单成功:\n${JSON.stringify(data)}`);
  } else {
    ctx.response.body = getErrorResult(data);
    sendEmail(`下单失败:\n${JSON.stringify(data)}`);
  }
}

export async function notify(ctx) {
  const body = await ctx.request.body.json();
  log.info(
    "wx notification",
    JSON.stringify(body),
    JSON.stringify(ctx.request.headers),
  );
  const pay = getWxPay();
  const params = {
    body,
    signature: ctx.request.headers.get("wechatpay-signature") || "",
    serial: ctx.request.headers.get("wechatpay-serial") || "",
    nonce: ctx.request.headers.get("wechatpay-nonce") || "",
    timestamp: ctx.request.headers.get("wechatpay-timestamp") || 0,
  };
  const ret = await pay.verifySign(params);
  log.info("验签结果:", ret);
  if (!ret) ctx.throw(401);

  if (body.event_type === "TRANSACTION.SUCCESS") {
    const result = await pay.decipher_gcm(
      body.resource.ciphertext,
      body.resource.associated_data,
      body.resource.nonce
    );
    const resultString = JSON.stringify(result);
    log.info("解密结果:", resultString);
    if (!result) ctx.throw(403, "解密失败");

    const cc = db.collection(COLLECTIONS.VENDING_ORDER);
    await cc.updateOne({ _id: new ObjectId(result.out_trade_no) }, {
      $set: result,
    });
    sendEmail(`订单支付成功：\n${resultString}`);
  }

  ctx.response.body = "ok";
}

export function getWxPay() {
  if (!wxPay) {
    const { cert, key } = JSON.parse(process.env.VENDING_WX_API_CLIENT_CERT);

    wxPay = new WxPay({
      appid: process.env.VENDING_APP_ID,
      mchid: process.env.VENDING_MCH_ID,
      publicKey: cert,
      privateKey: key,
      key: process.env.VENDING_WX_APIV3_KEY,
    });

    wxPay["getRequest"] = async (url, authorization) => {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "Authorization": authorization,
          "Accept-Language": "zh-CN",
        },
      });
      const data = await res.json();
      log.info(JSON.stringify(data));
      data.status = res.status;
      return data;
    };
  }

  return wxPay;
}
