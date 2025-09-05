import { jest } from '@jest/globals';

// 先mock模块
jest.unstable_mockModule('../mongo.js', () => ({
    db: {
        collection: jest.fn().mockReturnThis(),
        find: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([])
    },
    COLLECTIONS: {
        WECHAT_APP: 'wechat_app'
    }
}));

jest.unstable_mockModule('../notifier.js', () => ({
    sendEmail: jest.fn()
}));

jest.unstable_mockModule('../utils.js', () => ({
    getDataResult: jest.fn()
}));

// 动态导入被测试的模块和依赖
const { getWechatApps } = await import('./wechat.js');
const { db, COLLECTIONS } = await import('../mongo.js');
const { sendEmail } = await import('../notifier.js');
const { getDataResult } = await import('../utils.js');

// 清除所有mock调用
beforeEach(() => {
    jest.clearAllMocks();
    // 重置collection的mock实现
    db.collection.mockReturnValue({
        find: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([])
    });
});

describe('getWechatApps', () => {
    // 模拟ctx对象
    const createMockContext = (headers = {}) => ({
        request: { headers },
        response: { body: null },
        throw: jest.fn()
    });

    describe('本地调试环境', () => {
        const mockApps = [{ appid: 'app1' }, { appid: 'app2' }];

        beforeEach(() => {
            db.collection.mockReturnValue({
                find: jest.fn().mockReturnThis(),
                toArray: jest.fn().mockResolvedValue(mockApps)
            });
            getDataResult.mockReturnValue({ payload: mockApps, success: true });
        });

        it('当referer包含localhost时应返回所有应用列表', async () => {
            const ctx = createMockContext({ referer: 'http://localhost:3000' });

            await getWechatApps(ctx);

            expect(db.collection).toHaveBeenCalledWith(COLLECTIONS.WECHAT_APP);
            expect(db.collection().find).toHaveBeenCalledWith({});
            expect(getDataResult).toHaveBeenCalledWith(mockApps);
            expect(ctx.response.body).toEqual({ payload: mockApps, success: true });
            expect(sendEmail).not.toHaveBeenCalled();
            expect(ctx.throw).not.toHaveBeenCalled();
        });

        it('当referer包含127.0.0.1时应返回所有应用列表', async () => {
            const ctx = createMockContext({ referer: 'http://127.0.0.1:8080' });

            await getWechatApps(ctx);

            expect(db.collection().find).toHaveBeenCalledWith({});
            expect(ctx.response.body).toEqual({ payload: mockApps, success: true });
        });

        it('当referer是私有IP地址(192.168.x.x)时应返回所有应用列表', async () => {
            const ctx = createMockContext({ referer: 'http://192.168.1.100' });

            await getWechatApps(ctx);

            expect(db.collection().find).toHaveBeenCalledWith({});
            expect(ctx.response.body).toEqual({ payload: mockApps, success: true });
        });

        it('当referer是私有IP地址(172.27.x.x)时应返回所有应用列表', async () => {
            const ctx = createMockContext({ referer: 'http://172.27.96.1:10086/' });

            await getWechatApps(ctx);

            expect(db.collection().find).toHaveBeenCalledWith({});
            expect(ctx.response.body).toEqual({ payload: mockApps, success: true });
        });

        it('当referer是私有IP地址(10.x.x.x)时应返回所有应用列表', async () => {
            const ctx = createMockContext({ referer: 'https://10.0.0.1' });

            await getWechatApps(ctx);

            expect(db.collection().find).toHaveBeenCalledWith({});
            expect(ctx.response.body).toEqual({ payload: mockApps, success: true });
        });
    });

    describe('生产环境', () => {
        const mockApps = [{ appid: 'app1' }, { appid: 'app2' }];
        const filteredApps = [{ appid: 'app2' }];

        beforeEach(() => {
            getDataResult.mockReturnValue({ payload: filteredApps, success: true });
        });

        it('当referer是微信服务号域名时应根据appid过滤应用列表', async () => {
            const ctx = createMockContext({ referer: 'https://servicewechat.com/app1/123' });

            db.collection.mockReturnValue({
                find: jest.fn().mockReturnThis(),
                toArray: jest.fn().mockResolvedValue(filteredApps)
            });

            await getWechatApps(ctx);

            expect(db.collection).toHaveBeenCalledWith(COLLECTIONS.WECHAT_APP);
            expect(db.collection().find).toHaveBeenCalledWith({
                appid: { $not: { $eq: 'app1' } }
            });
            expect(getDataResult).toHaveBeenCalledWith(filteredApps);
            expect(ctx.response.body).toEqual({ payload: filteredApps, success: true });
        });

        it('当referer包含多个斜杠时应正确提取appid', async () => {
            const ctx = createMockContext({ referer: 'https://servicewechat.com//appid123//path' });

            db.collection.mockReturnValue({
                find: jest.fn().mockReturnThis(),
                toArray: jest.fn().mockResolvedValue([])
            });

            await getWechatApps(ctx);

            expect(db.collection().find).toHaveBeenCalledWith({
                appid: { $not: { $eq: 'appid123' } }
            });
        });
    });

    describe('非法访问', () => {
        it('当referer为空时应抛出400错误', async () => {
            const ctx = createMockContext({});

            await getWechatApps(ctx);

            expect(console.error).toHaveBeenCalledWith('非法访问 /wechat/apps ->', undefined);
            expect(sendEmail).toHaveBeenCalledWith('非法访问 /wechat/apps ->undefined');
            expect(ctx.throw).toHaveBeenCalledWith(400);
        });

        it('当referer格式不正确时应抛出400错误', async () => {
            const ctx = createMockContext({ referer: 'https://example.com' });

            await getWechatApps(ctx);

            expect(console.error).toHaveBeenCalledWith('非法访问 /wechat/apps ->', 'https://example.com');
            expect(sendEmail).toHaveBeenCalledWith('非法访问 /wechat/apps ->https://example.com');
            expect(ctx.throw).toHaveBeenCalledWith(400);
        });

        it('当referer不是微信服务号域名时应抛出400错误', async () => {
            const ctx = createMockContext({ referer: 'https://weixin.qq.com/app1' });

            await getWechatApps(ctx);

            expect(console.error).toHaveBeenCalledWith('非法访问 /wechat/apps ->', 'https://weixin.qq.com/app1');
            expect(sendEmail).toHaveBeenCalledWith('非法访问 /wechat/apps ->https://weixin.qq.com/app1');
            expect(ctx.throw).toHaveBeenCalledWith(400);
        });
    });
});

// 为了测试console.error
console.error = jest.fn();