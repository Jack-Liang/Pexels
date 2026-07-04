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
 *   GET /api/random   → 返回一张随机图片（默认 302 重定向到图片，可带参数）
 *
 * /api/random 支持的查询参数：
 *   query       搜索关键词，默认从预置关键词中随机选取
 *   orientation 图片方向：landscape | portrait | square
 *   size        返回的图片尺寸：original | large2x | large | medium | small | portrait | landscape | tiny（默认 large）
 *   format      返回格式：redirect（默认，302 跳转到图片）| json（返回图片完整信息）
 */

import html from './index.html';

// 预置关键词：当 /api/random 未指定 query 时随机选取一个
const PRESET_KEYWORDS = [
	'landscape', 'city', 'ocean', 'mountain', 'sunset',
	'forest', 'flower', 'animal', 'architecture', 'night',
	'travel', 'nature', 'portrait', 'abstract', 'food',
];

// Pexels 搜索单页最大数量
const MAX_PER_PAGE = 80;
// Pexels 搜索结果的实际可翻页上限，超出会取不到数据，用于收敛随机页范围
const MAX_SEARCHABLE_RESULTS = 8000;

function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Access-Control-Allow-Origin': '*',
		},
	});
}

function pickRandom(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

async function pexelsSearch(env, { query, orientation, page }) {
	const api = new URL('https://api.pexels.com/v1/search');
	api.searchParams.set('query', query);
	api.searchParams.set('per_page', String(MAX_PER_PAGE));
	api.searchParams.set('page', String(page));
	if (orientation) api.searchParams.set('orientation', orientation);
	return fetch(api, { headers: { Authorization: env.PEXELS_API_KEY } });
}

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

		// ---- 随机图片 API ----
		if (path === '/api/random') {
			if (!env.PEXELS_API_KEY) {
				return jsonResponse({ error: 'Server misconfigured: PEXELS_API_KEY not set' }, 500);
			}

			const params = url.searchParams;
			const query = (params.get('query') || '').trim() || pickRandom(PRESET_KEYWORDS);
			const orientation = params.get('orientation') || '';
			const sizeKey = params.get('size') || 'large';
			const format = (params.get('format') || 'redirect').toLowerCase();

			// 第一次请求取 total_results，据此计算安全的随机页范围（避免翻过头取不到数据）
			const firstRes = await pexelsSearch(env, { query, orientation, page: 1 });
			if (!firstRes.ok) {
				return jsonResponse({ error: '上游 Pexels 请求失败，请稍后重试' }, 502);
			}
			const firstData = await firstRes.json();
			const total = firstData.total_results || 0;
			if (!total || !firstData.photos?.length) {
				return jsonResponse({ error: `未找到「${query}」相关图片` }, 404);
			}

			// 收敛到实际可翻页范围内的随机页
			const maxPage = Math.max(1, Math.ceil(Math.min(total, MAX_SEARCHABLE_RESULTS) / MAX_PER_PAGE));
			const randomPage = Math.floor(Math.random() * maxPage) + 1;

			let photos = firstData.photos;
			if (randomPage !== 1) {
				const pageRes = await pexelsSearch(env, { query, orientation, page: randomPage });
				if (pageRes.ok) {
					const pageData = await pageRes.json();
					// 极端情况下高页码可能返回空，回退到第一页结果
					if (pageData.photos?.length) photos = pageData.photos;
				}
			}

			// 从当页结果里随机取一张
			const photo = pickRandom(photos);
			const imageUrl = photo.src[sizeKey] || photo.src.large;

			if (format === 'json') {
				return jsonResponse({
					id: photo.id,
					width: photo.width,
					height: photo.height,
					url: photo.url,
					photographer: photo.photographer,
					photographer_url: photo.photographer_url,
					avg_color: photo.avg_color,
					alt: photo.alt,
					image: imageUrl,
					src: photo.src,
				});
			}

			// 默认 302 重定向到图片，方便 <img src="/api/random"> 直接使用
			return new Response(null, {
				status: 302,
				headers: {
					Location: imageUrl,
					'Access-Control-Allow-Origin': '*',
					'Cache-Control': 'no-store',
				},
			});
		}

		// ---- 静态 HTML 页面 ----
		return new Response(html, {
			headers: { 'Content-Type': 'text/html; charset=utf-8' },
		});
	},
};
