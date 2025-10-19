import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// 先mock模块
jest.unstable_mockModule('../mongo.js', () => ({
    db: {
        collection: jest.fn().mockReturnThis(),
        updateOne: jest.fn(),
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnThis(),
        toArray: jest.fn()
    },
    COLLECTIONS: {
        BLOG_VIEW: 'blogView'
    }
}));

// 在测试前配置环境变量
beforeAll(() => {
    dotenv.config({ override: true, path: [".env.local", ".env"] });
});

// 动态导入被测试的模块和依赖
const { view, getPopularPosts } = await import('./blog.js');
const { db, COLLECTIONS } = await import('../mongo.js');

describe('blog控制器测试', () => {
    // 每个测试后重置mock
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('view函数测试', () => {
        beforeEach(() => {
            // 重置collection的mock实现
            db.collection.mockReturnValue({
                updateOne: jest.fn(),
                find: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                toArray: jest.fn()
            });
        });
        
        it('应该成功记录博客访问并返回成功状态', async () => {
            // 配置mock返回值
            db.collection().updateOne.mockResolvedValue({ acknowledged: true });
            
            // 创建测试上下文
            const ctx = {
                request: {
                    query: { id: 'test-post-123' }
                },
                response: {
                    body: null
                },
                throw: jest.fn()
            };
            
            // 执行测试
            await view(ctx);
            
            // 验证结果
            expect(db.collection().updateOne).toHaveBeenCalledWith(
                { postId: 'test-post-123' },
                expect.objectContaining({
                    $inc: { viewCount: 1 },
                    $set: expect.objectContaining({ lastViewTime: expect.any(Date) })
                }),
                { upsert: true }
            );
            expect(ctx.response.body).toEqual({
                success: true,
                payload: { postId: 'test-post-123', status: 'success' }
            });
            expect(ctx.throw).not.toHaveBeenCalled();
        });

        it('当缺少文章ID时应该抛出400错误', async () => {
            const ctx = {
                request: {
                    query: {}
                },
                response: {
                    body: null
                },
                throw: jest.fn()
            };
            
            await view(ctx);
            
            expect(ctx.throw).toHaveBeenCalledWith(400, '文章ID不能为空');
        });

        it('当数据库操作失败时应该抛出500错误', async () => {
            // 模拟数据库错误
            const mockError = new Error('Database error');
            db.collection().updateOne.mockRejectedValue(mockError);
            
            const ctx = {
                request: {
                    query: { id: 'test-post-123' }
                },
                response: {
                    body: null
                },
                throw: jest.fn()
            };
            
            await view(ctx);
            
            expect(ctx.throw).toHaveBeenCalledWith(500, '记录访问失败');
        });
    });

    describe('getPopularPosts函数测试', () => {
        it('应该成功获取热门文章列表', async () => {
            // 配置mock返回值
            const mockPosts = [
                { postId: 'post-1', viewCount: 100, lastViewTime: new Date() },
                { postId: 'post-2', viewCount: 90, lastViewTime: new Date() }
            ];
            
            // 为链式调用单独设置mock
            const mockCollection = {
                find: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                toArray: jest.fn().mockResolvedValue(mockPosts)
            };
            db.collection.mockReturnValue(mockCollection);
            
            // 创建测试上下文
            const ctx = {
                request: {
                    query: { days: '7', limit: '5' }
                },
                response: {
                    body: null
                },
                throw: jest.fn()
            };
            
            // 执行测试
            await getPopularPosts(ctx);
            
            // 验证find调用中的时间范围
            const findCall = mockCollection.find.mock.calls[0][0];
            expect(findCall).toHaveProperty('lastViewTime');
            expect(findCall.lastViewTime).toHaveProperty('$gte');
            expect(findCall.lastViewTime.$gte).toBeInstanceOf(Date);
            
            // 验证结果
            expect(ctx.response.body).toEqual({
                success: true,
                payload: {
                    days: 7,
                    limit: 5,
                    posts: mockPosts
                }
            });
            expect(ctx.throw).not.toHaveBeenCalled();
        });

        it('应该使用默认参数值', async () => {
            // 为链式调用单独设置mock
            const mockCollection = {
                find: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                toArray: jest.fn().mockResolvedValue([])
            };
            db.collection.mockReturnValue(mockCollection);
            
            const ctx = {
                request: {
                    query: {}
                },
                response: {
                    body: null
                },
                throw: jest.fn()
            };
            
            await getPopularPosts(ctx);
            
            expect(ctx.response.body.payload.days).toBe(30);
            expect(ctx.response.body.payload.limit).toBe(10);
        });

        it('当days参数无效时应该抛出400错误', async () => {
            const ctx = {
                request: {
                    query: { days: 'invalid', limit: '5' }
                },
                response: {
                    body: null
                },
                throw: jest.fn()
            };
            
            await getPopularPosts(ctx);
            
            expect(ctx.throw).toHaveBeenCalledWith(400, '天数必须为正整数');
        });

        it('当limit参数超出范围时应该抛出400错误', async () => {
            const ctx = {
                request: {
                    query: { days: '7', limit: '100' }
                },
                response: {
                    body: null
                },
                throw: jest.fn()
            };
            
            await getPopularPosts(ctx);
            
            expect(ctx.throw).toHaveBeenCalledWith(400, '限制数量必须为1-50之间的正整数');
        });

        it('当数据库操作失败时应该抛出500错误', async () => {
            // 模拟数据库错误
            const mockError = new Error('Database error');
            const mockCollection = {
                find: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                project: jest.fn().mockReturnThis(),
                toArray: jest.fn().mockRejectedValue(mockError)
            };
            db.collection.mockReturnValue(mockCollection);
            
            const ctx = {
                request: {
                    query: { days: '7', limit: '5' }
                },
                response: {
                    body: null
                },
                throw: jest.fn()
            };
            
            await getPopularPosts(ctx);
            
            expect(ctx.throw).toHaveBeenCalledWith(500, '获取热门文章失败');
        });
    });
});