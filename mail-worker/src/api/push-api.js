import app from '../hono/hono';
import result from '../model/result';
import pushConfigService from '../service/push-config-service';
import pushService from '../service/push-service';
import apiTestService from '../service/api-test-service';

app.get('/push/config', async (c) => {
	const config = await pushConfigService.getMasked(c);
	return c.json(result.ok(config));
});

app.put('/push/config', async (c) => {
	await pushConfigService.set(c, await c.req.json());
	return c.json(result.ok());
});

app.post('/push/test/:provider', async (c) => {
	const provider = c.req.param('provider');
	const data = await pushService.test(c, provider);
	return c.json(result.ok(data));
});


app.get('/push/apiKey/reveal', async (c) => {
	const config = await pushConfigService.get(c);
	return c.json(result.ok({
		enabled: config.api?.enabled !== false,
		key: config.api?.key || '',
		scope: 'global',
		description: '全局 Mail API Key：对所有邮箱地址通用'
	}));
});

app.post('/push/apiKey/regenerate', async (c) => {
	const key = await pushConfigService.generateApiKey(c);
	return c.json(result.ok({ key }));
});

// 外部 HTTP 测试：真实 fetch 到公网 URL
app.post('/push/api-tester/request', async (c) => {
	const data = await apiTestService.request(c, await c.req.json());
	return c.json(result.ok(data));
});

// 内部 Hono 路由测试：不经过公网、Cloudflare DNS、Nginx。
// 用于测试当前 Worker 自己的 /mail-api/* 路由。
app.post('/push/api-tester/internal', async (c) => {
	const params = await c.req.json();
	let path = String(params.path || '').trim();
	const method = String(params.method || 'GET').toUpperCase();

	if (!['GET', 'POST'].includes(method)) {
		return c.json(result.fail('仅支持 GET/POST', 400));
	}

	if (!path.startsWith('/')) {
		path = '/' + path;
	}

	// 公网路径 /api/... 在 src/index.js 会被去掉 /api；
	// app.request() 直接走 Hono，因此这里也去掉一次。
	if (path.startsWith('/api/')) {
		path = path.slice(4);
	}

	if (!path.startsWith('/mail-api/')) {
		return c.json(result.fail('内部测试只允许 /mail-api/*', 400));
	}

	const headers = new Headers();
	for (const [key, value] of Object.entries(params.headers || {})) {
		if (value !== undefined && value !== null) {
			headers.set(String(key), String(value));
		}
	}

	const init = { method, headers };

	if (method === 'POST' && params.body !== undefined && params.body !== null && params.body !== '') {
		if (typeof params.body === 'string') {
			init.body = params.body;
		} else {
			if (!headers.has('Content-Type')) {
				headers.set('Content-Type', 'application/json;charset=UTF-8');
			}
			init.body = JSON.stringify(params.body);
		}
	}

	const started = Date.now();
	const response = await app.request(path, init, c.env);
	const text = await response.text();

	const responseHeaders = {};
	response.headers.forEach((value, key) => {
		responseHeaders[key] = value;
	});

	return c.json(result.ok({
		ok: response.ok,
		status: response.status,
		statusText: response.statusText,
		elapsedMs: Date.now() - started,
		headers: responseHeaders,
		body: text,
		internal: true,
		path
	}));
});
