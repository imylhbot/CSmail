const pushConst = {
	KV_KEY: 'PUSH_CONFIG_V1',
	API_KEY_HEADER: 'x-api-key',
	DEFAULT_CONFIG: {
		enabled: true,
		telegram: {
			enabled: false,
			botToken: '',
			chatIds: ''
		},
		discord: {
			enabled: false,
			webhookUrl: ''
		},
		wecom: {
			enabled: false,
			webhookUrl: ''
		},
		feishu: {
			enabled: false,
			webhookUrl: ''
		},
		dingtalk: {
			enabled: false,
			webhookUrl: ''
		},
		bark: {
			enabled: false,
			serverUrl: 'https://api.day.app',
			deviceKey: ''
		},
		serverchan: {
			enabled: false,
			sendKey: ''
		},
		pushplus: {
			enabled: false,
			token: '',
			topic: ''
		},
		webhook: {
			enabled: false,
			url: '',
			secret: '',
			headers: {}
		},
		api: {
			enabled: true,
			key: '',
			unreadExtractEnabled: false,
			unreadLimit: 10,
			markReadAfterExtract: true
		}
	}
};

export default pushConst;
