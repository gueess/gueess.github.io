# 私密摄影站部署手册

私密内容不放进 `gueess.github.io`，也不通过隐藏链接或 `noindex` 代替访问控制。
建议创建独立私有仓库 `gueess-private-gallery` 和独立 Cloudflare Pages 项目，
复用当前 Astro 主题与内容模型。

## 1. 准备私有仓库

1. 在 GitHub 创建私有仓库 `gueess-private-gallery`。
2. 复制本项目的代码结构，不复制公开相册、文章、旧页面和 Git 历史。
3. 保留 `src/components`、`src/layouts`、`src/styles`、内容模型和媒体脚本。
4. 只在私有仓库内添加私密照片，并确认仓库可见性仍为 Private。
5. 在本机运行 `npm ci && npm run check && npm run build`。

不要把私密原片、朋友邮箱白名单或任何密钥提交到当前公开仓库。

## 2. 创建 Cloudflare Pages 项目

在 Cloudflare Dashboard 中：

1. 新建 Pages 项目并授权读取这个私有 GitHub 仓库。
2. Production branch 选择 `main`。
3. Build command 填写 `npm run build`。
4. Build output directory 填写 `dist`。
5. 设置 `NODE_VERSION=22`，完成第一次构建。

## 3. 保护整个站点

在 Cloudflare Zero Trust / Access 中为 Pages 域名创建 Self-hosted application：

- Application domain 覆盖整个 `项目名.pages.dev`，不要只保护首页路径。
- Identity provider 启用 One-time PIN。
- Allow policy 只列出允许访问的朋友邮箱。
- 不添加 `Everyone`、邮箱域名通配或公开 Bypass 规则。
- Session duration 按需要设置；移除邮箱即可撤销后续访问权限。

如果绑定自定义域名，也要把该域名作为同一个 Access application 的受保护域名。

## 4. 必测项目

使用未登录的无痕窗口验证：

1. 白名单邮箱可以收到验证码并进入站点。
2. 非白名单邮箱不能进入。
3. 直接打开相册页面 URL 仍被 Access 拦截。
4. 从构建结果复制一条图片 URL，直接打开也仍被拦截。
5. 退出或清除会话后，再次访问需要重新验证。

只有以上五项全部通过，才能开始上传真正的私密内容。

## 当前仓库的边界

本仓库只包含公开站模板和这份操作手册，不包含私密站仓库本身。创建私有仓库、
连接 Cloudflare 和配置邮箱白名单都需要在对应账户中完成；这些步骤不能通过向
公开仓库添加配置文件来替代。
