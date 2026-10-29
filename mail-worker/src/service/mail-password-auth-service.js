import BizError from '../error/biz-error';
import userService from './user-service';
import cryptoUtils from '../utils/crypto-utils';
import reqUtils from '../utils/req-utils';
import { isDel, userConst } from '../const/entity-const';

const FAIL_LIMIT = 10;
const FAIL_WINDOW_SECONDS = 300;

async function rateKey(c, email) {
	const ip = reqUtils.getIp(c) || 'unknown';
	const raw = `${ip}|${String(email || '').toLowerCase()}`;
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(raw)
	);
	const hex = Array.from(new Uint8Array(digest))
		.map(v => v.toString(16).padStart(2, '0'))
		.join('');
	return `MAIL_PASSWORD_API_FAIL:${hex}`;
}

const mailPasswordAuthService = {

	async assertAllowed(c, email) {
		const key = await rateKey(c, email);
		const count = Number(await c.env.kv.get(key) || 0);
		if (count >= FAIL_LIMIT) {
			throw new BizError('Too many password attempts, try again later', 429);
		}
		return key;
	},

	async recordFail(c, key) {
		const count = Number(await c.env.kv.get(key) || 0) + 1;
		await c.env.kv.put(key, String(count), {
			expirationTtl: FAIL_WINDOW_SECONDS
		});
	},

	async clearFail(c, key) {
		await c.env.kv.delete(key);
	},

	async verify(c, email, password) {
		email = String(email || '').trim().toLowerCase();
		password = String(password || '');

		if (!email || !password) {
			throw new BizError('user and pass are required', 400);
		}

		const key = await this.assertAllowed(c, email);

		const userRow = await userService.selectByEmailIncludeDel(c, email);

		// 统一错误文案，避免通过响应判断邮箱是否存在。
		if (
			!userRow ||
			userRow.isDel === isDel.DELETE ||
			userRow.status === userConst.status.BAN
		) {
			await this.recordFail(c, key);
			throw new BizError('Invalid email or password', 401);
		}

		const ok = await cryptoUtils.verifyPassword(
			password,
			userRow.salt,
			userRow.password
		);

		if (!ok) {
			await this.recordFail(c, key);
			throw new BizError('Invalid email or password', 401);
		}

		await this.clearFail(c, key);
		return userRow;
	}
};

export default mailPasswordAuthService;
