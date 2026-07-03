/**
 * Pexels 画廊 — Cloudflare Worker
 *
 * 部署：点击 README 中的 "Deploy to Cloudflare Workers" 一键部署按钮。
 * 部署后在 Cloudflare Dashboard → Workers & Pages → 对应 Worker →
 * Settings → Variables and Secrets → 添加 Secret：PEXELS_API_KEY
 *
 * 环境变量：
 *   PEXELS_API_KEY — 你的 Pexels API Key (必填)
 *
 * 路由说明：
 *   GET /             → 返回画廊 HTML 页面
 *   GET /api/pexels   → 代理 Pexels API 搜索请求，服务端注入 Authorization
 */

import html from './index.html';

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;

		// ---- 代理 Pexels API ----
		if (path === '/api/pexels') {
			if (!env.PEXELS_API_KEY) {
				return new Response(JSON.stringify({ error: 'Server misconfigured: PEXELS_API_KEY not set' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// 把前端传来的 query 参数透传到 Pexels API
			const pexelsUrl = new URL('https://api.pexels.com/v1/search');
			for (const [key, value] of url.searchParams) {
				pexelsUrl.searchParams.set(key, value);
			}

			const pexelsRes = await fetch(pexelsUrl, {
				headers: { Authorization: env.PEXELS_API_KEY },
			});

			// 透传响应（跨域头确保前端能读取）
			const res = new Response(pexelsRes.body, pexelsRes);
			res.headers.set('Access-Control-Allow-Origin', '*');
			return res;
		}

		// ---- 静态 HTML 页面 ----
		return new Response(html, {
			headers: { 'Content-Type': 'text/html; charset=utf-8' },
		});
	},
};
