# Hugo-Theme-Argon TODO

本文件只维护当前清单和 Goal，不记录历史过程。历史改动与验证记录见 [update.md](update.md)。

## 范围与原则

- 目标：将 Argon 从 WordPress 主题迁移为可独立构建的 Hugo 主题，优先保证核心视觉、阅读体验和纯前端能力。
- 允许依赖：Hugo、浏览器端 JavaScript、静态资源，以及已明确存在的 Cloudflare Worker/D1 阅读量能力。
- 暂不迁移：WordPress 后台、Gutenberg、小工具、服务端密码保护、WordPress 查询接口和后台管理功能。
- 外部服务：没有真实参数时不做空测、不伪造接口、不把测试空气当作完成证据。
- 评论方向：不再接入现成评论服务，使用自建 Worker/D1 评论系统；登录仅支持 GitHub，正文使用安全 Markdown 渲染。

## 状态说明

- `[x]` 已完成并有代码或构建证据
- `[-]` 部分完成，存在明确缺口
- `[ ]` 未开始、等待输入或暂不执行

## 当前总体 Goal（2026-09-13）

1. `[x]` 完成主题主体迁移：配置、模板、短代码、文章/页面布局、SEO、图片处理、i18n、Shuoshuo、时间线、归档、作者页和留言板静态结构。
2. `[x]` 完成纯前端动态能力：统一页面导航、Hugo JSON 搜索、GitHub 信息卡、代码高亮、分享、数学公式、懒加载、Zoomify、Pangu、Clamp、Banner、过时提示、评论图片预览和折叠交互的按需加载。
3. `[x]` 保留阅读量能力：主题内 Cloudflare Worker + D1 客户端和管理相关代码已完成；生产读写仍需真实部署参数。
4. `[x]` 清理评论第三方方案：删除四种第三方评论的配置、模板分支、外部脚本/样式、初始化、失败重试和跨页实例清理；保留通用 `#comments` 挂载点与 `argonCustomComments` 注释接口。
5. `[x]` 完成本地前端验收闭环：主题示例站和目标站模拟生产环境均可构建；文章目录、左栏、卡片布局、单列/瀑布流、分页、代码高亮、公式、暗色模式和移动端问题已按当前反馈处理。
6. `[-]` 进入后端阶段：自建评论 Worker/D1 已有列表、发布、回复、分页、Markdown、GitHub OAuth、会话和退出登录基础链路；真实 OAuth 参数、限流、审核和生产安全仍待完成。
7. `[ ]` 完成可选收尾：补充 Clamp/旧格式 lazyload/Banner 正向 fixture；只有有实际需求时再评估 Pagefind 和公网性能优化。

## 已完成清单

### 主题基础与页面

- `[x]` 配置项、默认值、主题色、暗色模式、侧栏、顶栏、页脚、文章元信息和阅读时间。
- `[x]` `pageLayout`、侧栏显示、文章列表布局、瀑布流列数、单列模式和移动端响应式布局。
- `[x]` 首页、归档、分类/标签、文章详情、Shuoshuo、时间线、作者页、关于页和留言板路由。
- `[x]` 移动端分页导航、文章目录、前后篇导航、返回评论按钮和跨路径导航。
- `[x]` i18n、SEO、canonical、Open Graph、Twitter Card、Article JSON-LD、robots、sitemap 和 Hugo JSON 搜索输出。

### 内容表达与资源

- `[x]` 常用短代码：提示、标签、待办、折叠、隐藏、视频、进度条、时间线、GitHub 卡片等。
- `[x]` 图片 Page Resources、WebP/srcset、尺寸属性、首图优先加载、列表懒加载和评论图片预览。
- `[x]` 代码高亮、行号、复制、代码块控制栏、暗色选中色、圆角和高亮背景一致性。
- `[x]` MathJax 3、MathJax 2、KaTeX 的按需加载入口；默认无公式时不加载公式脚本。

### JavaScript 与性能

- `[x]` `navigation.js` 作为唯一页面导航入口，页面模块按内容、配置或首次交互加载。
- `[x]` 已拆分代码、分享、GitHub、Hitokoto、过时提示、评论图片、折叠、Pangu、Clamp、Zoomify、lazyload、Banner 和搜索模块。
- `[x]` 核心资源 Hugo Pipes 压缩、SHA-256 指纹、SRI 和 Cloudflare Pages `_headers` 缓存策略。
- `[x]` 清理旧 PJAX、Dragula、SVG loader、source map、bootstrap-datepicker 和未直接引用的重复 vendor 资源。
- `[x]` 主题和示例构建缓存、临时目录、敏感配置、Node 缓存及编辑器文件已纳入 `.gitignore`。

### 评论与阅读量边界

- `[x]` 评论模板保留 Argon 原样式结构，提供评论列表、回复、分页、Markdown 正文、GitHub 登录入口、登录状态和退出登录。
- `[x]` `static/js/custom.js` 负责评论模块生命周期；具体 Worker/D1 评论与认证实现位于 `static/js/argon-comments.js` 和 `cloudflare/view-counter/worker.js`。
- `[x]` 阅读量前端协议、超时、降级、批量读取和管理入口已有本地代码；真实 Worker/D1 由站点部署者提供。
- `[x]` Worker 保留阅读量接口，同时增加评论认证所需的 GitHub OAuth、D1 用户/会话/state 表和评论登录鉴权。

## 未完成与下一步

### P0：当前执行顺序

1. `[x]` 用户人工验收当前纯前端页面，并确认前端阶段可以收尾。
2. `[x]` 处理当前反馈中的目录、页面信息卡片、页脚文案、代码高亮和移动端分页问题；不再重复测试已确认正常的目录。
3. `[-]` 阅读量生产化：Worker 路由、D1 表结构、CORS、鉴权/管理入口、批量读取、缓存和错误降级已部署；仍需站点线上完整验收。
4. `[-]` 自建评论本地 MVP：已完成列表、回复、分页、安全 Markdown、GitHub 登录、会话和退出登录；真实 OAuth 参数、限流、审核和公网安全仍未验收。
5. `[-]` 评论生产化设计：GitHub OAuth 回调、state/PKCE、会话/身份模型、评论鉴权和基础隐私字段策略已确定；限流、审核状态、管理员操作、CSRF/滥用防护仍待补齐。
6. `[-]` 评论生产化接入：已接入 GitHub 登录、登录状态、退出登录、访客开关、真实域名 CORS、头像和 Markdown；OAuth Secret/回调域名已部署，仍需线上完整回调验收，并补齐编辑/删除、审核和内容治理。
7. `[-]` 登录态安全收尾：已完成 CSRF Token、Origin/Fetch Metadata、JSON Content-Type、GitHub 请求超时、分页上限、安全响应头、生产来源收紧和 Cloudflare 限流；待用户在 GitHub 轮换曾出现在对话中的 Client Secret，并完成真实登录回调验收。

### P1：已有代码但缺少正向证据

- `[-]` Clamp：模块和条件加载已完成，示例内容没有正向 `.clamp` fixture。
- `[-]` 旧格式 lazyload：兼容代码已完成，需真实旧格式内容验证完整加载链路。
- `[-]` Banner 打字效果：模块和条件加载已完成，需启用配置的页面验证逐字渲染。
- `[-]` 阅读量生产验收：Worker URL、D1 绑定、CORS 和管理凭据已确认；仍需真实站点产生一次阅读量并验证前端显示。
- `[x]` 登录态安全边界：生产 Worker 已部署 CSRF 校验、请求来源校验、JSON Content-Type、GitHub 外部请求超时、响应安全头和 Cloudflare Rate Limiting；生产拒绝型接口测试通过。

### P2：按需处理

- `[ ]` Pagefind：只有文章规模或用户明确要求时接入，当前 Hugo JSON 搜索适合中小规模站点。
- `[ ]` 公网性能：等待公开地址或可用 Lighthouse/WebPageTest 后再测 LCP、INP、CLS；Brotli/Gzip/CDN 由托管平台配置。
- `[ ]` 进一步拆分核心 CSS/JS：只有静态审计发现可量化收益时处理，不进行无目标 DOM 扫描。

## 明确不执行

- `[x]` 没有外部 OAuth 参数时，不伪造 GitHub 登录成功；本地只验证未登录、未配置和权限拒绝边界。
- `[x]` 不为了补齐迁移而实现客户端伪密码保护、WordPress 后台、Gutenberg 或服务端管理能力。
- `[x]` 已按用户提供的 OAuth App 参数和回调域名部署 Worker；后续只做真实公网登录/评论验收，不伪造 OAuth 成功。

## 完成判定

- 纯前端页面：示例站和目标站本地构建通过，路由、布局、目录、分页、代码、公式、暗色模式和移动端无已知阻断问题。
- 自建评论：接口契约、D1 模型、GitHub OAuth、会话和前端登录状态完成；真实 OAuth 回调、生产域名、限流、审核和反滥用联调通过后，才将评论 Goal 标记为完成。
- 登录安全：CSRF、来源校验、限流、外部请求超时和密钥轮换完成，并通过生产登录/评论正向验收后，才将登录安全 Goal 标记为完成。
- 发布准备：源码、文档和 `.gitignore` 检查通过；提交/推送/部署必须由用户明确要求后执行。
