# 邮件接收异常热修复

本包基于用户提供的 cloudmail-custom-deploy-custom-d115f4ccc5cb-13a3eeb3-49fb30.zip。

修复 mail-worker/src/email/email.js 中未定义的 fromAddress 引用；发件地址优先采用解析出的 From 地址，缺失时回退 SMTP Envelope Sender。

增强接收异常日志，便于继续排查。

不调用初始化接口，不执行 D1 SQL，不删除/迁移 KV 或 R2。

注意：仅为针对已确认源码错误的热修复，并非全链路邮件收发测试。上传公开仓库之前先做版本备份。
