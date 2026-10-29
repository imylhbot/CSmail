import http from '@/axios/index.js';

export function batchParseUsers(rawText) {
	return http.post('/user/batchParse', { rawText });
}

export function batchAddUsers(rawText, type) {
	return http.post('/user/batchAdd', { rawText, type });
}
