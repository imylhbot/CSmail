import app from '../hono/hono';
import result from '../model/result';
import pushConfigService from '../service/push-config-service';
import pushService from '../service/push-service';
import userContext from '../security/user-context';
import BizError from '../error/biz-error';
const admin = c => { if(userContext.getUser(c)?.email !== c.env.admin) throw new BizError('Administrator required',403); };

app.get('/push/config', async (c) => {
 admin(c);
	const config = await pushConfigService.getMasked(c);
	return c.json(result.ok(config));
});

app.put('/push/config', async (c) => {
 admin(c);
	await pushConfigService.set(c, await c.req.json());
	return c.json(result.ok());
});

app.post('/push/test/:provider', async (c) => {
 admin(c);
	const provider = c.req.param('provider');
	const data = await pushService.test(c, provider);
	return c.json(result.ok(data));
});


