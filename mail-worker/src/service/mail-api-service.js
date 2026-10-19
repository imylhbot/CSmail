import orm from '../entity/orm';
import email from '../entity/email';
import { emailConst, isDel } from '../const/entity-const';
import { and, asc, desc, eq, inArray, like, ne } from 'drizzle-orm';

function normalizePage(params = {}) {
	let page = Math.max(1, Number(params.page || params.num) || 1);
	let size = Math.min(100, Math.max(1, Number(params.size) || 20));
	let sort = String(params.sort || params.timeSort || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
	return { page, size, sort };
}

const selectFields = {
	emailId: email.emailId,
	toEmail: email.toEmail,
	toName: email.toName,
	sendEmail: email.sendEmail,
	sendName: email.name,
	subject: email.subject,
	code: email.code,
	text: email.text,
	content: email.content,
	cc: email.cc,
	bcc: email.bcc,
	recipient: email.recipient,
	inReplyTo: email.inReplyTo,
	relation: email.relation,
	messageId: email.messageId,
	type: email.type,
	status: email.status,
	unread: email.unread,
	createTime: email.createTime,
	isDel: email.isDel
};

const mailApiService = {

	async list(c, params = {}) {
		const { page, size, sort } = normalizePage(params);
		const { toEmail, sendEmail, subject, code, unread } = params;

		const conditions = [];
		if (toEmail) conditions.push(eq(email.toEmail, String(toEmail)));
		if (sendEmail) conditions.push(eq(email.sendEmail, String(sendEmail)));
		if (subject) conditions.push(like(email.subject, `%${String(subject)}%`));
		if (code) conditions.push(eq(email.code, String(code)));
		if (unread !== undefined && unread !== null && unread !== '') {
			conditions.push(eq(email.unread, Number(unread)));
		}

		const query = orm(c).select(selectFields).from(email);

		if (conditions.length === 1) {
			query.where(conditions[0]);
		} else if (conditions.length > 1) {
			query.where(and(...conditions));
		}

		query.orderBy(sort === 'asc' ? asc(email.emailId) : desc(email.emailId));

		return query.limit(size).offset((page - 1) * size);
	},

	async mailbox(c, address, params = {}) {
		return this.list(c, {
			...params,
			toEmail: decodeURIComponent(address)
		});
	},

	async detail(c, emailId) {
		return orm(c)
			.select(selectFields)
			.from(email)
			.where(eq(email.emailId, Number(emailId)))
			.get();
	},

	async unreadList(c, address, limit = 10) {
		address = decodeURIComponent(address);
		limit = Math.min(10, Math.max(1, Number(limit) || 10));

		return orm(c)
			.select(selectFields)
			.from(email)
			.where(and(
				eq(email.toEmail, address),
				eq(email.type, emailConst.type.RECEIVE),
				eq(email.unread, emailConst.unread.UNREAD),
				eq(email.isDel, isDel.NORMAL),
				ne(email.status, emailConst.status.SAVING)
			))
			.orderBy(desc(email.emailId))
			.limit(limit);
	},

	/**
	 * 原子“领取”最近未读邮件：
	 * 1) 一个 UPDATE 语句选中最多 limit 条 unread=0 的邮件
	 * 2) 同一语句把这些邮件改成 unread=1
	 * 3) RETURNING 领取到的 email_id
	 *
	 * 这样比 SELECT 后再 UPDATE 更不容易在并发取件时重复领取同一批邮件。
	 */
	async consumeUnread(c, address, limit = 10) {
		address = decodeURIComponent(address);
		limit = Math.min(10, Math.max(1, Number(limit) || 10));

		const sql = `
			UPDATE email
			   SET unread = ?
			 WHERE email_id IN (
				SELECT email_id
				  FROM email
				 WHERE to_email = ?
				   AND type = ?
				   AND unread = ?
				   AND is_del = ?
				   AND status <> ?
				 ORDER BY email_id DESC
				 LIMIT ?
			 )
			   AND unread = ?
			RETURNING email_id
		`;

		const claimed = await c.env.db
			.prepare(sql)
			.bind(
				emailConst.unread.READ,
				address,
				emailConst.type.RECEIVE,
				emailConst.unread.UNREAD,
				isDel.NORMAL,
				emailConst.status.SAVING,
				limit,
				emailConst.unread.UNREAD
			)
			.all();

		const ids = (claimed.results || [])
			.map(row => Number(row.email_id))
			.filter(Boolean);

		if (ids.length === 0) {
			return [];
		}

		return orm(c)
			.select(selectFields)
			.from(email)
			.where(inArray(email.emailId, ids))
			.orderBy(desc(email.emailId));
	}
};

export default mailApiService;
