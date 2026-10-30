<template>
  <el-dialog
    v-model="visible"
    title="批量创建邮箱账号"
    width="760px"
    :close-on-click-modal="false"
    @closed="reset"
  >
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="mb"
      title="每一行创建一个独立登录用户。密码沿用项目原有密码哈希逻辑，不会明文保存到数据库。"
    />

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
          :rows="13"
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
      <div class="tip">单次最多 200 个账号</div>
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

    <template v-if="previewData">
      <el-divider />

      <div class="summary">
        <el-tag>总行数 {{ previewData.totalLines }}</el-tag>
        <el-tag type="success">可创建 {{ previewData.validCount }}</el-tag>
        <el-tag type="danger">格式/校验失败 {{ previewData.invalidCount }}</el-tag>
      </div>

      <el-table
        v-if="previewData.valid?.length"
        :data="previewData.valid"
        max-height="220"
        size="small"
        class="table"
      >
        <el-table-column prop="line" label="行" width="60"/>
        <el-table-column prop="email" label="识别邮箱"/>
        <el-table-column prop="passwordMasked" label="密码" width="100"/>
      </el-table>

      <el-table
        v-if="previewData.invalid?.length"
        :data="previewData.invalid"
        max-height="180"
        size="small"
        class="table"
      >
        <el-table-column prop="line" label="行" width="60"/>
        <el-table-column prop="email" label="邮箱" min-width="180"/>
        <el-table-column prop="reason" label="失败原因" min-width="180"/>
      </el-table>
    </template>

    <template v-if="resultData">
      <el-divider />
      <div class="summary">
        <el-tag type="success">成功 {{ resultData.successCount }}</el-tag>
        <el-tag type="danger">失败 {{ resultData.failedCount }}</el-tag>
      </div>

      <el-table
        v-if="resultData.failed?.length"
        :data="resultData.failed"
        max-height="230"
        size="small"
        class="table"
      >
        <el-table-column prop="line" label="行" width="60"/>
        <el-table-column prop="email" label="邮箱" min-width="200"/>
        <el-table-column prop="reason" label="失败原因" min-width="220"/>
      </el-table>
    </template>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { roleSelectUse } from '@/request/role.js';
import { batchParseUsers, batchAddUsers } from '@/request/user-batch.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'created']);

const visible = ref(false);
const rawText = ref('');
const roleId = ref(null);
const roleList = ref([]);
const parsing = ref(false);
const creating = ref(false);
const previewData = ref(null);
const resultData = ref(null);

watch(() => props.modelValue, async (v) => {
  visible.value = v;
  if (v && roleList.value.length === 0) {
    try {
      roleList.value = await roleSelectUse();
    } catch {}
  }
}, { immediate: true });

watch(visible, (v) => {
  emit('update:modelValue', v);
});

watch(rawText, () => {
  previewData.value = null;
  resultData.value = null;
});

const canCreate = computed(() => {
  return !!roleId.value &&
    !!previewData.value &&
    previewData.value.validCount > 0 &&
    previewData.value.validCount <= 200;
});

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
      emit('created', data);
    }

    if (data.failedCount > 0) {
      ElMessage.warning(`有 ${data.failedCount} 条未创建，请查看失败明细`);
    }

    await preview();
  } catch (e) {
    ElMessage.error(e?.message || '批量创建失败');
  } finally {
    creating.value = false;
  }
}

function reset() {
  rawText.value = '';
  roleId.value = null;
  previewData.value = null;
  resultData.value = null;
}
</script>

<style scoped>
.mb { margin-bottom: 14px; }
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.tip {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.actions, .summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.table {
  margin-top: 12px;
}
@media (max-width: 700px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .actions {
    justify-content: flex-end;
  }
}
</style>
