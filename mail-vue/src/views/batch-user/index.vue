<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>批量导入账号</h2>
        <p>批量创建独立 Cloud Mail 登录账号。支持多种账号/密码文本格式。</p>
      </div>
      <el-button @click="router.push({name:'user'})">返回用户管理</el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="block"
      title="每一行创建一个独立用户。密码继续使用项目原有哈希逻辑保存，不会明文写入数据库。"
    />


    <el-card shadow="never" class="block">
      <template #header><div class="card-title">随机账号与密码生成</div></template>
      <el-form label-position="top">
        <el-form-item label="邮箱后缀（例如 @example.com）"><el-input v-model="genDomain" placeholder="@example.com" /></el-form-item>
        <el-form-item label="账号前缀长度（不含邮箱后缀）"><el-input-number v-model="genAccountLength" :min="1" :max="32" /></el-form-item>
        <el-form-item label="账号字符"><el-checkbox v-model="genLower">小写字母</el-checkbox><el-checkbox v-model="genUpper">大写字母</el-checkbox><el-checkbox v-model="genDigits">数字</el-checkbox></el-form-item>
        <el-form-item label="密码长度"><el-input-number v-model="genPasswordLength" :min="4" :max="64" /></el-form-item>
        <el-form-item label="常用密码符号"><el-input v-model="genSymbols" /></el-form-item>
        <el-form-item label="排除密码字符"><el-input v-model="genExclusions" /></el-form-item>
        <el-form-item label="生成数量（一次最多200）"><el-input-number v-model="genCount" :min="1" :max="200" /></el-form-item>
        <el-button type="primary" @click="generateRandomAccounts">生成并填入账号数据</el-button>
      </el-form>
    </el-card>

    <el-card shadow="never" class="block">
      <template #header>
        <div class="card-title">1. 导入设置</div>
      </template>

      <el-form label-position="top">
        <el-form-item label="用户角色">
          <el-select v-model="roleId" style="width:100%" placeholder="请选择批量账号的角色">
            <el-option
              v-for="item in roleList"
              :key="item.roleId"
              :label="item.name"
              :value="item.roleId"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="账号数据">
          <el-input
            v-model="rawText"
            type="textarea"
            :rows="15"
            resize="vertical"
            placeholder="支持示例：
账号: abc@example.com | 密码: Abc123!@
abc@example.com|Abc123!@
abc@example.com,Abc123!@
abc@example.com;Abc123!@
abc@example.com    Abc123!@
email: abc@example.com | password: Abc123!@"
          />
        </el-form-item>
      </el-form>

      <div class="toolbar">
        <div class="tip">单次最多 200 个账号；建议先解析预览，再执行创建。</div>
        <div class="actions">
          <el-button :disabled="!rawText.trim()" :loading="parsing" @click="preview">
            解析预览
          </el-button>
          <el-button
            type="primary"
            :disabled="!canCreate"
            :loading="creating"
            @click="createAll"
          >
            创建 {{ previewData?.validCount || 0 }} 个账号
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card v-if="previewData" shadow="never" class="block">
      <template #header>
        <div class="card-title">2. 解析预览</div>
      </template>

      <div class="summary">
        <el-tag>总行数 {{ previewData.totalLines }}</el-tag>
        <el-tag type="success">可创建 {{ previewData.validCount }}</el-tag>
        <el-tag type="danger">格式/校验失败 {{ previewData.invalidCount }}</el-tag>
      </div>

      <el-table
        v-if="previewData.valid?.length"
        :data="previewData.valid"
        max-height="360"
        class="table"
      >
        <el-table-column prop="line" label="行" width="70"/>
        <el-table-column prop="email" label="识别邮箱" min-width="280"/>
        <el-table-column prop="passwordMasked" label="密码" width="120"/>
        <el-table-column label="状态" width="120">
          <template #default>
            <el-tag type="success" size="small">可创建</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-table
        v-if="previewData.invalid?.length"
        :data="previewData.invalid"
        max-height="300"
        class="table"
      >
        <el-table-column prop="line" label="行" width="70"/>
        <el-table-column prop="email" label="邮箱" min-width="240"/>
        <el-table-column prop="raw" label="原始内容" min-width="260"/>
        <el-table-column prop="reason" label="失败原因" min-width="180"/>
      </el-table>
    </el-card>

    <el-card v-if="resultData" shadow="never" class="block">
      <template #header>
        <div class="card-title">3. 创建结果</div>
      </template>

      <div class="summary">
        <el-tag type="success">成功 {{ resultData.successCount }}</el-tag>
        <el-tag type="danger">失败 {{ resultData.failedCount }}</el-tag>
      </div>

      <el-table
        v-if="resultData.success?.length"
        :data="resultData.success"
        max-height="280"
        class="table"
      >
        <el-table-column prop="line" label="行" width="70"/>
        <el-table-column prop="email" label="已创建邮箱"/>
        <el-table-column label="结果" width="120">
          <template #default>
            <el-tag type="success" size="small">成功</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-table
        v-if="resultData.failed?.length"
        :data="resultData.failed"
        max-height="320"
        class="table"
      >
        <el-table-column prop="line" label="行" width="70"/>
        <el-table-column prop="email" label="邮箱" min-width="260"/>
        <el-table-column prop="reason" label="失败原因" min-width="260"/>
      </el-table>

      <div class="credential-copy-box" v-if="resultData.successCount > 0">
        <div>
          <div class="copy-title">成功账号密码</div>
          <div class="tip">只复制本次创建成功的账号；失败账号不会包含在内。</div>
        </div>
        <div class="actions">
          <el-button type="success" @click="copySuccessfulCredentials">
            一键复制成功账号密码
          </el-button>
          <el-button @click="downloadSuccessfulCredentials">
            下载 TXT
          </el-button>
        </div>
      </div>

      <div class="result-actions">
        <el-button type="primary" @click="router.push({name:'user'})">查看所有用户</el-button>
        <el-button @click="clearAll">继续导入下一批</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import router from '@/router/index.js';
import { roleSelectUse } from '@/request/role.js';
import { batchParseUsers, batchAddUsers } from '@/request/user-batch.js';

const rawText = ref('');

const genDomain = ref('');
const genAccountLength = ref(8);
const genPasswordLength = ref(16);
const genCount = ref(10);
const genSymbols = ref('!@#$%^&*_');
const genExclusions = ref('0O1lI');
const genLower = ref(true);
const genUpper = ref(true);
const genDigits = ref(true);
const generatorLower = 'abcdefghijklmnopqrstuvwxyz';
const generatorUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const generatorDigits = '0123456789';
function randomIndex(size) {
  if (!size) throw new Error('可用字符集为空');
  const limit = Math.floor(4294967296 / size) * size;
  let n;
  do { n = crypto.getRandomValues(new Uint32Array(1))[0]; } while (n >= limit);
  return n % size;
}
function randomChar(pool) { return pool[randomIndex(pool.length)]; }
function shuffleSecure(input) {
  for(let i=input.length-1;i>0;i--) {
    const j=randomIndex(i+1);
    [input[i],input[j]]=[input[j],input[i]];
  }
  return input.join('');
}
function generateRandomAccounts() {
  try {
    const domain = String(genDomain.value || '').trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(domain)) throw new Error('请输入有效邮箱后缀');
    const accountPool = (genLower.value ? generatorLower : '') + (genUpper.value ? generatorUpper : '') + (genDigits.value ? generatorDigits : '');
    if (!accountPool) throw new Error('账号至少选择一种字符');
    const allowed = (pool) => [...pool].filter(c => !genExclusions.value.includes(c)).join('');
    const pools=[allowed(generatorLower),allowed(generatorUpper),allowed(generatorDigits),allowed(genSymbols.value)];
    if (pools.some(x => !x)) throw new Error('密码四类字符均须保留至少一个可用字符');
    if(genPasswordLength.value < 4) throw new Error('密码长度至少4位');
    const used=new Set();
    const lines=[];
    for(let n=0;n<genCount.value;n++) {
      let local=''; let attempts=0;
      do {
        local=Array.from({length:genAccountLength.value},()=>randomChar(accountPool)).join('');
        attempts++;
        if(attempts>10000) throw new Error('账号空间不足，请增加前缀长度');
      } while(used.has(local.toLowerCase()));
      used.add(local.toLowerCase());
      const chars=pools.map(randomChar);
      while(chars.length<genPasswordLength.value) chars.push(randomChar(pools.join('')));
      const password=shuffleSecure(chars);
      lines.push(`账号: ${local}@${domain} | 密码: ${password}`);
    }
    rawText.value=lines.join('\n');
    ElMessage.success(`已生成 ${lines.length} 条，先解析预览再创建`);
  } catch(error) { ElMessage.error(error.message || String(error)); }
}

const roleId = ref(null);
const roleList = ref([]);
const parsing = ref(false);
const creating = ref(false);
const previewData = ref(null);
const resultData = ref(null);

const canCreate = computed(() => {
  return !!roleId.value &&
    !!previewData.value &&
    previewData.value.validCount > 0 &&
    previewData.value.validCount <= 200;
});

watch(rawText, () => {
  previewData.value = null;
  resultData.value = null;
});

async function loadRoles() {
  try {
    roleList.value = await roleSelectUse();
  } catch (e) {
    ElMessage.error(e?.message || '角色列表加载失败');
  }
}

async function preview() {
  parsing.value = true;
  resultData.value = null;
  try {
    previewData.value = await batchParseUsers(rawText.value);
    if (!previewData.value?.validCount) {
      ElMessage.warning('没有识别到可创建的账号');
    }
  } catch (e) {
    ElMessage.error(e?.message || '解析失败');
  } finally {
    parsing.value = false;
  }
}

async function createAll() {
  if (!canCreate.value) return;

  try {
    await ElMessageBox.confirm(
      `确认创建 ${previewData.value.validCount} 个独立用户账号？`,
      '批量创建',
      {
        confirmButtonText: '确认创建',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
  } catch {
    return;
  }

  creating.value = true;
  resultData.value = null;

  try {
    const data = await batchAddUsers(rawText.value, roleId.value);
    resultData.value = data;

    if (data.successCount > 0) {
      ElMessage.success(`成功创建 ${data.successCount} 个账号`);
    }
    if (data.failedCount > 0) {
      ElMessage.warning(`有 ${data.failedCount} 条未创建，请查看失败明细`);
    }

    // 创建后重新解析，已存在账号会由真正创建结果体现；
    // 保留原输入，方便用户核对。
  } catch (e) {
    ElMessage.error(e?.message || '批量创建失败');
  } finally {
    creating.value = false;
  }
}


function extractCredentialFromLine(rawLine) {
  const line = String(rawLine || '').trim();
  if (!line) return null;

  let m = line.match(
    /(?:账号|帳號|邮箱|郵箱|email|mail|username|user)\s*[:：]\s*([^\s|,;，；]+)\s*(?:\||｜|,|，|;|；|\t|\s{2,})\s*(?:密码|密碼|password|pwd|pass)\s*[:：]\s*(.+)$/i
  );
  if (m) return { email: m[1].trim(), password: m[2].trim() };

  for (const sep of ['|', '｜', ',', '，', ';', '；', '\t']) {
    const idx = line.indexOf(sep);
    if (idx > 0) {
      let left = line.slice(0, idx)
        .replace(/^\s*(账号|帳號|邮箱|郵箱|email|mail|username|user)\s*[:：]\s*/i, '')
        .trim();
      let right = line.slice(idx + sep.length)
        .replace(/^\s*(密码|密碼|password|pwd|pass)\s*[:：]\s*/i, '')
        .trim();

      if (left.includes('@') && right) {
        return { email: left, password: right };
      }
    }
  }

  m = line.match(/^([^\s]+@[^\s]+)\s+(.+)$/);
  if (m) return { email: m[1].trim(), password: m[2].trim() };

  return null;
}

function successfulCredentialText() {
  if (!resultData.value?.success?.length) return '';

  const lines = rawText.value.split(/\r?\n/);
  const successEmails = new Set(
    resultData.value.success.map(item => String(item.email || '').toLowerCase())
  );

  const output = [];

  for (const rawLine of lines) {
    const item = extractCredentialFromLine(rawLine);
    if (!item) continue;

    if (successEmails.has(String(item.email).toLowerCase())) {
      output.push(`账号: ${item.email} | 密码: ${item.password}`);
    }
  }

  return output.join('\n');
}

async function copySuccessfulCredentials() {
  const text = successfulCredentialText();
  if (!text) {
    ElMessage.warning('没有可复制的成功账号');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(`已复制 ${resultData.value.successCount} 个成功账号密码`);
  } catch {
    // Clipboard API 在部分非 HTTPS/旧浏览器环境不可用，使用兼容方案。
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    ElMessage.success(`已复制 ${resultData.value.successCount} 个成功账号密码`);
  }
}

function downloadSuccessfulCredentials() {
  const text = successfulCredentialText();
  if (!text) {
    ElMessage.warning('没有可导出的成功账号');
    return;
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cloud-mail-success-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}


function clearAll() {
  rawText.value = '';
  previewData.value = null;
  resultData.value = null;
}

onMounted(loadRoles);
</script>

<style scoped>
.page {
  padding: 20px;
  max-width: 1180px;
  margin: 0 auto;
}
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.page-head h2 { margin: 0 0 6px; }
.page-head p, .tip { margin: 0; color: var(--el-text-color-secondary); }
.block { margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; }
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.actions, .summary, .result-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.table { margin-top: 14px; }
.credential-copy-box {
  margin-top: 18px;
  padding: 14px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.copy-title { font-weight: 600; margin-bottom: 4px; }
.result-actions { margin-top: 16px; justify-content: flex-end; }
@media (max-width: 760px) {
  .page-head, .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .actions { justify-content: flex-end; }
  .credential-copy-box {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
