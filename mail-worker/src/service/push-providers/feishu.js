export default {
	async send(config, message) {
		if (!config.webhookUrl) return { skipped: true };
		const res = await fetch(config.webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
			body: JSON.stringify({
				msg_type: 'text',
				content: { text: message.text }
			})
		});
		if (!res.ok) throw new Error(`飞书 ${res.status}: ${await res.text()}`);
		const data = await res.json().catch(() => ({}));
		if ((data.code ?? 0) !== 0) throw new Error(`飞书: ${JSON.stringify(data)}`);
		return data;
	}
};
