import pushConst from '../const/push-const';

function deepMerge(base, patch) {
	if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base;
	const result = { ...base };
	for (const [key, value] of Object.entries(patch)) {
		if (
			value &&
			typeof value === 'object' &&
			!Array.isArray(value) &&
			base[key] &&
			typeof base[key] === 'object' &&
			!Array.isArray(base[key])
		) {
			result[key] = deepMerge(base[key], value);
		} else {
			result[key] = value;
		}
	}
	return result;
}

function mask(value, keep = 6) {
	if (!value) return '';
	if (value.length <= keep) return '******';
	return `${value.slice(0, keep)}******`;
}

function mergeMasked(oldValue, newValue) {
	if (typeof newValue !== 'string') return newValue;
	if (newValue.endsWith('******')) return oldValue || '';
	return newValue;
}

const pushConfigService = {

	async get(c) {
		const saved = await c.env.kv.get(pushConst.KV_KEY, { type: 'json' });
		return deepMerge(pushConst.DEFAULT_CONFIG, saved || {});
	},

	async getMasked(c) {
		const config = await this.get(c);
		const result = structuredClone(config);

		result.telegram.botToken = mask(result.telegram.botToken, 10);
		result.discord.webhookUrl = mask(result.discord.webhookUrl, 24);
		result.wecom.webhookUrl = mask(result.wecom.webhookUrl, 24);
		result.feishu.webhookUrl = mask(result.feishu.webhookUrl, 24);
		result.dingtalk.webhookUrl = mask(result.dingtalk.webhookUrl, 24);
		result.bark.deviceKey = mask(result.bark.deviceKey, 6);
		result.serverchan.sendKey = mask(result.serverchan.sendKey, 8);
		result.pushplus.token = mask(result.pushplus.token, 8);
		result.webhook.secret = mask(result.webhook.secret, 6);
		result.api.key = mask(result.api.key, 6);

		return result;
	},

	async set(c, incoming) {
		const oldConfig = await this.get(c);
		const patch = structuredClone(incoming || {});

		const secretPaths = [
			['telegram', 'botToken'],
			['discord', 'webhookUrl'],
			['wecom', 'webhookUrl'],
			['feishu', 'webhookUrl'],
			['dingtalk', 'webhookUrl'],
			['bark', 'deviceKey'],
			['serverchan', 'sendKey'],
			['pushplus', 'token'],
			['webhook', 'secret'],
			['api', 'key']
		];

		for (const [section, key] of secretPaths) {
			if (patch?.[section] && Object.prototype.hasOwnProperty.call(patch[section], key)) {
				patch[section][key] = mergeMasked(oldConfig?.[section]?.[key], patch[section][key]);
			}
		}

		const finalConfig = deepMerge(oldConfig, patch);
		await c.env.kv.put(pushConst.KV_KEY, JSON.stringify(finalConfig));
		return finalConfig;
	},

	async generateApiKey(c) {
		const bytes = crypto.getRandomValues(new Uint8Array(32));
		const key = Array.from(bytes).map(v => v.toString(16).padStart(2, '0')).join('');
		const config = await this.get(c);
		config.api.enabled = true;
		config.api.key = key;
		await c.env.kv.put(pushConst.KV_KEY, JSON.stringify(config));
		return key;
	}
};

export default pushConfigService;
