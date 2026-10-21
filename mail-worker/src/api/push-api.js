import app from '../hono/hono';
import result from '../model/result';
import pushConfigService from '../service/push-config-service';
import pushService from '../service/push-service';

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


