# Pexels 画廊

基于 Pexels API 的在线图片画廊，支持搜索、预览、下载及复制链接，部署在 Cloudflare Workers。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/你的用户名/你的仓库名)

## 功能

- **关键词搜索** — 输入任意英文关键词搜索高质量图片
- **多方向筛选** — 横向 16:9 / 竖向 9:16 / 正方形 1:1
- **灵活布局** — 3/6/9/12 张可选，自适应网格
- **大图预览** — 缩略图到高清图的平滑过渡动画，带加载感知
- **完整信息** — 展示分辨率、主色调、摄影师卡片、Pexels 来源链接
- **多尺寸下载** — Original ~ Tiny 六档，点击直接下载不跳转
- **一键复制链接** — 每种尺寸的图片直链一键复制，粘贴到 Markdown 文档即可用
- **随机翻页** — 每次搜索随机抽取不同页码，刷新总有新图

## 技术栈

| 层 | 说明 |
|---|---|
| 前端 | 原生 HTML/CSS/JS，零依赖 |
| 后端 | Cloudflare Worker，代理 Pexels API |
| 部署 | Cloudflare Workers（一键部署） |

API Key 只存在于 Cloudflare 环境变量中，前端永不暴露。

## 项目结构

```
├── worker.js              # Cloudflare Worker 入口（代理 API + 托管 HTML）
├── index.html             # 前端页面
├── wrangler.toml          # Cloudflare 部署配置
├── .gitignore
├── .dev.vars.example      # 本地开发变量模板
└── README.md
```

## 部署

### 前置条件

- [Cloudflare 账号](https://cloudflare.com)
- 一个 [Pexels API Key](https://www.pexels.com/api/)（免费注册即可获取）

### 一键部署

点击上方 **Deploy to Cloudflare Workers** 按钮，Cloudflare 会自动拉取仓库代码并创建 Worker。部署完成后还需要做一步配置。

### 部署后配置：设置 API Key

Worker 需要读取 `PEXELS_API_KEY` 环境变量才能正常工作，部署后不会自动设置，需要手动添加：

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → 左侧菜单 **Workers & Pages**
2. 点击刚创建的 `pexels-gallery` Worker
3. 进入 **Settings** → **Variables and Secrets**
4. 点击 **Add Secret**：
   - **Secret name** 填入：`PEXELS_API_KEY`
   - **Value** 填入你的 Pexels API Key
5. 点击 **Save and deploy**

配置完成后访问 Worker 的 `*.workers.dev` 域名即可使用。

### 可选：绑定自定义域名

在 Worker 详情页 → **Settings** → **Domains & Routes** → **Custom Domains** 中添加自己的域名。

## License

MIT
