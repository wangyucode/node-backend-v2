import ALY from "aliyun-sdk";
import { getDataResult, getErrorResult } from "../utils.js";

let sls;

export async function getBlogs(ctx) {
  let pvWeek1, pvWeek2;
  const now = Math.floor(Date.now() / 1000);
  const query = "(_container_name_ = caddy)| set session mode=scan; select regexp_extract(json_extract_scalar(content, '$.request.uri'), '^^\/api\/v1\/comment.*t=(.*)$', 1) as path, count(*) as pv where regexp_like(json_extract_scalar(content, '$.request.uri'), '^\/api\/v1\/comment.*t=(.*)$') group by path order by pv desc limit 10";
  try {
    pvWeek1 = await getLogsPromise({
      projectName: "wycode",
      logStoreName: "docker-log",
      from: now - 86400 * 14,
      to: now - 86400 * 7,
      query,
    });

    pvWeek2 = await getLogsPromise({
      projectName: "wycode",
      logStoreName: "docker-log",
      from: now - 86400 * 7,
      to: now,
      query
    });
  } catch (err) {
    ctx.response.body = getErrorResult(err);
  }

  //merge pvWeek1 and pvWeek2
  const res = Object.values(pvWeek2.body).map(it2 => ({
    key: it2.path,
    pv2: it2.pv,
    pv1: Object.values(pvWeek1.body).find((it1) => it2.path === it1.path)?.pv || 0,
  }));
  ctx.response.body = getDataResult(res);
}

function getLogsPromise(options) {
  if (!sls) {
    sls = new ALY.SLS({
      // 本示例从环境变量中获取AccessKey ID和AccessKey Secret。
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      secretAccessKey: process.env.ALIYUN_ACCESS_KEY_SECRET,
      endpoint: process.env.ALIYUN_LOG_URL,
      apiVersion: "2015-06-01",
    });
  }
  return new Promise((resolve, reject) => {
    sls.getLogs(options, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
