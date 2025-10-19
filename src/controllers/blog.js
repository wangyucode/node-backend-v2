import { COLLECTIONS, db } from "../mongo.js";
import { getDataResult } from "../utils.js";

/**
 * 记录博客访问次数的控制器
 * @param {import('koa').Context} ctx - Koa上下文
 */
export async function view(ctx) {
    const { id: postId } = ctx.request.query;

    if (!postId) {
        ctx.throw(400, "文章ID不能为空");
    }

    try {
        // 使用upsert操作，不存在则插入，存在则更新访问次数
        await db.collection(COLLECTIONS.BLOG_VIEW).updateOne(
            { postId },
            {
                $inc: { viewCount: 1 },
                $set: { lastViewTime: new Date() }
            },
            { upsert: true }
        );

        ctx.response.body = getDataResult({ postId, status: "success" });
    } catch (error) {
        console.error("记录博客访问失败:", error);
        ctx.throw(500, "记录访问失败");
    }
}

/**
 * 获取热门博客文章的控制器
 * @param {import('koa').Context} ctx - Koa上下文
 */
export async function getPopularPosts(ctx) {
    const { days = 30, limit = 10 } = ctx.request.query;

    // 验证参数
    const daysNum = parseInt(days, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(daysNum) || daysNum <= 0) {
        ctx.throw(400, "天数必须为正整数");
    }

    if (isNaN(limitNum) || limitNum <= 0 || limitNum > 50) {
        ctx.throw(400, "限制数量必须为1-50之间的正整数");
    }

    try {
        // 计算时间范围
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - daysNum);

        // 查询指定时间范围内的热门文章
        const popularPosts = await db.collection(COLLECTIONS.BLOG_VIEW)
            .find({
                lastViewTime: { $gte: startTime }
            })
            .sort({ viewCount: -1 }) // 按访问次数降序排序
            .limit(limitNum)
            .project({
                _id: 0,
                postId: 1,
                viewCount: 1,
                lastViewTime: 1
            })
            .toArray();

        ctx.response.body = getDataResult({
            days: daysNum,
            limit: limitNum,
            posts: popularPosts
        });
    } catch (error) {
        console.error("获取热门文章失败:", error);
        ctx.throw(500, "获取热门文章失败");
    }
}