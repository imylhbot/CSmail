<template>
  <div class="api-page">
    <div class="head"><div><h2>开放 API</h2><p>独立接口文档与管理员 Token 管理，基于 Cloud Mail 官方 Public API。</p></div></div>
    <el-alert type="info" :closable="false" show-icon title="此处是 API 使用文档。Token 拥有跨邮箱读取及新增用户权限，请妥善保管。" class="section" />
    <el-card class="section" shadow="never">
      <template #header><b>当前部署地址</b></template>
      <el-input v-model="baseUrl" placeholder="https://mail.example.com" />
      <p class="hint">默认自动识别当前站点域名。需要调用另一套部署时可以手动修改。</p>
    </el-card>
    <el-card class="section" shadow="never">
      <template #header><b>1. 生成身份 Token</b></template>
      <p><code>POST {{ baseUrl }}/api/public/genToken</code></p>
      <p class="hint">填写管理员邮箱及密码。重新生成后旧 Token 会失效；不会在本页保存密码。</p>
      <el-form label-position="top">
        <el-form-item label="管理员邮箱"><el-input v-model="adminEmail" autocomplete="username" /></el-form-item>
        <el-form-item label="管理员密码"><el-input v-model="adminPassword" type="password" show-password autocomplete="current-password" /></el-form-item>
        <el-button type="primary" :loading="loading" @click="generateToken">生成 Token</el-button>
      </el-form>
      <el-input v-if="token" v-model="token" readonly show-password style="margin-top:14px" />
      <el-button v-if="token" style="margin-top:8px" @click="copyToken">复制 Token</el-button>
      <pre class="code">{{ genExample }}</pre>
    </el-card>
    <el-card class="section" shadow="never">
      <template #header><b>2. 查询邮件</b></template>
      <p><code>POST {{ baseUrl }}/api/public/emailList</code></p>
      <p class="hint">Authorization 请求头填写上一步生成的 Token；支持分页、收件邮箱、发件人、主题、HTML 内容模糊匹配（%）。</p>
      <pre class="code">{{ emailExample }}</pre>
      <el-table :data="emailFields" border size="small"><el-table-column prop="field" label="参数" width="130"/><el-table-column prop="detail" label="用途"/></el-table>
    </el-card>
    <el-card class="section" shadow="never">
      <template #header><b>3. 批量添加用户</b></template>
      <p><code>POST {{ baseUrl }}/api/public/addUser</code></p>
      <p class="hint">Authorization 请求头使用同一 Token。支持 list 数组；邮箱必填，密码和角色名可选。</p>
      <pre class="code">{{ addExample }}</pre>
    </el-card>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
const baseUrl = ref(window.location.origin);
const adminEmail = ref('');
const adminPassword = ref('');
const token = ref('');
const loading = ref(false);
const emailFields = [
 {field:'toEmail',detail:'收件邮箱；支持 % 模糊匹配'},
 {field:'sendName',detail:'发件人名字；支持 % 模糊匹配'},
 {field:'sendEmail',detail:'发件人邮箱；支持 % 模糊匹配'},
 {field:'subject',detail:'邮件主题；支持 % 模糊匹配'},
 {field:'content',detail:'HTML 内容；支持 % 模糊匹配'},
 {field:'timeSort',detail:'asc / desc（默认 desc）'},
 {field:'type',detail:'0 收件 / 1 发件'},
 {field:'isDel',detail:'0 正常 / 2 删除（以接口文档说明为准）'},
 {field:'num、size',detail:'页码、每页条数（默认 1、20）'}
];
const endpoint = (path) => `${baseUrl.value.replace(/\/$/, '')}${path}`;
const genExample = computed(() => `curl -X POST "${endpoint('/api/public/genToken')}" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"YOUR_PASSWORD"}'`);
const emailExample = computed(() => `curl -X POST "${endpoint('/api/public/emailList')}" \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toEmail":"%@example.com","timeSort":"desc","num":1,"size":20}'`);
const addExample = computed(() => `curl -X POST "${endpoint('/api/public/addUser')}" \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"list":[{"email":"demo@example.com","password":"Example123!","roleName":""}]}'`);
async function generateToken() {
 if (!adminEmail.value.trim() || !adminPassword.value) return ElMessage.warning('请输入管理员邮箱和密码');
 loading.value = true;
 try {
  const response = await axios.post(endpoint('/api/public/genToken'), { email: adminEmail.value.trim(), password: adminPassword.value });
  if (response.data?.code !== 200 || !response.data?.data?.token) throw new Error(response.data?.message || 'Token 获取失败');
  token.value = response.data.data.token;
  ElMessage.success('Token 已生成，旧 Token 已失效');
 } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '生成失败'); }
 finally { adminPassword.value = ''; loading.value = false; }
}
async function copyToken() {
 try { await navigator.clipboard.writeText(token.value); ElMessage.success('已复制'); }
 catch { ElMessage.error('复制失败'); }
}
</script>
<style scoped>
.api-page{padding:20px;max-width:1100px;margin:auto}.head{margin-bottom:16px}.head h2{margin:0 0 6px}.head p,.hint{color:var(--el-text-color-secondary)}.section{margin-bottom:14px}.code{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--el-fill-color-light);padding:14px;border-radius:8px;line-height:1.55}
</style>
