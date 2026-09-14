# Hugo-Theme-Argon 更新日志

本文件只记录主题仓库的实际改动和验证，按时间从早到晚排列。后续每次修改代码或完成一项可验证工作，在末尾追加新的日期条目，不回写历史条目。

## 2026-01-18：迁移基础

- 主题仓库已有 Hugo 版 Argon 的基础迁移代码，作为后续页面、配置和资源改造的起点。

## 2026-09-11：阅读量 Worker/D1

- 增加 Cloudflare Worker + D1 阅读量方案及主题侧客户端。
- 补充 D1 部署配置、GET 请求处理和客户端缓存刷新。
- 约定 endpoint 留空时不加载阅读量脚本，避免静态站点无后端时发起无意义请求。

## 2026-09-12：管理配置与基础修复

- 重构阅读量和本地主题设置，补充 D1 自动建表逻辑。
- 修复设置表单与 Hugo 规范化配置键的映射，导出配置时保留完整 `params`。
- 增加完整 Hugo 设置编辑入口；随后将设置页范围收回到阅读量相关功能，避免把主题配置管理混入管理工具。
- 修复暗色模式下禁用分页按钮的显示样式。

## 2026-09-13 20:37：结构重构与按需加载

- 重构主题脚本结构和页面生命周期，统一由 `navigation.js` 处理跨路径导航。
- 将代码高亮、分享、GitHub 卡片、Hitokoto、过时提示、评论图片预览、折叠、Pangu、Clamp、Zoomify、lazyload、Banner 和搜索拆为按需模块。
- 将模块加载条件收敛到页面内容、配置开关或首次交互，减少首页无必要的 JavaScript、vendor 和 DOM 初始化。
- 保留图片原生 lazy loading，并继续使用 Hugo Pipes 的压缩、指纹和 SRI 资源链路。

## 2026-09-13 21:02：文章目录记录

- 在目标站模拟生产环境中复现文章页左栏目录问题。
- 定位为本地访问主机名与 `canonifyURLs` 生成的资源主机名不一致，导致核心脚本和目录初始化未执行，不是标题层级解析错误。
- 使用访问地址与 `--baseURL` 一致的本地服务复核多篇文章，目录项生成、点击滚动和当前项标记均正常。

## 2026-09-13 21:15：代码高亮背景

- 修复 Hugo 生成的 `pre` 内联背景与高亮主题背景不一致导致的双层背景问题。
- 在高亮完成后同步外层代码块背景，保留代码块圆角、控制栏、行号、复制和选中样式。
- 已在目标站含多个代码块的文章页复核背景一致性。

## 2026-09-13 23:34：切换为自建评论系统占位

- 删除四种第三方评论方案的配置字段、模板分支、外部脚本/样式加载、初始化、失败重试和跨页实例清理。
- 留言板和文章底部继续输出通用 `#comments` 挂载点；关闭配置时保持隐藏，开启配置时只保留未来接入用的空容器。
- 在 `static/js/custom.js` 保留 `argonCustomComments.init/destroy` 空接口和 TODO 注释，暂不加载或请求任何评论服务。
- 更新主题默认配置、示例站点配置、留言板说明和迁移文档。
- 明确后续评论系统由自建 Worker/D1、GitHub OAuth 和 D1 数据模型组成；本次没有修改 `cloudflare/view-counter/worker.js`。
- 通过主题仓库残留搜索确认不再包含四种第三方方案的名称、脚本地址或配置字段。
- 通过全部主题 JavaScript 语法检查、`git diff --check`、示例站点 Hugo 构建和目标博客配置 Hugo 构建。

## 2026-09-13：仓库忽略规则

- 完善主题仓库 `.gitignore`，忽略 Hugo 输出、资源缓存、临时构建目录、Node/测试缓存、编辑器文件和本地敏感配置。
- 本次规则只针对生成物和本地缓存，不忽略主题源码、内容、配置或部署脚本。

## 2026-09-13：文档结构整理（本次，未提交）

- 将 `todo.md` 从混合型历史记录改为清单和 Goal：范围、原则、已完成项、未完成项、优先级、明确不执行项和完成判定。
- 新建本文件 `update.md`，承接历史改动、验证证据和后续追加规则。
- 本次只修改文档，未修改主题代码、`worker.js`、博客仓库、gitlink，也未提交或推送。

## 验证基线

- Hugo v0.154.4：示例站点普通构建通过，最近一次结果为 32 个页面、28 个 HTML、317 个静态文件、360 个总文件、9 个 alias。
- Hugo v0.154.4：使用目标博客配置并挂载本地主题构建通过，最近一次结果为 49 个页面、2 个分页页、317 个静态文件、14 个 alias。
- JavaScript：`static/argontheme.js` 与 `static/js/*.js` 均通过 `node --check`。
- 评论清理：主题源码和示例构建产物均未发现旧评论方案名称、接口或外部脚本地址。
- Worker 边界：`cloudflare/view-counter/worker.js` 在评论清理和文档整理过程中保持未修改。

## 2026-09-14：前端阶段收尾与发布准备

- 统一时间线、留言板、作者页与说说页的 `page-information-card-container` 结构和卡片类名，修正页面信息卡片的大小与位置。
- 修复页脚本地化格式，避免“由 Hugo 驱动 Hugo”重复输出。
- 保留原有 headindex 目录实现，移除额外的原生目录兜底；目录问题按用户实际页面结果确认已恢复。
- 审计主题源码，确认合并资源、headindex、短代码兼容包装和 Worker 均仍有用途；未删除可用源码文件，生成物和缓存继续由 `.gitignore` 排除。
- 示例站点 Hugo 构建通过，JavaScript 语法检查和 `git diff --check` 通过。
- 前端阶段标记完成；后续重点转向 Cloudflare Workers/D1 阅读量生产化与自建评论系统设计。

## 2026-09-14：Worker/D1 匿名评论本地 MVP

- 在现有阅读量 Worker 中增加 `/api/comments`：GET 分页读取，POST 匿名发布，支持 `parentId` 回复校验；复用原有 CORS、JSON 错误和 D1 初始化链路。
- 在 D1 增加 `comments` 表及文章路径、时间和父评论索引；同步更新 `schema.sql`，不改变阅读量表和现有阅读量协议。
- 新增 Argon 风格评论表单、纯文本评论列表、回复选择、分页按钮、加载/空状态/错误状态和 PJAX 页面生命周期初始化。
- 示例站点临时启用匿名评论，指向 `http://127.0.0.1:8787/api/comments`；生产主题默认仍关闭评论，未接入 GitHub 登录或任何第三方评论服务。
- 真实本地联调通过：Worker 8787 完成自动建表、空列表、匿名发布、匿名回复、分页、CORS；阅读量 POST 读写也保持通过；Hugo 1315 页面成功从 Worker 读取并渲染评论。
- 联调数据已从本地 D1 清理，浏览器当前保留空评论页面供手动验收；本阶段不具备公网匿名评论所需的限流、审核、身份和反滥用能力。

## 2026-09-14：恢复原 Argon 评论样式（本次，未提交）

- 移除上一版新增的渐变标题、卡片、头像和悬浮增强样式，恢复主题原有的评论 CSS 规则。
- 将评论区恢复为 Argon 原有的 `comments-area` 卡片、`comment-list`、`comment-item` 和独立 `post_comment` 卡片结构。
- 回复改为原 Argon 的嵌套 `children` 列表，并保留父评论优先于回复的渲染顺序。
- 在本地 D1 写入主评论、一级回复、二级回复、长文本、多行文本、特殊字符和第二组主评论示例，供浏览器验收；未提交或推送。
- Hugo 构建、`node --check static/js/argon-comments.js` 和浏览器 DOM 结构验证通过；本地 Hugo 1315 与 Worker 8787 已重新启动。
- 根据浏览器截图修复原 Argon flex 布局遗漏：为评论项启用换行，并让 `.children` 占满下一行，避免回复被挤到评论右侧形成伪多列。

## 2026-09-14：评论正文换行与动态公式渲染（本次，未提交）

- 确认普通 Unicode 符号无需额外解析即可显示；`<script>`、尖括号等 HTML 片段继续按纯文本输出，避免评论注入。
- 修复评论正文换行被 HTML 空白折叠的问题，保留用户输入的多行文本。
- 扩展主题数学内容检测，使动态加载的评论正文也能触发 MathJax/KaTeX；评论加载完成后重新执行公式排版。
- 本地验证 `$...$`、`\(...\)`、`$$...$$`、多行文本和 Unicode 符号均正常；未接入完整 Markdown HTML 渲染，未放开不安全 HTML。

## 2026-09-14：自建评论安全 Markdown 处理链（本次，未提交）

- 评论正文改为由浏览器端安全 DOM 渲染器处理，支持常用 Markdown：标题、粗体、斜体、删除线、行内代码、链接、图片、无序/有序列表、引用、分隔线和 fenced code block。
- 所有普通文本、代码和不可信 HTML 均通过 `textContent`/文本节点写入；`<script>`、事件属性和 `javascript:` 等内容不会执行，避免把评论区变成 XSS 注入入口。
- 链接和图片仅允许 `http:`、`https:`、`mailto:` 协议；外链在新窗口打开并附加 `nofollow noopener noreferrer`。
- Markdown 渲染完成后复用主题现有 MathJax/KaTeX 处理链，使动态评论中的 `$...$`、`\(...\)`、`$$...$$` 等公式继续排版。
- 修复浏览器缓存导致的旧脚本问题，将评论脚本版本更新为 `comments-3`；本地页面已验证 Markdown 节点、公式、换行和 `<script>` 文本化均符合预期。
- JavaScript 不作为评论 Markdown 功能开放项；后续如需代码高亮或扩展 CommonMark 语法，应继续保持“不执行用户代码”的安全边界。

## 2026-09-14：GitHub OAuth 评论登录基础链路（本次，未提交）

- 根据 GitHub 官方 OAuth Web Application Flow 接入授权码 + PKCE：`/api/auth/github/start` 创建短期 state/verifier，`/api/auth/github/callback` 校验 state 后由 Worker 服务端换取 token，并调用 GitHub `/user` 校验身份。
- 不在浏览器暴露 Client Secret，不把 GitHub access token 写入 D1；D1 仅保存 GitHub 用户资料、哈希后的站点会话 token 和短期 OAuth state。
- 新增 `/api/auth/me` 和 `/api/auth/logout`，主题评论区增加 GitHub 登录、当前登录状态、退出登录和登录后自动恢复原页面的 Argon 风格控件。
- `COMMENTS_ALLOW_GUESTS=false` 时 Worker 强制拒绝未登录评论（`401 auth_required`），即使绕过前端也不能匿名发布；登录用户昵称由已验证的 GitHub 身份决定。
- 评论请求统一携带会话 Cookie，CORS 增加 credentials；生产建议将 Worker 绑定到博客同站点的自定义域名，避免 `workers.dev` 跨站 Cookie 被浏览器拦截。
- 更新 D1 schema、Wrangler 变量说明、主题配置、示例站点配置、README 和 TODO。未配置真实 GitHub Client ID/Secret，因此本地只验证未登录和未配置边界，没有伪造 OAuth 成功测试。
- 本地验证：未登录 `GET /api/auth/me` 返回 `authenticated:false`，匿名评论 POST 返回 `401`，未配置 OAuth start 返回 `503 github_oauth_not_configured`；Hugo 页面、Worker 和静态构建均通过。

## 2026-09-14：评论头像与布局收敛（本次，未提交）

- 评论接口通过 `comments.github_id` 关联 `auth_users`，返回 GitHub `avatarUrl` 和 `profileUrl`；没有关联身份的历史评论继续使用首字母占位。
- 评论项改为紧凑的 Argon 风格：头像、用户名、回复关系和时间位于同一行，评论正文位于下一行，回复仍保持主评论下方的嵌套结构。
- 登录状态栏从评论列表卡片移到“发表评论”卡片，只在发表区域显示登录状态、GitHub 登录和退出登录按钮。
- 本地 Hugo 1315 和 Worker 8787 已启动；本地评论接口返回 `avatarUrl` 字段，主题脚本、Worker 语法检查和生产构建通过。

## 2026-09-14：修复评论头像重构运行时错误（本次，未提交）

- 删除头像布局重构后残留的 `avatarWrapper` 引用，修复 `makeComment` 抛出 `ReferenceError` 导致评论列表显示“加载失败”的问题。
- 重新加载本地 `127.0.0.1:1315/post/welcome/` 验证，评论列表已正常渲染，当前 11 条本地评论均可显示，登录提示仅位于发表评论卡片。

## 2026-09-14：登录态安全与性能加固（本次，待提交）

- 为评论和退出登录增加 CSRF Token：Worker 通过 `argon_csrf` Cookie 和 `X-CSRF-Token` 请求头校验，主题前端从 `/api/auth/me` 获取并自动携带 Token。
- 增加 `Sec-Fetch-Site` 来源上下文校验；继续使用精确 CORS 白名单，并拒绝跨站写请求。
- 评论和阅读量写接口强制 `application/json`；CORS 预检白名单同步加入 `X-CSRF-Token`。
- GitHub Token 交换和用户资料请求增加 10 秒超时，避免上游异常长期占用 Worker。
- 公开登录用户响应不再暴露 GitHub 数字 ID；头像、登录名和个人主页仍保留给评论展示使用。
- 评论页码上限从 100 万页收敛到 1 万页，减少极深 OFFSET 查询的资源消耗。
- 增加 `nosniff`、`Referrer-Policy` 和 `Permissions-Policy` 响应头。
- 配置 Cloudflare Rate Limiting：OAuth 每客户端每分钟 10 次，评论每用户/客户端每分钟 5 次。
- 生产 `ALLOWED_ORIGINS` 收紧为真实站点来源，移除本地开发来源；本地调试需使用本地变量覆盖。
- 生产 Worker 部署版本：`0a396b3d-f075-437c-94c6-a476cadb6bc5`，保留现有 D1、Secrets 和自定义域名绑定。
- 生产模拟测试通过：`auth/me=200`、CSRF Cookie 下发、缺失/错误 Token=`403`、错误 Content-Type=`403`、有效 Token 但未登录=`401`、非法来源=`403`、预检=`204`、评论读取=`200`、非法 OAuth returnTo=`400`；安全响应头和 `X-CSRF-Token` CORS 白名单存在。
- 本地 Wrangler 4.105 的旧 workerd 在当前配置启动阶段崩溃，未能完成本地 Worker 运行时测试；Worker `deploy --dry-run` 和生产边界测试通过。后续可升级 Wrangler 后补做本地限流绑定测试。
- GitHub Client Secret 曾出现在对话中，未自动猜测新值或替换；待用户在 GitHub 生成新 Secret 后再更新 Worker Secret。
