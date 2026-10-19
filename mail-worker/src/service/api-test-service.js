import BizError from '../error/biz-error';

function isPrivateIpv4(host) {
	const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (!m) return false;

	const parts = m.slice(1).map(Number);
	if (parts.some(v => v < 0 || v > 255)) return true;

	const [a, b] = parts;
	return (
		a === 10 ||
		a === 127 ||
		a === 0 ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168)
	);
}

function validateUrl(raw) {
	let url;
	try {
		url = new URL(raw);
	} catch {
		throw new BizError('测试 URL 不合法', 400);
	}

	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new BizError('只允许 HTTP/HTTPS', 400);
	}

	const hostname = url.hostname.toLowerCase();
	if (
		hostname === 'localhost' ||
		hostname === 'metadata.google.internal' ||
		hostname.endsWith('.localhost') ||
		isPrivateIpv4(hostname)
	) {
		throw new BizError('禁止访问本地、私网或元数据地址', 400);
	}

	return url;
}

function normalizeHeaders(headers) {
	const safe = {};
	if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return safe;

	for (const [key, value] of Object.entries(headers)) {
		if (!key || value === undefined || value === null) continue;
		safe[String(key)] = String(value);
	}
	return safe;
}

const apiTestService = {
	async request(c, params = {}) {
		const method = String(params.method || 'GET').toUpperCase();
		if (!['GET', 'POST'].includes(method)) {
			throw new BizError('测试器目前只支持 GET / POST', 400);
		}

		const url = validateUrl(params.url);
		const headers = normalizeHeaders(params.headers);

		const init = {
			method,
			headers,
			redirect: 'manual'
		};

		if (method === 'POST' && params.body !== undefined && params.body !== null && params.body !== '') {
			if (typeof params.body === 'string') {
				init.body = params.body;
			} else {
				if (!headers['Content-Type'] && !headers['content-type']) {
					headers['Content-Type'] = 'application/json;charset=UTF-8';
				}
				init.body = JSON.stringify(params.body);
			}
		}

		const started = Date.now();

		try {
			const response = await fetch(url.toString(), init);
			const text = await response.text();

			const responseHeaders = {};
			response.headers.forEach((value, key) => {
				responseHeaders[key] = value;
			});

			return {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
				elapsedMs: Date.now() - started,
				headers: responseHeaders,
				body: text.slice(0, 200000)
			};
		} catch (e) {
			return {
				ok: false,
				status: 0,
				statusText: 'FETCH_ERROR',
				elapsedMs: Date.now() - started,
				headers: {},
				body: e?.message || String(e)
			};
		}
	}
};

export default apiTestService;
