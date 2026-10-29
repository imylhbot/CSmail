# Cloudmail 上游同步与 Cloudflare 部署指南

> **目标仓库**：[https://github.com/mylhdmj/cloudmail](https://github.com/mylhdmj/cloudmail)  
> **原始仓库**：[https://github.com/maillab/cloud-mail](https://github.com/maillab/cloud-mail)

---

## 第一部分：上游自动同步配置

> **说明**：当前目标仓库若为空且无推送权限，请先完成本地权限配置。本流程基于 Git 三方合并策略，用于保留定制功能的同时跟踪上游更新。

### 1. 首次本地初始化

在安装了 Git 的本地终端执行：

```bash
# 1. 克隆上游仓库
git clone [https://github.com/maillab/cloud-mail.git](https://github.com/maillab/cloud-mail.git) cloudmail
cd cloudmail

# 2. 将原始源重命名为 upstream
git remote rename origin upstream

# 3. 添加您自己的目标仓库作为 origin
git remote add origin [https://github.com/mylhdmj/cloudmail.git](https://github.com/mylhdmj/cloudmail.git)

# 4. 推送到个人仓库主分支
git push -u origin main
```
> *注意：若远程已有新提交或推送被拒，切勿强制推送（`--force`），请先检查分支状态。*

---

### 2. 业务功能定制

在开启定时同步任务前，请先在目标分支完成定制与充分测试：
- 企业微信 / 飞书主体接入
- 后台 API 管理
- 批量账号生成 / 导入
- 专业“关于”页面定制

---

### 3. 配置安全同步工作流

将工作流文件与校验脚本放置在仓库指定路径下：
- `.github/workflows/sync-upstream.yml`
- `scripts/check-customizations.mjs`

```bash
# 提交并推送工作流文件
git add .github/workflows/sync-upstream.yml scripts/check-customizations.mjs
git commit -m "ci: 添加安全的上游同步工作流"
git push origin main
```

**权限与调度配置：**
1. 进入 GitHub 仓库：**Settings** → **Actions** → **General** → **Workflow permissions**，勾选 **Read and write permissions**。
2. 在 **Actions** 面板手动触发一次测试。
3. 随后将按计划每日在 `UTC 18:30`（北京/越南时间次日 `02:30` / `01:30`）定时检查。
4. **安全保护机制**：若出现代码冲突、校验报错或构建失败，任务将自动中断，绝不产生破坏性发布。严禁在公开仓库提交真实 Webhook、API Key 或 Cloudflare Token。

---

## 第二部分：Cloudflare Dashboard 部署指南

### 1. 部署前准备
- 已绑定域名的 Cloudflare 账号。
- GitHub 账号（已 Fork 或推送好上述定制项目）。
- 规划好的访问域名（如 `mail.example.com`）与收发邮件域名。

---

### 2. 创建 Worker 项目
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进入 **Workers & Pages**。
2. 点击 **Create Application** → 选择从 **GitHub** 导入。
3. 授权并选择您的 `cloudmail` 仓库。
4. 将 **Root directory（根目录）** 设置为：
   ```text
   mail-worker
   ```
5. 按照页面提示完成首次构建与配置。

---

### 3. 配置环境变量 (Environment Variables)

进入 Worker 详情页 → **Settings** → **Variables and Secrets**，配置以下变量：

| 变量名 | 类型 / 示例 | 说明 |
| :--- | :--- | :--- |
| `domain` | `["example.com","example2.com"]` | 允许的邮箱域名列表，单个域名也必须使用 JSON 数组格式 |
| `admin` | `admin@example.com` | 系统管理员初始邮箱地址 |
| `jwt_secret` | *随机强密码字符串* | JWT 令牌签名密钥（建议存为 Secret 类型，避免特殊符号） |

> **提示**：保存变量后若控制台提示重新部署，请确认执行。

---

### 4. 创建并绑定 KV 数据库

1. 进入 Cloudflare 侧边栏：**Storage & Databases** → **KV**。
2. 创建命名空间，例如：`cloud-mail-kv`。
3. 返回 **Workers & Pages** → 您的 Worker → **Settings** → **Bindings**。
4. 点击 **Add** → 选择 **KV Namespace**：
   - **Variable name（变量名）**：`kv` *(必须严格小写)*
   - **KV namespace**：选择刚才创建的 `cloud-mail-kv`
5. 点击保存。

---

### 5. 创建并绑定 D1 数据库

1. 进入 Cloudflare 侧边栏：**Storage & Databases** → **D1 SQL Database**。
2. 创建数据库，例如：`cloud-mail-db`。
3. 返回 **Workers & Pages** → 您的 Worker → **Settings** → **Bindings**。
4. 点击 **Add** → 选择 **D1 Database**：
   - **Variable name（变量名）**：`db` *(必须严格小写)*
   - **D1 database**：选择刚才创建的 `cloud-mail-db`
5. 点击保存。

---

### 6. 初始化系统数据库

确保环境变量和 KV/D1 绑定均已保存且 Worker 部署成功后，在浏览器访问初始化路由：

```http
https://<你的Worker访问域名>/api/init/<你的jwt_secret>
```

> **示例**：  
> 若域名为 `mail.example.com`，密钥为 `MySecretKey888`，则访问：  
> `https://mail.example.com/api/init/MySecretKey888`

**完成后续步骤：**
1. 访问成功后返回 JSON 成功响应。
2. 直接访问站点根路径，根据界面引导注册管理员账号。
3. 登录后台，验证基础功能是否正常。

---

### 7. 部署核对清单

- [ ] 导入根目录确认设置为 `mail-worker`。
- [ ] `domain` 环境变量为有效 JSON 数组（如 `["example.com"]`）。
- [ ] `admin` 邮箱填写完整无误。
- [ ] `jwt_secret` 在变量设置与初始化 URL 中保持完全一致。
- [ ] KV 绑定的变量名精确为 `kv`。
- [ ] D1 绑定的变量名精确为 `db`。
- [ ] 已触发 `/api/init/...` 完成数据库表结构安装。
- [ ] 管理员账号已注册并能正常登录。

---

### 8. 常见排错

- **网站可加载但数据库相关接口报错 500**：
  - 检查 Worker 设置中的 Bindings：变量名必须是小写的 `kv` 与 `db`，不能填成数据库的实际命名空间名称。
  - 确认绑定保存后 Worker 是否完成了最新一次构建部署。
- **初始化接口返回 401 / 404**：
  - 核实 URL 中的密钥与 Worker 环境变量中的 `jwt_secret` 是否严格一致。
  - 检查 Worker 自定义域 DNS 解析及路由是否生效。
- **重新部署或同步后数据库异常**：
  - Dashboard 更新代码后有时会重置绑定，请回到 Bindings 页面核对 `kv` 和 `db` 是否存在。
  - 重新访问初始化 URL（该脚本只更新表结构，不会覆盖已有业务数据）。