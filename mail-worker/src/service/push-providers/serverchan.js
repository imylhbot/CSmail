export default {
	async send(config, message) {
		if (!config.sendKey) return { skipped: true };
		const url = `https://sctapi.ftqq.com/${encodeURIComponent(config.sendKey)}.send`;
		const body = new URLSearchParams();
		body.set('title', message.title.slice(0, 32));
		body.set('desp', message.text);
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
			body
		});
		if (!res.ok) throw new Error(`Server酱 ${res.status}: ${await res.text()}`);
		return await res.json().catch(() => ({}));
	}
};
