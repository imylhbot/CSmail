# Cloud Mail：Cloudflare Dashboard 部署指南

> 原项目仓库：https://github.com/maillab/cloud-mail  
> 本仓库已修改部分代码，新增推送。

## 1. 部署前准备

- 一个 Cloudflare 账号，并已添加需要使用的域名。
- 一个 GitHub 账号。
- 确定网站访问域名和用于收发邮件的邮箱域名。

## 2. 创建 Worker 项目

1. 将 [本仓库](https://github.com/imylhbot/CSmail) Fork 到自己的 GitHub 账号。
2. 登录 Cloudflare Dashboard，进入 **Workers & Pages**。
3. 创建 Worker 项目，并选择从 GitHub 导入。
4. 选择自己 Fork 的 `cloud-mail` 仓库。
5. 将项目根目录（Root directory）设置为：

   ```text
   mail-worker
   ```

6. 按 Cloudflare 页面提示完成首次部署。

> 如果部署界面没有要求设置 Root directory，请检查项目的构建设置，确保部署目标是仓库中的 `mail-worker` 目录。

## 3. 设置环境变量

在 Cloudflare Dashboard 中打开对应的 Worker，进入 **Settings → Variables and Secrets**（界面名称可能因版本略有不同），添加以下必需变量。

| 变量名 | 必需 | 示例 | 说明 |
|---|---|---|---|
| `domain` | 是 | `["example.com","example2.com"]` | 可用的邮箱域名；多个域名使用 JSON 数组格式 |
| `admin` | 是 | `admin@example.com` | 管理员邮箱地址 |
| `jwt_secret` | 是 | `ReplaceWithYourOwnRandomSecret123` | JWT 密钥，用于相关身份令牌操作 |

### 配置注意事项

- `domain` 应填写你实际配置并准备使用的邮箱域名。单个域名也建议使用数组格式，例如 `["example.com"]`。
- `admin` 填写完整邮箱地址，例如 `admin@example.com`。
- `jwt_secret` 请自行生成足够随机、难以猜测的字符串。按照项目文档要求，避免使用特殊字符。
- 初始化数据库时，URL 中的密钥必须与这里配置的 `jwt_secret` 完全一致。
- 不要将真实密钥提交到公开 GitHub 仓库，也不要把密钥分享给他人。
- 如果 Cloudflare 提供普通变量与 Secret 两种类型，敏感密钥优先使用 Secret；请确认项目运行时能够按预期读取该配置。

保存变量后，如果控制台提示需要重新部署，请执行重新部署。

## 4. 创建并绑定 KV 数据库

KV 用于项目的数据存储功能。绑定变量名必须是 **`kv`**。

1. 打开 Cloudflare Dashboard。
2. 进入 **Storage & Databases → KV**（菜单名称可能因控制台版本变化）。
3. 创建一个 KV Namespace，例如命名为 `cloud-mail-kv`。
4. 返回 **Workers & Pages → 你的 Worker → Settings**。
5. 找到 **Bindings** 区域，选择添加 **KV Namespace**。
6. 填写以下信息：

   | 配置项 | 值 |
   |---|---|
   | Variable name / Binding name | `kv` |
   | KV Namespace | 选择刚刚创建的 Namespace |

7. 保存绑定。

**重点：** `kv` 是代码使用的绑定变量名，不是 KV Namespace 的显示名称。绑定变量名必须准确填写为小写 `kv`。

## 5. 创建并绑定 D1 数据库

D1 用于项目的关系型数据库功能。绑定变量名必须是 **`db`**。

1. 打开 Cloudflare Dashboard。
2. 进入 **Storage & Databases → D1 SQL Database**（菜单名称可能因控制台版本变化）。
3. 创建一个 D1 数据库，例如命名为 `cloud-mail-db`。
4. 返回 **Workers & Pages → 你的 Worker → Settings**。
5. 找到 **Bindings** 区域，选择添加 **D1 Database**。
6. 填写以下信息：

   | 配置项 | 值 |
   |---|---|
   | Variable name / Binding name | `db` |
   | D1 Database | 选择刚刚创建的 D1 数据库 |

7. 保存绑定。

**重点：** `db` 是 Worker 运行时使用的绑定变量名，不是 D1 数据库的名称。必须填写小写 `db`。

## 6. 部署后初始化数据库

确认环境变量以及 KV、D1 绑定均已保存，并且 Worker 已部署成功。

在浏览器访问以下地址：

```text
https://你的Worker自定义域/api/init/你的jwt_secret
```

请将其中两部分替换为实际值：

- `你的Worker自定义域`：已经绑定到 Worker 的访问域名。
- `你的jwt_secret`：第 3 节设置的 `jwt_secret` 值。

例如，假设 Worker 域名是 `mail.example.com`，密钥是你自己设置的密钥，则访问地址应按上述格式拼接。不要直接使用示例域名或示例密钥。

初始化完成后：

1. 打开 Worker 的自定义域名。
2. 按页面提示注册管理员账号。
3. 登录网站，确认页面能够正常加载。

> 安全提醒：初始化地址包含密钥。不要将真实初始化 URL 发布到公开渠道；如需分享日志或截图，请先遮盖密钥。

## 7. 部署检查清单

- [ ] Worker 项目已从 GitHub 导入，部署目录为 `mail-worker`。
- [ ] 已设置 `domain`，格式正确，例如 `["example.com"]`。
- [ ] 已设置 `admin`，且邮箱地址正确。
- [ ] 已设置 `jwt_secret`，初始化时使用同一个值。
- [ ] 已创建 KV Namespace，并绑定到变量名 `kv`。
- [ ] 已创建 D1 数据库，并绑定到变量名 `db`。
- [ ] 所有变量与绑定已保存，Worker 已成功部署。
- [ ] 已访问初始化接口。
- [ ] 已打开网站并完成管理员注册、登录测试。

## 8. 常见问题

### 网站能打开，但数据库相关功能异常

优先检查 Worker 的 Bindings：

- KV 的变量名是否严格为 `kv`。
- D1 的变量名是否严格为 `db`。
- 是否选择了正确的 KV Namespace 和 D1 数据库。
- 保存绑定后，是否已完成所需的重新部署。

### 初始化接口无法正常使用

- 检查 URL 路径是否为 `/api/init/你的jwt_secret`。
- 检查 URL 中的密钥是否与环境变量 `jwt_secret` 完全一致。
- 确认 Worker 已部署，且自定义域名可以正常访问。
- 查看 Cloudflare Worker 日志，获取具体错误信息。

### 更新项目后绑定消失

项目文档提醒：通过 Dashboard 更新部署后，可能需要重新绑定 D1 和 KV。重新检查绑定名称是否仍为 `db`、`kv`，然后访问初始化接口以应用数据库更新。按项目文档说明，该更新流程用于更新数据库结构，不会覆盖已有数据。

---

