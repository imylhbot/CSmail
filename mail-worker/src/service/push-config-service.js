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
		for (const rule of result.domainRules || []) {
			for (const target of rule.targets || []) {
				for (const key of ['webhookUrl','botToken','deviceKey','sendKey','token','secret','url']) {
					if (target.settings?.[key]) target.settings[key] = mask(target.settings[key], 6);
				}
			}
		}

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
		];

		for (const [section, key] of secretPaths) {
			if (patch?.[section] && Object.prototype.hasOwnProperty.call(patch[section], key)) {
				patch[section][key] = mergeMasked(oldConfig?.[section]?.[key], patch[section][key]);
			}
		}

		// Validate and merge domain routing rules. Never lose saved secrets when a masked value is submitted.
		if (Object.prototype.hasOwnProperty.call(patch, 'domainRules')) {
			if (!Array.isArray(patch.domainRules) || patch.domainRules.length > 100) throw new Error('Invalid domain rules');
			const oldRules = new Map((oldConfig.domainRules || []).map(x => [String(x.id), x]));
			const seenRules = new Set();
			const allowed = new Set(['wecom','feishu','dingtalk','telegram','discord','bark','serverchan','pushplus','webhook']);
			for (const rule of patch.domainRules) {
				if (!rule || typeof rule.id !== 'string' || rule.id.length > 100 || seenRules.has(rule.id)) throw new Error('Invalid/duplicate rule ID');
				seenRules.add(rule.id);
				if (!Array.isArray(rule.domains) || !rule.domains.length || rule.domains.length > 100) throw new Error('Invalid domains');
				if (rule.domains.some(d => typeof d !== 'string' || !/^(\*|[a-z0-9-]+(\.[a-z0-9-]+)+)$/i.test(d.trim()))) throw new Error('Invalid domain name');
				if (!Array.isArray(rule.targets) || rule.targets.length > 100) throw new Error('Invalid targets');
				const seenTargets = new Set();
				const previous = new Map((oldRules.get(rule.id)?.targets || []).map(x => [String(x.id), x]));
				for (const target of rule.targets) {
					if (!target || typeof target.id !== 'string' || target.id.length > 100 || seenTargets.has(target.id) || !allowed.has(target.provider)) throw new Error('Invalid target');
					seenTargets.add(target.id);
					if (!target.settings || typeof target.settings !== 'object' || Array.isArray(target.settings)) throw new Error('Invalid target settings');
					const saved = previous.get(target.id);
					// A stable target ID may not silently change provider while retaining old credentials.
					if (saved?.provider && saved.provider !== target.provider) throw new Error('Create a new target ID to change provider');
					for (const key of ['webhookUrl','botToken','deviceKey','sendKey','token','secret','url']) {
						if (Object.prototype.hasOwnProperty.call(target.settings,key)) target.settings[key] = mergeMasked(saved?.settings?.[key],target.settings[key]);
					}
					if (['wecom','feishu','dingtalk','discord'].includes(target.provider) && target.settings.webhookUrl && !/^https:\/\//i.test(target.settings.webhookUrl)) throw new Error('Webhook must use HTTPS');
				}
			}
		}
		const finalConfig = deepMerge(oldConfig, patch);
		await c.env.kv.put(pushConst.KV_KEY, JSON.stringify(finalConfig));
		return finalConfig;
	},

};

export default pushConfigService;
