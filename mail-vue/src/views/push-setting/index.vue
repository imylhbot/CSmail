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

    <DomainRoutingEditor v-model="form.domainRules" v-model:also-send-global="form.alsoSendGlobal" />

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

  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getPushConfig, setPushConfig, testPush } from '@/request/push.js';
import DomainRoutingEditor from '@/components/DomainRoutingEditor.vue';

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
  enabled: true, alsoSendGlobal: false, domainRules: [],
  telegram: { enabled: false, botToken: '', chatIds: '' },
  discord: { enabled: false, webhookUrl: '' },
  wecom: { enabled: false, webhookUrl: '' },
  feishu: { enabled: false, webhookUrl: '' },
  dingtalk: { enabled: false, webhookUrl: '' },
  bark: { enabled: false, serverUrl: 'https://api.day.app', deviceKey: '' },
  serverchan: { enabled: false, sendKey: '' },
  pushplus: { enabled: false, token: '', topic: '' },
  webhook: { enabled: false, url: '', secret: '', headers: {} }
 };
}
const form = reactive(emptyConfig());
const saving = ref(false);
const headersText = ref('{}');
async function load() {
 const data = await getPushConfig();
 Object.assign(form, emptyConfig(), data || {});
 headersText.value = JSON.stringify(form.webhook?.headers || {}, null, 2);
}
async function save() {
 saving.value = true;
 try {
  form.webhook.headers = JSON.parse(headersText.value || '{}');
  await setPushConfig(JSON.parse(JSON.stringify(form)));
  ElMessage.success('保存成功');
  await load();
 } catch (e) { ElMessage.error(e?.message || '保存失败'); }
 finally { saving.value = false; }
}
async function testProvider(provider) {
 try {
  form.webhook.headers = JSON.parse(headersText.value || '{}');
  await setPushConfig(JSON.parse(JSON.stringify(form)));
  await testPush(provider);
  ElMessage.success('推送测试完成');
 } catch (e) { ElMessage.error(e?.message || '测试失败'); }
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
