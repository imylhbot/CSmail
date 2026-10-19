# mylhdmj/cloudmail 上游自动同步安装包

目标仓库: https://github.com/mylhdmj/cloudmail
原始仓库: https://github.com/maillab/cloud-mail

**当前目标仓库为空，并且当前 GitHub 连接无写权限，尚未安装！** 本包不能单独从空仓库生成完整定制发行版。

## 首次初始化（在装有 Git 的电脑中）

```bash
git clone https://github.com/maillab/cloud-mail.git cloudmail
cd cloudmail
git remote rename origin upstream
git remote add origin https://github.com/mylhdmj/cloudmail.git
git push -u origin main
```

如果远端已有新提交或 push 被拒绝，不要强推；先核对分支状态。

## 先完成定制，再启用定时任务

请把企业微信、飞书推送、后台 API 管理、批量账号生成/创建、关于页面精简等功能确实加入目标仓库，并完成测试。此包只实现后续**合并上游更新并保留已有本地定制**的定时工作流，不自动编写上述功能。

把 `.github/workflows/sync-upstream.yml` 和 `scripts/check-customizations.mjs` 放入仓库同路径；根据最后定制后的文件路径修改 `check-customizations.mjs`，提交至 `main`。

```bash
git add .github/workflows/sync-upstream.yml scripts/check-customizations.mjs
git commit -m "ci: add safe upstream sync"
git push origin main
```

在 GitHub Settings → Actions → General → Workflow permissions 设置 Read and write permissions；在 Actions 中手动运行一次。以后按 UTC `18:30`，即越南时间次日 `01:30`，每天定期检查（可能出现 GitHub 排队延迟）。

发生合并冲突、校验或构建失败会停止，不会推送不完整版本。这里是 Git 三方合并保留自定义功能，而不是每天运行一套全自动的源码补丁再生成，因此不可保证所有未来上游变更都能无人值守处理。

**安全**：公开仓库中严禁提交真实机器人 Webhook、API Key、用户密码、Cloudflare token。同步不自动部署到 Cloudflare，其他用户可在你完成发行版和文档后使用你的仓库部署。
