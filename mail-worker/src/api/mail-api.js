import app from '../hono/hono';
import result from '../model/result';
import pushConfigService from '../service/push-config-service';
import pushConst from '../const/push-const';
import mailApiService from '../service/mail-api-service';
import mailPasswordAuthService from '../service/mail-password-auth-service';
import BizError from '../error/biz-error';

export async function authMailApi(c) {
	const config = await pushConfigService.get(c);

	if (!config.api?.enabled) {
		throw new BizError('Mail API disabled', 403);
	}

	const expected = config.api?.key;
	const bearer = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
	const actual = c.req.header(pushConst.API_KEY_HEADER) || bearer;

	if (!expected || !actual || actual !== expected) {
		throw new BizError('Invalid API key', 401);
	}

	return config;
}

async function optionalJson(c) {
	const contentType = c.req.header('content-type') || '';
	if (!contentType.includes('application/json')) return {};
	try {
		return await c.req.json();
	} catch {
		return {};
	}
}

async function credentialParams(c) {
	if (c.req.method === 'GET') {
		return {
			user: c.req.query('user') || c.req.query('email') || '',
			pass: c.req.query('pass') || c.req.query('password') || '',
			page: c.req.query('page'),
			size: c.req.query('size'),
			sort: c.req.query('sort')
		};
	}

	const contentType = c.req.header('content-type') || '';

	if (contentType.includes('application/json')) {
		try {
			const body = await c.req.json();
			return {
				user: body.user || body.email || '',
				pass: body.pass || body.password || '',
				page: body.page,
				size: body.size,
				sort: body.sort
			};
		} catch {
			return {};
		}
	}

	if (
		contentType.includes('application/x-www-form-urlencoded') ||
		contentType.includes('multipart/form-data')
	) {
		const body = await c.req.parseBody();
		return {
			user: body.user || body.email || '',
			pass: body.pass || body.password || '',
			page: body.page,
			size: body.size,
			sort: body.sort
		};
	}

	// 允许 POST Content-Length: 0 + query 参数
	return {
		user: c.req.query('user') || c.req.query('email') || '',
		pass: c.req.query('pass') || c.req.query('password') || '',
		page: c.req.query('page'),
		size: c.req.query('size'),
		sort: c.req.query('sort')
	};
}

async function unreadExtract(c, address) {
	const config = await authMailApi(c);

	if (!config.api?.unreadExtractEnabled) {
		throw new BizError('Unread extraction disabled', 403);
	}

	const limit = Math.min(10, Math.max(1, Number(config.api?.unreadLimit) || 10));

	const data = config.api?.markReadAfterExtract === false
		? await mailApiService.unreadList(c, address, limit)
		: await mailApiService.consumeUnread(c, address, limit);

	return c.json(result.ok({
		mailbox: decodeURIComponent(address),
		count: data.length,
		markReadAfterExtract: config.api?.markReadAfterExtract !== false,
		list: data
	}));
}

// ----------------------------------------------------
// 账号 + 密码取件 API
// 不需要全局 x-api-key；只允许读取登录邮箱本身。
// GET 为兼容使用，POST 更安全，推荐 POST。
// ----------------------------------------------------

async function passwordList(c) {
	const params = await credentialParams(c);
	const userRow = await mailPasswordAuthService.verify(
		c,
		params.user,
		params.pass
	);

	const data = await mailApiService.mailbox(c, userRow.email, {
		page: params.page || 1,
		size: params.size || 20,
		sort: params.sort || 'desc'
	});

	return c.json(result.ok({
		mailbox: userRow.email,
		count: data.length,
		list: data
	}));
}

app.get('/mail-api/auth/list', passwordList);
app.post('/mail-api/auth/list', passwordList);

async function passwordUnread(c) {
	const params = await credentialParams(c);
	const userRow = await mailPasswordAuthService.verify(
		c,
		params.user,
		params.pass
	);

	const config = await pushConfigService.get(c);
	if (!config.api?.unreadExtractEnabled) {
		throw new BizError('Unread extraction disabled', 403);
	}

	const limit = Math.min(10, Math.max(1, Number(config.api?.unreadLimit) || 10));

	const data = config.api?.markReadAfterExtract === false
		? await mailApiService.unreadList(c, userRow.email, limit)
		: await mailApiService.consumeUnread(c, userRow.email, limit);

	return c.json(result.ok({
		mailbox: userRow.email,
		count: data.length,
		markReadAfterExtract: config.api?.markReadAfterExtract !== false,
		list: data
	}));
}

app.get('/mail-api/auth/unread', passwordUnread);
app.post('/mail-api/auth/unread', passwordUnread);

// ----------------------------------------------------
// 全局 API Key 接口（原有功能继续保留）
// ----------------------------------------------------

app.post('/mail-api/list', async (c) => {
	await authMailApi(c);
	const data = await mailApiService.list(c, await optionalJson(c));
	return c.json(result.ok(data));
});

app.get('/mail-api/unread/:address', async (c) => {
	return unreadExtract(c, c.req.param('address'));
});

app.post('/mail-api/unread/:address', async (c) => {
	return unreadExtract(c, c.req.param('address'));
});

app.get('/mail-api/mailbox/:address', async (c) => {
	await authMailApi(c);
	const data = await mailApiService.mailbox(c, c.req.param('address'), {
		page: c.req.query('page'),
		size: c.req.query('size'),
		sort: c.req.query('sort')
	});
	return c.json(result.ok(data));
});

app.post('/mail-api/mailbox/:address', async (c) => {
	await authMailApi(c);
	const body = await optionalJson(c);
	const data = await mailApiService.mailbox(c, c.req.param('address'), body);
	return c.json(result.ok(data));
});

app.get('/mail-api/:target', async (c) => {
	await authMailApi(c);
	const target = decodeURIComponent(c.req.param('target'));

	if (target.includes('@')) {
		const data = await mailApiService.mailbox(c, target, {
			page: c.req.query('page'),
			size: c.req.query('size'),
			sort: c.req.query('sort')
		});
		return c.json(result.ok(data));
	}

	if (/^\d+$/.test(target)) {
		const data = await mailApiService.detail(c, target);
		return c.json(result.ok(data));
	}

	throw new BizError('Invalid mailbox address or emailId', 400);
});

app.post('/mail-api/:target', async (c) => {
	await authMailApi(c);
	const target = decodeURIComponent(c.req.param('target'));

	if (!target.includes('@')) {
		throw new BizError('POST direct endpoint requires an email address', 400);
	}

	const body = await optionalJson(c);
	const data = await mailApiService.mailbox(c, target, body);
	return c.json(result.ok(data));
});
