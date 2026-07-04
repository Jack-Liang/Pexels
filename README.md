# Pexels 画廊

基于 Pexels API 的在线图片画廊，支持搜索、预览、下载及复制链接，部署在 Cloudflare Workers。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Jack-Liang/Pexels)

## 功能

- **关键词搜索** — 输入任意英文关键词搜索高质量图片
- **多方向筛选** — 横向 16:9 / 竖向 9:16 / 正方形 1:1
- **灵活布局** — 3/6/9/12 张可选，自适应网格
- **大图预览** — 缩略图到高清图的平滑过渡动画，带加载感知
- **完整信息** — 展示分辨率、主色调、摄影师卡片、Pexels 来源链接
- **多尺寸下载** — Original ~ Tiny 六档，点击直接下载不跳转
- **一键复制链接** — 每种尺寸的图片直链一键复制，粘贴到 Markdown 文档即可用
- **翻页浏览** — 相同关键词点击「刷新图片」逐页加载下一批，直到无更多结果
- **随机图片 API** — 提供 `GET /api/random` 接口，可直接嵌入 `<img>` 或返回 JSON

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

## 随机图片 API

对外暴露一个 `GET /api/random` 接口，每次请求返回一张随机图片，可直接用于 `<img>` 标签或程序调用。

```
GET /api/random
```

### 查询参数

| 参数 | 可选值 | 默认值 | 说明 |
|------|--------|--------|------|
| `query` | 任意英文关键词 | 从预置关键词中随机选取 | 搜索主题 |
| `orientation` | `landscape` / `portrait` / `square` | 不限 | 图片方向 |
| `size` | `original` / `large2x` / `large` / `medium` / `small` / `portrait` / `landscape` / `tiny` | `large` | 返回的图片分辨率 |
| `format` | `redirect` / `json` | `redirect` | 返回形式：跳转到图片 或 返回图片信息 |

> 预置关键词：landscape、city、ocean、mountain、sunset、forest、flower、animal、architecture、night、travel、nature、portrait、abstract、food。

### 两种返回形式

**1. `format=redirect`（默认）** — 返回 `302` 重定向到图片直链，并带 `Cache-Control: no-store`，保证每次都是新图。适合直接嵌入或下载：

```html
<!-- 每次刷新都是随机图 -->
<img src="/api/random?query=ocean&orientation=landscape">
```

```bash
# 跟随重定向下载随机图
curl -L "https://<你的域名>/api/random?query=nature&size=large2x" -o random.jpg
```

**2. `format=json`** — 返回图片完整信息：

```bash
curl "https://<你的域名>/api/random?query=ocean&format=json"
```

```json
{
  "id": 27607186,
  "width": 6000,
  "height": 4000,
  "url": "https://www.pexels.com/photo/...",
  "photographer": "Diana Rafira",
  "photographer_url": "https://www.pexels.com/@...",
  "avg_color": "#2B5C6B",
  "alt": "Aerial shot of ocean waves...",
  "image": "https://images.pexels.com/photos/27607186/...",
  "src": { "original": "...", "large2x": "...", "large": "...", "medium": "...", "small": "...", "portrait": "...", "landscape": "...", "tiny": "..." }
}
```

其中 `image` 为按 `size` 参数选中的图片直链，`src` 包含全部可用尺寸。

> 随机性经过安全处理：先读取 `total_results`，仅在有效页范围内随机翻页，避免页码过大导致取不到数据。

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

## 本地开发与测试

借助 [Wrangler](https://developers.cloudflare.com/workers/wrangler/) 可在本地启动 Worker，实时预览页面与调试 API。

### 前置条件

- [Node.js](https://nodejs.org/) 18+（自带 `npx`）
- 一个 [Pexels API Key](https://www.pexels.com/api/)

### 步骤

1. **配置本地环境变量**：在项目根目录新建 `.dev.vars` 文件（该文件已被 `.gitignore` 忽略，不会提交），写入你的 Key：

   ```ini
   PEXELS_API_KEY=你的_pexels_api_key
   ```

2. **启动开发服务器**：

   ```bash
   npx wrangler dev
   ```

   首次运行会自动下载 Wrangler。启动后终端会显示本地地址（默认 `http://127.0.0.1:8787`），可用 `--port` 指定端口：

   ```bash
   npx wrangler dev --port 8787
   ```

3. **在浏览器打开** `http://127.0.0.1:8787` 即可看到画廊页面，修改 `index.html` / `worker.js` 后 Wrangler 会自动热重载。

### 验证接口

```bash
# 页面
curl -s http://127.0.0.1:8787/ | head

# 搜索代理
curl "http://127.0.0.1:8787/api/pexels?query=city&per_page=3&page=1"

# 随机图片（JSON）
curl "http://127.0.0.1:8787/api/random?query=ocean&format=json"

# 随机图片（跟随 302 下载）
curl -L "http://127.0.0.1:8787/api/random?query=nature" -o random.jpg
```

> **提示**：若运行环境限制 Wrangler 写入全局配置目录（如权限受限的沙箱），可将其配置目录重定向到项目内再启动：
>
> ```bash
> XDG_CONFIG_HOME="$PWD/.wrangler-home" WRANGLER_SEND_METRICS=false npx wrangler dev
> ```

## License

MIT
