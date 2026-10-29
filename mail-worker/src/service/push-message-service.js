function stripHtml(html = '') {
	return String(html)
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/\s+/g, ' ')
		.trim();
}

function truncate(text, max = 1400) {
	text = String(text || '');
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

const pushMessageService = {
	build(email) {
		const preview = truncate(email.text || stripHtml(email.content || ''), 1200);
		const title = email.subject || '新邮件';
		const codeLine = email.code ? `\n验证码: ${email.code}` : '';

		const text =
`📨 新邮件
收件人: ${email.toEmail || ''}
发件人: ${email.name || ''} <${email.sendEmail || ''}>
主题: ${title}${codeLine}
时间: ${email.createTime || ''}

${preview}`;

		return {
			title,
			text,
			preview,
			payload: {
				event: 'email.received',
				email: {
					emailId: email.emailId,
					toEmail: email.toEmail,
					toName: email.toName,
					sendEmail: email.sendEmail,
					sendName: email.name,
					subject: email.subject,
					code: email.code,
					text: email.text,
					content: email.content,
					messageId: email.messageId,
					createTime: email.createTime
				}
			}
		};
	}
};

export default pushMessageService;
