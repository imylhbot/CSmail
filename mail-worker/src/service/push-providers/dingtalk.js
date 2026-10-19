export default {
	async send(config, message) {
		if (!config.webhookUrl) return { skipped: true };
		const res = await fetch(config.webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				msgtype: 'text',
				text: { content: message.text }
			})
		});
		if (!res.ok) throw new Error(`钉钉 ${res.status}: ${await res.text()}`);
		const data = await res.json().catch(() => ({}));
		if ((data.errcode ?? 0) !== 0) throw new Error(`钉钉: ${JSON.stringify(data)}`);
		return data;
	}
};
