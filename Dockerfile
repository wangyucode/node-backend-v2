# 使用官方 Node.js 镜像作为基础镜像
FROM node:18

# 设置工作目录
WORKDIR /wycode

# 将当前目录的内容复制到容器中的 /wycode
COPY . .

# 安装依赖
RUN npm ci

# 暴露端口
EXPOSE 8083

# 运行应用
CMD ["npm", "start"]