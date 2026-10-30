export default {
	async send(config, message) {
		if (!config.botToken || !config.chatIds) return { skipped: true };
		const ids = String(config.chatIds).split(',').map(v => v.trim()).filter(Boolean);
		const results = await Promise.allSettled(ids.map(async chatId => {
			const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: chatId,
					text: message.text,
					disable_web_page_preview: true
				})
			});
			if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
			return true;
		}));
		return { results };
	}
};
