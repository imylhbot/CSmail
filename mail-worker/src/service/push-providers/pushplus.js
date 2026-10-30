export default {
	async send(config, message) {
		if (!config.token) return { skipped: true };
		const res = await fetch('https://www.pushplus.plus/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				token: config.token,
				title: message.title,
				content: message.text,
				template: 'txt',
				topic: config.topic || undefined
			})
		});
		if (!res.ok) throw new Error(`PushPlus ${res.status}: ${await res.text()}`);
		const data = await res.json().catch(() => ({}));
		if (data.code && data.code !== 200) throw new Error(`PushPlus: ${JSON.stringify(data)}`);
		return data;
	}
};
