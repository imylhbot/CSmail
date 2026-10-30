<template>
  <el-card shadow="never" class="route-card">
    <template #header>
      <div class="head">
        <strong>按收件域名分配多个机器人</strong>
        <el-button type="primary" @click="addRule">新增域名规则</el-button>
      </div>
    </template>
    <el-alert type="info" :closable="false" show-icon title="每条规则可填写一个或多个域名（逗号分隔），添加多个企业微信、飞书、钉钉等机器人。不同规则可以共享域名，匹配时全部发送。" />
    <div class="switch-row">
      <span>域名规则启用后，也发送到上方全局机器人</span>
      <el-switch :model-value="alsoSendGlobal" @update:model-value="v => emit('update:alsoSendGlobal', v)" />
    </div>
    <el-empty v-if="!rules.length" description="尚未配置域名规则，继续使用上方全局推送" />
    <el-card v-for="(rule,index) in rules" :key="rule.id" class="rule" shadow="never">
      <div class="head">
        <el-input v-model="rule.name" placeholder="规则名称，如：主站通知" style="max-width:360px" />
        <el-switch v-model="rule.enabled" />
        <el-button type="danger" plain @click="removeRule(index)">删除规则</el-button>
      </div>
      <el-form label-position="top">
        <el-form-item label="收件邮箱域名（多个用逗号分隔，* 匹配所有域名）">
          <el-input :model-value="rule.domains.join(', ')" placeholder="a.com, b.com"
            @update:model-value="v => rule.domains = v.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean)" />
        </el-form-item>
      </el-form>
      <div class="head">
        <strong>关联机器人（{{ rule.targets.length }}）</strong>
        <el-button size="small" @click="addTarget(rule)">新增机器人</el-button>
      </div>
      <el-card v-for="(target,ti) in rule.targets" :key="target.id" class="target" shadow="never">
        <div class="target-top">
          <el-input v-model="target.name" placeholder="机器人备注，如：企业微信-客服1" style="min-width:150px" />
          <el-select v-model="target.provider" style="width:145px" :disabled="!!target.saved" placeholder="平台">
            <el-option v-for="p in platforms" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
          <el-switch v-model="target.enabled" />
          <el-button type="danger" plain size="small" @click="rule.targets.splice(ti,1)">删除</el-button>
        </div>
        <el-form label-position="top">
          <template v-if="['wecom','feishu','dingtalk','discord'].includes(target.provider)">
            <el-form-item label="独立机器人 Webhook URL">
              <el-input v-model="target.settings.webhookUrl" show-password placeholder="https://..." />
            </el-form-item>
          </template>
          <template v-else-if="target.provider === 'telegram'">
            <el-form-item label="Bot Token"><el-input v-model="target.settings.botToken" show-password /></el-form-item>
            <el-form-item label="Chat IDs（多个用逗号隔开）"><el-input v-model="target.settings.chatIds" /></el-form-item>
          </template>
          <template v-else-if="target.provider === 'bark'">
            <el-form-item label="Bark Server"><el-input v-model="target.settings.serverUrl" placeholder="https://api.day.app" /></el-form-item>
            <el-form-item label="Device Key"><el-input v-model="target.settings.deviceKey" show-password /></el-form-item>
          </template>
          <template v-else-if="target.provider === 'serverchan'">
            <el-form-item label="SendKey"><el-input v-model="target.settings.sendKey" show-password /></el-form-item>
          </template>
          <template v-else-if="target.provider === 'pushplus'">
            <el-form-item label="Token"><el-input v-model="target.settings.token" show-password /></el-form-item>
            <el-form-item label="Topic"><el-input v-model="target.settings.topic" /></el-form-item>
          </template>
          <template v-else-if="target.provider === 'webhook'">
            <el-form-item label="URL"><el-input v-model="target.settings.url" /></el-form-item>
            <el-form-item label="Secret"><el-input v-model="target.settings.secret" show-password /></el-form-item>
          </template>
        </el-form>
      </el-card>
    </el-card>
    <el-alert type="warning" :closable="false" title="修改后请点击页面顶部的「保存全部配置」。已保存机器人的平台不可直接切换；请删除并新建，避免凭据错误复用。" />
  </el-card>
</template>
<script setup>
import { computed } from 'vue';
const props = defineProps({modelValue:{type:Array,default:()=>[]},alsoSendGlobal:{type:Boolean,default:false}});
const emit = defineEmits(['update:modelValue','update:alsoSendGlobal']);
const rules = computed(() => props.modelValue || []);
const platforms = [
  {value:'wecom',label:'企业微信'}, {value:'feishu',label:'飞书'}, {value:'dingtalk',label:'钉钉'},
  {value:'telegram',label:'Telegram'}, {value:'discord',label:'Discord'},
  {value:'bark',label:'Bark'}, {value:'serverchan',label:'Server酱'},
  {value:'pushplus',label:'PushPlus'}, {value:'webhook',label:'Webhook'}
];
function uid(){ return crypto.randomUUID(); }
function addRule(){emit('update:modelValue',[...rules.value,{id:uid(),name:'',enabled:true,domains:[],targets:[]}]);}
function removeRule(index){emit('update:modelValue',rules.value.filter((_,i)=>i!==index));}
function addTarget(rule){rule.targets.push({id:uid(),name:'',provider:'wecom',enabled:true,settings:{}});}
</script>
<style scoped>
.route-card {margin-bottom:14px;}
.head,.switch-row,.target-top {display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.switch-row {margin:18px 0;}
.rule {margin:16px 0;background:var(--el-fill-color-lighter);}
.target {margin:12px 0;}
.target-top {margin-bottom:12px;}
</style>
