export default {
	async send(config, message) {
		if (!config.deviceKey) return { skipped: true };
		const base = String(config.serverUrl || 'https://api.day.app').replace(/\/+$/, '');
		const res = await fetch(`${base}/push`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				device_key: config.deviceKey,
				title: message.title,
				body: message.text,
				group: 'Cloud Mail'
			})
		});
		if (!res.ok) throw new Error(`Bark ${res.status}: ${await res.text()}`);
		return await res.json().catch(() => ({}));
	}
};
