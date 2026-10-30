import app from '../hono/hono';
import result from '../model/result';
import service from '../service/user-batch-service';
import userContext from '../security/user-context';
import BizError from '../error/biz-error';
const admin = c => { if(userContext.getUser(c)?.email !== c.env.admin) throw new BizError('Administrator required',403); };
app.post('/user/batchParse', async c => { admin(c); const {rawText}=await c.req.json(); return c.json(result.ok(service.parse(rawText))); });
app.post('/user/batchAdd', async c => { admin(c); return c.json(result.ok(await service.create(c,await c.req.json()))); });
