
import { getJWTToken } from '@coze/api';
import { uniqueId } from 'lodash-es';
import { getDataResult } from '../utils.js';

/**
 * 获取Coze Access Token的控制器
 * 使用OAuth JWT方式进行认证
 */
export const token = async (ctx) => {
    const jwtToken = await getJWTToken({
        baseURL: 'https://api.coze.cn',
        appId: process.env.COZE_APP_ID,
        aud: 'api.coze.cn',
        keyid: process.env.COZE_KEY_ID,
        privateKey: process.env.COZE_PRIVATE_KEY,
        sessionName: uniqueId(), // optional Isolate different sub-resources under the same jwt account
    });
    ctx.response.body = getDataResult(jwtToken);
};