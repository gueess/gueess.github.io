# Joe Photographs

Joe 的个人摄影站。公开页面使用 Astro 生成静态文件，内容在本机通过
Keystatic 可视化编辑，提交到 `main` 后由 GitHub Actions 自动部署到
`gueess.github.io`。

## 本地使用

需要 Node.js 22 和 npm。

```bash
npm install
npm run studio
```

浏览器会打开 `/keystatic`。这里可以管理：

- 新建相册时只填写一个后台“工作名称”，它不会显示在正式网站上。
- 可视化编排：一次上传多张照片，从左侧照片库拖入中间画布；内容块可直接
  拖动排序。
- 照片块：一张、两张或三张，可调主次宽度、通栏、间距、画面比例和裁切焦点。
- 文字与留白：可插在任意两组照片之间，并控制字号、内容宽度、对齐和上下留白。
- 网页预览：草稿保存后点击“预览最终网页”，以正式页面的真实尺寸和样式打开。
- 发布信息：排版保存为草稿后，再填写正式标题、日期、地点、封面、简介和开场文字。
- 隐藏文章：Markdoc 富文本正文，默认不出现在导航、首页和站点地图中。

保存后，内容和图片直接写入 `src/content` 与 `src/assets`。原片请继续保存在
本地照片库；仓库只存适合网页发布的版本。

## 新建与发布

1. 运行 `npm run studio`，为一组照片填写后台工作名称。
2. 先只处理照片编排；保存后它默认是一份草稿。
3. 准备发布时再填写正式标题、日期、地点、封面和文字，并关闭“保持为草稿”。
4. 运行 `npm run publish`。
5. 脚本会自动校正图片方向、移除 EXIF/GPS、压缩图片、检查正式发布内容并构建网站。
6. 确认终端中的变更后，脚本才会提交并推送；GitHub Actions 随后自动部署。

尚未完成的草稿可以保持照片库或内容块为空，也不会阻止其他已完成相册发布；
一旦关闭“保持为草稿”，发布检查才会要求标题、日期、封面和完整照片布局。
本地开发时草稿可通过正式相册地址预览；生产构建仍只生成已发布相册。

第一次发布前，请在仓库 `Settings → Pages → Build and deployment` 中把 Source
设为 **GitHub Actions**。

常用检查命令：

```bash
npm run validate:content
npm run check
npm run build
```

公开路由：

- 相册：`/photos/<slug>/`
- 隐藏文章：`/writing/<slug>/`

文章默认输出 `noindex, nofollow`，并且没有任何公开列表入口。URL 仍可被知道
地址的人访问，因此真正私密的内容必须放到独立私有站，不能放在这个公开仓库。

## 安全说明

旧版根目录中的 `admin.html`、`admin.js` 和试验页面只作为迁移备份保留。
Astro 只部署 `dist`，这些文件不会进入正式网站。旧版曾将图床密钥写进前端，
该密钥应在原服务后台撤销或轮换；新站没有图床上传逻辑，也不在浏览器保存后台密码。

## 项目结构

```text
src/
├── assets/                 # 已处理的网页图片
│   ├── galleries/
│   └── articles/
├── content/                # 相册、文章和站点设置
├── components/             # 相册块、文字块、灯箱、导航
├── keystatic/              # 相册可视化编排器
├── layouts/                # 公共页面与文章页面
├── pages/                  # 首页、相册、隐藏文章
└── styles/global.css

scripts/
├── prepare-media.mjs       # 图片隐私与体积处理
├── validate-content.mjs    # 内容和排版块检查
└── publish.mjs             # 发布前检查、确认、提交与推送
```

私密站部署见 [docs/private-site.md](docs/private-site.md)，后续高级排版方向见
[docs/future-layouts.md](docs/future-layouts.md)。
