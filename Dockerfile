# 使用官方 Node.js 镜像作为基础镜像
FROM node:22.20.0

# 设置工作目录
WORKDIR /wycode

# 安装pnpm
RUN npm install -g pnpm

# 先复制package.json和锁文件
COPY package.json pnpm-lock.yaml ./
# 安装依赖
RUN pnpm install --frozen-lockfile
# 再复制其他代码
COPY . .

# 暴露端口
EXPOSE 8083

# 运行应用
CMD ["pnpm", "start"]