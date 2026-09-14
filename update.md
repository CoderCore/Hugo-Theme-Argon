# 更新日志

本文件按时间记录主题仓库的重要改动和验证结果。当前清单见 [`todo.md`](./todo.md)。

## 2026-09-11～09-12：阅读量基础能力

- 增加 Cloudflare Worker + D1 阅读量方案、客户端批量读取和 `/settings/` 管理入口。
- 增加 D1 自动建表、阅读量缓存刷新和配置键映射。
- 关闭未配置 endpoint 时的无意义请求；修复暗色模式分页按钮样式。

## 2026-09-13：前端结构与按需加载

- 统一使用 `navigation.js` 管理跨路径导航和页面生命周期。
- 将代码高亮、分享、搜索、GitHub 卡片、评论图片、折叠、Pangu、Clamp、Zoomify、lazyload 和 Banner 拆为按需模块。
- 完成图片处理、资源指纹、SRI、缓存策略、文章目录、代码块背景和页面布局整理。
- 清理第三方评论方案，保留自建评论挂载点和空接口。
- 完善 `.gitignore`，忽略构建物、缓存、临时目录和本地敏感配置。

## 2026-09-14：前端验收收尾

- 修复时间线、留言板和作者页信息卡片的尺寸与位置。
- 修复页脚重复 Hugo 文案、移动端分页、代码高亮双层背景和评论布局。
- 恢复 Argon 原评论结构，使回复位于主评论下方。
- 评论正文支持安全 Markdown、换行、数学公式、头像和嵌套回复；不执行用户 JavaScript。
- 修复 `avatarWrapper` 残留引用导致的评论加载失败。

## 2026-09-14：GitHub OAuth 与安全加固

- 增加 GitHub OAuth 授权码 + PKCE、state 校验、D1 用户、会话和退出登录。
- `COMMENTS_ALLOW_GUESTS=false` 时，Worker 强制要求 GitHub 登录发表评论。
- 增加 CSRF Token、Origin/Fetch Metadata、JSON Content-Type、GitHub 请求超时、安全响应头和 Cloudflare Rate Limiting。
- 生产 Origin 收紧为正式站点；本地开发改用独立 `wrangler.local.jsonc`。
- 评论脚本缓存版本更新到 `comments-5`，确保浏览器发送 CSRF Token。
- Worker 当前生产版本：`c872e8f6-cce8-481d-be25-37bd5e38d630`。

## 2026-09-14：文档整理

- 根目录 README 增加后端教程入口，集中说明主题安装、配置、页面、短代码和后端边界。
- 重写 `cloudflare/view-counter/README.md`，补充 D1、Worker、GitHub OAuth、评论配置、本地开发、安全规则和验证步骤。
- 将 `todo.md` 收敛为 Goal 与清单；本文件只保留精简时间线。
