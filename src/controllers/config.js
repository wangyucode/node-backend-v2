import { COLLECTIONS, db } from "../mongo.js";
import { getDataResult } from "../utils.js";

export async function setConfig(ctx) {
  const { key, value } = await ctx.request.body.json();
  if (!key) ctx.throw(400, "key required");
  if (!value) ctx.throw(400, "value required");
  setConfigInternal(key, value);
  ctx.response.body = getDataResult(key);
}

export async function getConfig(ctx) {
  const key = ctx.request.url.searchParams.get("key");
  if (!key) ctx.throw(400, "key required");
  const config = await getConfigInternal(key);
  if (!config) ctx.throw(404, "配置不存在");
  ctx.response.body = getDataResult(config);
}

export async function deleteConfig(ctx) {
  const id = ctx.params?.id;
  if (!id) ctx.throw(400, "id required");
  ctx.response.body = getDataResult(
    await db.collection(COLLECTIONS.CONFIG).deleteOne({
      _id: new ObjectId(id),
    }),
  );
}

export async function setConfigInternal(key, value) {
  const configs = db.collection(COLLECTIONS.CONFIG);
  await configs.updateOne({ _id: key }, {
    $set: { _id: key, value, date: new Date() },
  }, { upsert: true });
}

export async function getConfigInternal(key) {
  return await db.collection(COLLECTIONS.CONFIG).findOne({ _id: key });
}
