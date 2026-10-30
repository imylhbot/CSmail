import userService from './user-service';
import verifyUtils from '../utils/verify-utils';

const MAX_BATCH = 200;

function cleanLabel(value) {
	return String(value || '')
		.replace(/^\s*(账号|帳號|邮箱|郵箱|email|mail|username|user)\s*[:：]\s*/i, '')
		.trim();
}

function cleanPasswordLabel(value) {
	return String(value || '')
		.replace(/^\s*(密码|密碼|password|pwd|pass)\s*[:：]\s*/i, '')
		.trim();
}

function parseLine(rawLine) {
	const line = String(rawLine || '').trim();
	if (!line) return null;

	// 1) 用户给出的标准格式：
	// 账号: a@example.com | 密码: abc123
	let match = line.match(
		/(?:账号|帳號|邮箱|郵箱|email|mail|username|user)\s*[:：]\s*([^\s|,;，；]+)\s*(?:\||｜|,|，|;|；|\t|\s{2,})\s*(?:密码|密碼|password|pwd|pass)\s*[:：]\s*(.+)$/i
	);
	if (match) {
		return { email: match[1].trim(), password: match[2].trim() };
	}

	// 2) email,password / email|password / email;password / email<TAB>password
	const separators = ['|', '｜', ',', '，', ';', '；', '\t'];
	for (const sep of separators) {
		const index = line.indexOf(sep);
		if (index > 0) {
			const left = cleanLabel(line.slice(0, index));
			const right = cleanPasswordLabel(line.slice(index + sep.length));
			if (left.includes('@') && right) {
				return { email: left, password: right };
			}
		}
	}

	// 3) email password
	match = line.match(/^([^\s]+@[^\s]+)\s+(.+)$/);
	if (match) {
		return { email: cleanLabel(match[1]), password: cleanPasswordLabel(match[2]) };
	}

	// 4) 账号:a@example.com 密码:abc
	match = line.match(
		/(?:账号|帳號|邮箱|郵箱|email|mail|username|user)\s*[:：]\s*([^\s]+@[^\s]+)\s+(?:密码|密碼|password|pwd|pass)\s*[:：]\s*(.+)$/i
	);
	if (match) {
		return { email: match[1].trim(), password: match[2].trim() };
	}

	return { invalid: true, raw: line };
}

function parseText(rawText) {
	const lines = String(rawText || '')
		.split(/\r?\n/)
		.map(v => v.trim())
		.filter(Boolean);

	const valid = [];
	const invalid = [];
	const seen = new Set();

	for (let i = 0; i < lines.length; i++) {
		const parsed = parseLine(lines[i]);
		if (!parsed) continue;

		if (parsed.invalid) {
			invalid.push({
				line: i + 1,
				raw: lines[i],
				reason: '无法识别格式'
			});
			continue;
		}

		const email = String(parsed.email || '').trim().toLowerCase();
		const password = String(parsed.password || '');

		if (!verifyUtils.isEmail(email)) {
			invalid.push({
				line: i + 1,
				raw: lines[i],
				email,
				reason: '邮箱格式错误'
			});
			continue;
		}

		if (password.length < 6) {
			invalid.push({
				line: i + 1,
				raw: lines[i],
				email,
				reason: '密码少于 6 位'
			});
			continue;
		}

		if (seen.has(email)) {
			invalid.push({
				line: i + 1,
				raw: lines[i],
				email,
				reason: '本次导入中邮箱重复'
			});
			continue;
		}

		seen.add(email);
		valid.push({
			line: i + 1,
			email,
			password
		});
	}

	return {
		totalLines: lines.length,
		valid,
		invalid
	};
}

const userBatchService = {

	parse(rawText) {
		const parsed = parseText(rawText);

		return {
			totalLines: parsed.totalLines,
			validCount: parsed.valid.length,
			invalidCount: parsed.invalid.length,
			// 预览时不把完整密码回传，避免无必要地在网络响应里重复出现密码。
			valid: parsed.valid.map(item => ({
				line: item.line,
				email: item.email,
				passwordMasked: item.password ? '******' : ''
			})),
			invalid: parsed.invalid
		};
	},

	async create(c, params = {}) {
		const { rawText, type } = params;
		const parsed = parseText(rawText);

		if (!type) {
			return {
				total: parsed.totalLines,
				successCount: 0,
				failedCount: parsed.invalid.length + parsed.valid.length,
				success: [],
				failed: [
					...parsed.invalid,
					...parsed.valid.map(item => ({
						line: item.line,
						email: item.email,
						reason: '未选择用户角色'
					}))
				]
			};
		}

		if (parsed.valid.length > MAX_BATCH) {
			return {
				total: parsed.totalLines,
				successCount: 0,
				failedCount: parsed.invalid.length + parsed.valid.length,
				success: [],
				failed: [{
					line: 0,
					reason: `单次最多创建 ${MAX_BATCH} 个账号`
				}]
			};
		}

		const success = [];
		const failed = [...parsed.invalid];

		// 顺序创建，直接复用项目原 userService.add：
		// 域名、角色、重复账号、密码哈希、主 account 创建等规则全部保持一致。
		for (const item of parsed.valid) {
			try {
				await userService.add(c, {
					email: item.email,
					password: item.password,
					type: Number(type)
				});

				success.push({
					line: item.line,
					email: item.email
				});
			} catch (e) {
				failed.push({
					line: item.line,
					email: item.email,
					reason: e?.message || String(e)
				});
			}
		}

		return {
			total: parsed.totalLines,
			successCount: success.length,
			failedCount: failed.length,
			success,
			failed
		};
	}
};

export default userBatchService;
