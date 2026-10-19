import pushConfigService from './push-config-service';
import pushMessageService from './push-message-service';

import telegram from './push-providers/telegram';
import discord from './push-providers/discord';
import wecom from './push-providers/wecom';
import feishu from './push-providers/feishu';
import dingtalk from './push-providers/dingtalk';
import bark from './push-providers/bark';
import serverchan from './push-providers/serverchan';
import pushplus from './push-providers/pushplus';
import webhook from './push-providers/webhook';

const providers = {
	telegram,
	discord,
	wecom,
	feishu,
	dingtalk,
	bark,
	serverchan,
	pushplus,
	webhook
};

const pushService = {

	async pushEmail(c, email) {
		const config = await pushConfigService.get(c);
		if (!config.enabled) return [];

		const message = pushMessageService.build(email);
		const jobs = [];

		for (const [name, provider] of Object.entries(providers)) {
			const providerConfig = config[name];
			if (!providerConfig?.enabled) continue;

			jobs.push(
				Promise.resolve()
					.then(() => provider.send(providerConfig, message))
					.then(value => ({ provider: name, ok: true, value }))
					.catch(error => {
						console.error(`[Push:${name}]`, error);
						return { provider: name, ok: false, error: error?.message || String(error) };
					})
			);
		}

		return Promise.allSettled(jobs);
	},

	async test(c, providerName) {
		const config = await pushConfigService.get(c);
		const provider = providers[providerName];
		if (!provider) throw new Error(`Unknown provider: ${providerName}`);

		const providerConfig = config[providerName];
		if (!providerConfig) throw new Error(`Missing provider config: ${providerName}`);

		const message = {
			title: 'Cloud Mail 推送测试',
			text: `✅ Cloud Mail ${providerName} 推送测试成功。\n时间: ${new Date().toISOString()}`,
			payload: {
				event: 'push.test',
				provider: providerName,
				time: new Date().toISOString()
			}
		};

		return provider.send(providerConfig, message);
	}
};

export default pushService;
