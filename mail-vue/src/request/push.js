import http from '@/axios/index.js';

export function getPushConfig() {
	return http.get('/push/config');
}

export function setPushConfig(config) {
	return http.put('/push/config', config);
}

export function testPush(provider) {
	return http.post(`/push/test/${provider}`);
}

export function regenerateMailApiKey() {
	return http.post('/push/apiKey/regenerate');
}

export function apiTesterRequest(data) {
	return http.post('/push/api-tester/request', data);
}

export function internalApiTesterRequest(data) {
	return http.post('/push/api-tester/internal', data);
}


export function revealMailApiKey() {
	return http.get('/push/apiKey/reveal');
}
