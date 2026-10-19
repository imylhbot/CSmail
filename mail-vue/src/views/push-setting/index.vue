<template>
  <div class="push-page">
    <div class="head">
      <div>
        <h2>推送中心</h2>
        <p>每个渠道独立开关；第三方推送失败不会影响邮件正常入库。</p>
      </div>
      <el-button type="primary" :loading="saving" @click="save">保存全部配置</el-button>
    </div>

    <el-alert
      title="密钥显示为 ****** 时，保存不会覆盖原密钥。原项目 Telegram/邮箱转发保持独立。"
      type="info"
      :closable="false"
      show-icon
      class="block"
    />

    <el-card shadow="never" class="block">
      <div class="row-head">
        <div>
          <div class="channel-title">推送总开关</div>
          <div class="desc">只控制新增推送中心，不影响原项目收件、Telegram 与邮箱转发。</div>
        </div>
        <el-switch v-model="form.enabled" />
      </div>
    </el-card>

    <el-card v-for="item in channels" :key="item.key" shadow="never" class="block">
      <div class="row-head">
        <div>
          <div class="channel-title">{{ item.title }}</div>
          <div class="desc">{{ item.desc }}</div>
        </div>
        <div class="channel-actions">
          <el-button size="small" :disabled="!form[item.key].enabled" @click="testProvider(item.key)">测试推送</el-button>
          <span class="switch-label">{{ form[item.key].enabled ? '已开启' : '已关闭' }}</span>
          <el-switch v-model="form[item.key].enabled" />
        </div>
      </div>

      <el-form label-position="top">
        <template v-if="item.key === 'telegram'">
          <el-form-item label="Bot Token">
            <el-input v-model="form.telegram.botToken" show-password placeholder="123456:ABC..." />
          </el-form-item>
          <el-form-item label="Chat ID">
            <el-input v-model="form.telegram.chatIds" placeholder="多个用逗号分隔" />
          </el-form-item>
        </template>

        <template v-else-if="item.key === 'discord'">
          <el-form-item label="Webhook URL"><el-input v-model="form.discord.webhookUrl" show-password /></el-form-item>
        </template>

        <template v-else-if="item.key === 'wecom'">
          <el-form-item label="企业微信群机器人 Webhook"><el-input v-model="form.wecom.webhookUrl" show-password /></el-form-item>
        </template>

        <template v-else-if="item.key === 'feishu'">
          <el-form-item label="飞书自定义机器人 Webhook"><el-input v-model="form.feishu.webhookUrl" show-password /></el-form-item>
        </template>

        <template v-else-if="item.key === 'dingtalk'">
          <el-form-item label="钉钉自定义机器人 Webhook"><el-input v-model="form.dingtalk.webhookUrl" show-password /></el-form-item>
        </template>

        <template v-else-if="item.key === 'bark'">
          <el-form-item label="Bark Server"><el-input v-model="form.bark.serverUrl" placeholder="https://api.day.app" /></el-form-item>
          <el-form-item label="Device Key"><el-input v-model="form.bark.deviceKey" show-password /></el-form-item>
        </template>

        <template v-else-if="item.key === 'serverchan'">
          <el-form-item label="SendKey"><el-input v-model="form.serverchan.sendKey" show-password /></el-form-item>
        </template>

        <template v-else-if="item.key === 'pushplus'">
          <el-form-item label="Token"><el-input v-model="form.pushplus.token" show-password /></el-form-item>
          <el-form-item label="Topic（可选）"><el-input v-model="form.pushplus.topic" /></el-form-item>
        </template>

        <template v-else-if="item.key === 'webhook'">
          <el-form-item label="Webhook URL"><el-input v-model="form.webhook.url" /></el-form-item>
          <el-form-item label="Secret"><el-input v-model="form.webhook.secret" show-password /></el-form-item>
          <el-form-item label="额外 Headers（JSON）">
            <el-input v-model="headersText" type="textarea" :rows="4" placeholder='{"X-App":"cloud-mail"}' />
          </el-form-item>
        </template>
      </el-form>
    </el-card>

    <el-card shadow="never" class="block">
      <div class="row-head">
        <div>
          <div class="channel-title">全局邮件查询 API</div>
          <div class="desc">一个全局 Key 对所有邮箱通用；普通邮箱用户无需登录后台、无需单独创建 Key。</div>
        </div>
        <div class="channel-actions">
          <span class="switch-label">{{ form.api.enabled ? '已开启' : '已关闭' }}</span>
          <el-switch v-model="form.api.enabled" />
        </div>
      </div>

      <el-form label-position="top">
        <el-alert
          type="success"
          :closable="false"
          show-icon
          class="api-alert"
          title="这是全局统一 API Key：创建 10 个、100 个或更多邮箱账号，都使用同一个 Key 调用 Mail API。"
        />

        <el-form-item label="全局 Mail API Key（所有邮箱通用）">
          <div class="inline">
            <el-input v-model="globalApiKeyDisplay" readonly show-password />
            <el-button @click="revealGlobalKey">显示完整 Key</el-button>
            <el-button :disabled="!fullGlobalKey" @click="copyGlobalKey">复制 Key</el-button>
            <el-button type="warning" @click="regenKey">重新生成</el-button>
          </div>
        </el-form-item>

        <div class="global-key-note">
          <b>调用规则：</b>
          Key 不绑定具体邮箱。请求哪个邮箱，就把邮箱地址写进 URL/请求参数；请求头始终使用同一个
          <code>x-api-key</code>。
        </div>

        <el-divider content-position="left">未读邮件提取</el-divider>

        <div class="feature-row">
          <div>
            <div class="channel-title small">开启未读邮件提取</div>
            <div class="desc">开启后可通过 /mail-api/unread/邮箱 提取最近未读邮件。</div>
          </div>
          <el-switch v-model="form.api.unreadExtractEnabled" />
        </div>

        <div class="feature-row">
          <div>
            <div class="channel-title small">提取后标记为已读</div>
            <div class="desc">推荐开启。只有本次成功领取到的邮件会被标为已读。</div>
          </div>
          <el-switch v-model="form.api.markReadAfterExtract" :disabled="!form.api.unreadExtractEnabled" />
        </div>

        <el-form-item label="每次提取数量">
          <el-input-number
            v-model="form.api.unreadLimit"
            :min="1"
            :max="10"
            :disabled="!form.api.unreadExtractEnabled"
          />
          <span class="hint">最大固定为 10 条</span>
        </el-form-item>

        <el-form-item label="调用示例">
          <pre class="code"># 全局 Key 查询任意邮箱，不改变已读状态
GET /api/mail-api/account1%40git.192911.xyz
x-api-key: GLOBAL_API_KEY

GET /api/mail-api/account2%40git.192911.xyz
x-api-key: GLOBAL_API_KEY

# 同一个 Key 提取任意邮箱最近最多 10 条未读
GET /api/mail-api/unread/account1%40git.192911.xyz
x-api-key: GLOBAL_API_KEY

# POST 也支持
POST /api/mail-api/unread/lucky%40git.192911.xyz
x-api-key: YOUR_API_KEY
Content-Length: 0

# 账号+密码直接取件（推荐 POST）
POST /api/mail-api/auth/list
Content-Type: application/json

{"user":"lucky@git.192911.xyz","pass":"邮箱密码","page":1,"size":20}

# GET 也支持，但密码会出现在 URL/日志中，不推荐
GET /api/mail-api/auth/list?user=lucky%40git.192911.xyz&pass=邮箱密码

# 账号+密码提取未读
POST /api/mail-api/auth/unread
Content-Type: application/x-www-form-urlencoded

user=lucky%40git.192911.xyz&pass=邮箱密码</pre>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="block">
      <div class="row-head">
        <div>
          <div class="channel-title">内部 Mail API 测试</div>
          <div class="desc">直接在当前 Hono Worker 内测试，不经过公网域名、Cloudflare DNS 或 Nginx，因此不会出现自调用导致的 522。</div>
        </div>
      </div>

      <el-form label-position="top">
        <el-form-item label="快捷测试邮箱">
          <el-input v-model="quickMailbox" placeholder="lucky@git.192911.xyz" />
        </el-form-item>

        <div class="quick-buttons">
          <el-button @click="fillInternalMailbox('GET')">GET 普通取件</el-button>
          <el-button @click="fillInternalMailbox('POST')">POST 普通取件</el-button>
          <el-button type="success" @click="fillInternalUnread('GET')">GET 提取未读</el-button>
          <el-button type="success" @click="fillInternalUnread('POST')">POST 提取未读</el-button>
        </div>

        <el-form-item label="方法">
          <el-radio-group v-model="internalTester.method">
            <el-radio-button value="GET">GET</el-radio-button>
            <el-radio-button value="POST">POST</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="内部 Path">
          <el-input v-model="internalTester.path" placeholder="/api/mail-api/lucky%40git.192911.xyz" />
        </el-form-item>

        <el-form-item label="Headers（JSON）">
          <el-input v-model="internalTester.headersText" type="textarea" :rows="4" />
        </el-form-item>

        <el-form-item v-if="internalTester.method === 'POST'" label="Body（可留空）">
          <el-input v-model="internalTester.bodyText" type="textarea" :rows="4" />
        </el-form-item>

        <el-button type="primary" :loading="testingInternal" @click="runInternalTest">
          内部执行 {{ internalTester.method }}
        </el-button>

        <div v-if="internalResult" class="result">
          <div class="result-meta">HTTP {{ internalResult.status }} · {{ internalResult.elapsedMs }} ms · 内部路由</div>
          <pre class="code">{{ formatResult(internalResult) }}</pre>
        </div>
      </el-form>
    </el-card>

    <el-card shadow="never" class="block">
      <div class="row-head">
        <div>
          <div class="channel-title">外部 HTTP 调试器</div>
          <div class="desc">用于测试第三方 API/其他站点。若用它请求本系统自己的公网域名，可能因反代拓扑产生 522，不建议作为内部 Mail API 健康检查。</div>
        </div>
      </div>

      <el-form label-position="top">
        <el-form-item label="请求方法">
          <el-radio-group v-model="tester.method">
            <el-radio-button value="GET">GET</el-radio-button>
            <el-radio-button value="POST">POST</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="URL"><el-input v-model="tester.url" /></el-form-item>
        <el-form-item label="Headers（JSON）">
          <el-input v-model="tester.headersText" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item v-if="tester.method === 'POST'" label="POST Body（可留空）">
          <el-input v-model="tester.bodyText" type="textarea" :rows="5" />
        </el-form-item>
        <el-button :loading="testingApi" @click="runApiTest">外部执行 {{ tester.method }}</el-button>

        <div v-if="testerResult" class="result">
          <div class="result-meta">HTTP {{ testerResult.status }} {{ testerResult.statusText }} · {{ testerResult.elapsedMs }} ms</div>
          <pre class="code">{{ formatResult(testerResult) }}</pre>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getPushConfig,
  setPushConfig,
  testPush,
  regenerateMailApiKey,
  revealMailApiKey,
  apiTesterRequest,
  internalApiTesterRequest
} from '@/request/push.js';

const saving = ref(false);
const testingApi = ref(false);
const testingInternal = ref(false);
const testerResult = ref(null);
const internalResult = ref(null);
const quickMailbox = ref('lucky@git.192911.xyz');
const fullGlobalKey = ref('');

const channels = [
  { key: 'telegram', title: 'Telegram', desc: 'Telegram Bot 推送' },
  { key: 'discord', title: 'Discord', desc: 'Discord Webhook' },
  { key: 'wecom', title: '企业微信', desc: '企业微信群机器人' },
  { key: 'feishu', title: '飞书', desc: '飞书自定义机器人' },
  { key: 'dingtalk', title: '钉钉', desc: '钉钉自定义机器人' },
  { key: 'bark', title: 'Bark', desc: 'Bark / 自建 Bark Server' },
  { key: 'serverchan', title: 'Server酱', desc: 'Server酱 SendKey' },
  { key: 'pushplus', title: 'PushPlus', desc: 'PushPlus Token' },
  { key: 'webhook', title: 'Webhook', desc: '自定义 HTTP Webhook' }
];

function emptyConfig() {
  return {
    enabled: true,
    telegram: { enabled: false, botToken: '', chatIds: '' },
    discord: { enabled: false, webhookUrl: '' },
    wecom: { enabled: false, webhookUrl: '' },
    feishu: { enabled: false, webhookUrl: '' },
    dingtalk: { enabled: false, webhookUrl: '' },
    bark: { enabled: false, serverUrl: 'https://api.day.app', deviceKey: '' },
    serverchan: { enabled: false, sendKey: '' },
    pushplus: { enabled: false, token: '', topic: '' },
    webhook: { enabled: false, url: '', secret: '', headers: {} },
    api: {
      enabled: true,
      key: '',
      unreadExtractEnabled: false,
      unreadLimit: 10,
      markReadAfterExtract: true
    }
  };
}

const form = reactive(emptyConfig());
const headersText = ref('{}');

const globalApiKeyDisplay = computed(() => {
  return fullGlobalKey.value || form.api.key || '';
});

const tester = reactive({
  method: 'GET',
  url: '',
  headersText: '{\n  "x-api-key": "www10086"\n}',
  bodyText: ''
});

const internalTester = reactive({
  method: 'GET',
  path: '/api/mail-api/lucky%40git.192911.xyz',
  headersText: '{\n  "x-api-key": "www10086"\n}',
  bodyText: ''
});

async function load() {
  const data = await getPushConfig();
  Object.assign(form, emptyConfig(), data || {});
  headersText.value = JSON.stringify(form.webhook.headers || {}, null, 2);
}

function parseJson(text, fallback = {}) {
  if (!text || !text.trim()) return fallback;
  return JSON.parse(text);
}

async function save() {
  saving.value = true;
  try {
    form.webhook.headers = parseJson(headersText.value, {});
    await setPushConfig(JSON.parse(JSON.stringify(form)));
    ElMessage.success('保存成功');
    await load();
  } catch (e) {
    ElMessage.error(e?.message || '保存失败，请检查 JSON');
  } finally {
    saving.value = false;
  }
}

async function testProvider(provider) {
  try {
    form.webhook.headers = parseJson(headersText.value, {});
    await setPushConfig(JSON.parse(JSON.stringify(form)));
    await testPush(provider);
    ElMessage.success(`${provider} 测试已完成`);
  } catch (e) {
    ElMessage.error(e?.message || `${provider} 测试失败`);
  }
}

async function revealGlobalKey() {
  try {
    const data = await revealMailApiKey();
    fullGlobalKey.value = data?.key || '';
    if (!fullGlobalKey.value) {
      ElMessage.warning('还没有全局 API Key，请先生成');
    }
  } catch (e) {
    ElMessage.error(e?.message || '读取全局 Key 失败');
  }
}

async function copyGlobalKey() {
  if (!fullGlobalKey.value) return;
  try {
    await navigator.clipboard.writeText(fullGlobalKey.value);
    ElMessage.success('全局 API Key 已复制');
  } catch {
    ElMessage.error('复制失败，请手动复制');
  }
}

async function regenKey() {
  try {
    const data = await regenerateMailApiKey();
    if (data?.key) {
      fullGlobalKey.value = data.key;
      form.api.key = data.key;
      ElMessage.success('全局 API Key 已重新生成，旧 Key 已失效');
    }
  } catch (e) {
    ElMessage.error(e?.message || '生成失败');
  }
}

function encodeMailbox() {
  return encodeURIComponent(quickMailbox.value.trim());
}

function syncInternalKey() {
  // 如果界面里是明文 key，自动带入测试器；若是掩码则保留用户自己输入的 header。
  const key = fullGlobalKey.value || form.api.key;
  if (key && !key.endsWith('******')) {
    internalTester.headersText = JSON.stringify({ 'x-api-key': key }, null, 2);
  }
}

function fillInternalMailbox(method) {
  internalTester.method = method;
  internalTester.path = `/api/mail-api/${encodeMailbox()}`;
  internalTester.bodyText = '';
  syncInternalKey();
}

function fillInternalUnread(method) {
  internalTester.method = method;
  internalTester.path = `/api/mail-api/unread/${encodeMailbox()}`;
  internalTester.bodyText = '';
  syncInternalKey();
}

async function runInternalTest() {
  testingInternal.value = true;
  internalResult.value = null;
  try {
    const headers = parseJson(internalTester.headersText, {});
    let body = internalTester.bodyText;
    if (internalTester.method === 'POST' && body?.trim()) {
      try { body = JSON.parse(body); } catch {}
    }

    internalResult.value = await internalApiTesterRequest({
      method: internalTester.method,
      path: internalTester.path,
      headers,
      body: internalTester.method === 'POST' ? body : undefined
    });
  } catch (e) {
    ElMessage.error(e?.message || '内部 API 测试失败');
  } finally {
    testingInternal.value = false;
  }
}

async function runApiTest() {
  testingApi.value = true;
  testerResult.value = null;
  try {
    const headers = parseJson(tester.headersText, {});
    let body = tester.bodyText;
    if (tester.method === 'POST' && body?.trim()) {
      try { body = JSON.parse(body); } catch {}
    }
    testerResult.value = await apiTesterRequest({
      method: tester.method,
      url: tester.url,
      headers,
      body: tester.method === 'POST' ? body : undefined
    });
  } catch (e) {
    ElMessage.error(e?.message || '外部 API 测试失败');
  } finally {
    testingApi.value = false;
  }
}

function formatResult(data) {
  return JSON.stringify(data, null, 2);
}

onMounted(load);
</script>

<style scoped>
.push-page { padding: 20px; max-width: 1050px; margin: 0 auto; }
.head, .row-head, .channel-actions, .inline, .feature-row { display: flex; align-items: center; }
.head, .row-head, .feature-row { justify-content: space-between; gap: 16px; }
.head { align-items: flex-start; margin-bottom: 16px; }
.head h2 { margin: 0 0 6px; }
.head p, .desc, .hint { color: var(--el-text-color-secondary); }
.block { margin-bottom: 14px; }
.channel-title { font-size: 16px; font-weight: 600; }
.channel-title.small { font-size: 14px; }
.channel-actions { gap: 10px; flex-shrink: 0; }
.switch-label { font-size: 12px; color: var(--el-text-color-secondary); }
.inline { width: 100%; gap: 10px; }
.feature-row { padding: 10px 0; border-bottom: 1px solid var(--el-border-color-lighter); margin-bottom: 12px; }
.hint { margin-left: 10px; font-size: 12px; }
.api-alert { margin-bottom: 14px; }
.global-key-note {
  margin: -2px 0 18px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  line-height: 1.6;
}
.global-key-note code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--el-fill-color);
}
.quick-buttons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.code { width: 100%; box-sizing: border-box; white-space: pre-wrap; word-break: break-word; background: var(--el-fill-color-light); border-radius: 8px; padding: 12px; line-height: 1.55; overflow: auto; }
.result { margin-top: 16px; }
.result-meta { margin-bottom: 8px; font-weight: 600; }
@media (max-width: 700px) {
  .head, .row-head, .feature-row { flex-direction: column; align-items: stretch; }
  .channel-actions { justify-content: flex-end; }
  .inline { flex-direction: column; }
}
</style>
