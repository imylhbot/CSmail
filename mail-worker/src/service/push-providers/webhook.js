export default {
	async send(config, message) {
		if (!config.url) return { skipped: true };

		const headers = {
			'Content-Type': 'application/json',
			...(config.headers && typeof config.headers === 'object' ? config.headers : {})
		};

		if (config.secret) {
			headers['Authorization'] = `Bearer ${config.secret}`;
			headers['X-Webhook-Secret'] = config.secret;
		}

		const res = await fetch(config.url, {
			method: 'POST',
			headers,
			body: JSON.stringify(message.payload)
		});

		if (!res.ok) throw new Error(`Webhook ${res.status}: ${await res.text()}`);
		return true;
	}
};
