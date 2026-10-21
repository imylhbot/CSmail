import app from '../hono/hono';
import userService from '../service/user-service';
import result from '../model/result';
import userContext from '../security/user-context';
import accountService from '../service/account-service';
import userBatchService from '../service/user-batch-service';

app.delete('/user/delete', async (c) => {
	await userService.physicsDelete(c, c.req.query());
	return c.json(result.ok());
});

app.put('/user/setPwd', async (c) => {
	await userService.setPwd(c, await c.req.json());
	return c.json(result.ok());
});

app.put('/user/setStatus', async (c) => {
	await userService.setStatus(c, await c.req.json());
	return c.json(result.ok());
});

app.put('/user/setType', async (c) => {
	await userService.setType(c, await c.req.json());
	return c.json(result.ok());
});

app.get('/user/list', async (c) => {
	const data = await userService.list(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/user/add', async (c) => {
	await userService.add(c, await c.req.json());
	return c.json(result.ok());
});

// 新增：仅解析预览，不创建
app.post('/user/batchParse', async (c) => {
	const { rawText } = await c.req.json();
	const data = userBatchService.parse(rawText);
	return c.json(result.ok(data));
});

// 新增：批量创建用户账号
app.post('/user/batchAdd', async (c) => {
	const data = await userBatchService.create(c, await c.req.json());
	return c.json(result.ok(data));
});

app.put('/user/resetSendCount', async (c) => {
	await userService.resetSendCount(c, await c.req.json());
	return c.json(result.ok());
});

app.put('/user/restore', async (c) => {
	await userService.restore(c, await c.req.json());
	return c.json(result.ok());
});

app.get('/user/allAccount', async (c) => {
	const data = await accountService.allAccount(c, c.req.query());
	return c.json(result.ok(data));
});

app.delete('/user/deleteAccount', async (c) => {
	await accountService.physicsDelete(c, c.req.query());
	return c.json(result.ok());
});
