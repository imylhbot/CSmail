export default {
	async send(config, message) {
		if (!config.webhookUrl) return { skipped: true };
		const res = await fetch(config.webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				content: message.text.slice(0, 1900),
				allowed_mentions: { parse: [] }
			})
		});
		if (!res.ok) throw new Error(`Discord ${res.status}: ${await res.text()}`);
		return true;
	}
};
