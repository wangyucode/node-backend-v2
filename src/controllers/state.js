import { getDataResult } from "../utils.js"

export function state(ctx) {
  ctx.response.body = getDataResult({ state: "UP", time: new Date().getTime()});
}
