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

