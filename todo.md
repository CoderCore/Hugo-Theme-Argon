# Hugo-Theme-Argon TODO

本文档用于记录从 WordPress 版 Argon Theme 向 Hugo 版迁移的工作。迁移目标是保留核心视觉和阅读体验，不强求复刻 WordPress 后台、Gutenberg 或必须依赖服务端的功能。

## 状态说明

- `[ ]` 未开始
- `[-]` 部分完成或需要修复
- `[x]` 已完成
- `外部服务` 表示需要评论系统、Cloudflare Worker 等站外能力

## 当前详细 Goal（按实际进度执行）

更新时间：2026-09-13

### 本轮评论方案切换

- `[x]` 删除四种第三方评论方案的模板分支、配置字段、外部脚本/样式加载、初始化、失败重试和跨页实例清理逻辑。
- `[x]` 留言板和文章底部继续保留通用 `#comments` 挂载点；`static/js/custom.js` 保留 `argonCustomComments.init/destroy` 生命周期占位，不发起评论网络请求。
- `[x]` 更新主题默认配置、示例站点配置、留言板说明和本进度文档；`worker.js` 未修改。
- `[x]` 通过主题仓库残留搜索、全部主题 JS 语法检查、差异检查，以及示例站点和博客项目本地 Hugo 构建。
- `[ ]` 自建评论系统下一阶段：先确定 Worker API 契约和 D1 数据模型，再实现 GitHub OAuth 登录、评论读取/发表/回复/分页、审核权限和前端渲染；完成接口设计前不写临时评论逻辑。

1. `[x]` 第一批配置与基础模板：配置项生效、短代码、相关文章、文章列表布局、SEO/社交卡片和图片处理均已完成，并有本地 Hugo 产物或页面回归证据。
2. `[-]` 第二批静态内容：多语言、Shuoshuo、时间线、归档、作者页和留言板静态结构已完成；留言板评论区现在只保留自建评论系统挂载点。
3. `[-]` 第三批主题内代码：阅读量 Worker/D1 客户端、Hugo JSON 搜索、GitHub 卡片和统一页面导航的本地实现已完成；四种第三方评论适配器已删除，主题只保留自建评论接口注释占位。
4. `[x]` 评论方案边界：已停止对四种第三方评论系统的空配置和无后端测试；后续评论系统改为自建 Worker/D1，且本轮不修改 `worker.js`。
5. `[-]` 本地性能优化：页面级初始化、按需模块、指纹化/SRI、缓存头和资源清理已完成大部分；本轮已移除代码高亮、分享、Pangu、Zoomify、旧格式 lazyload 的 head 提前加载，并让依赖由目标模块按需补载；Clamp/旧格式 lazyload/Banner 正向 fixture 仍缺，核心 CSS/JS 和高亮资源只在发现明确收益时继续处理，禁止无目标重复 DOM 扫描。
6. `[ ]` 公网性能与平台配置：仅在获得公开部署地址或 Lighthouse/WebPageTest 工具后补齐 LCP、INP、CLS；Brotli/Gzip、CDN 和长期缓存由实际托管平台配置。

## 本次完成度重审（2026-09-13）

### 已完成：不再重复验证

- `[x]` 主题主体迁移：配置、模板、短代码、相关文章、列表布局、SEO、图片处理、i18n、Shuoshuo、时间线、归档、作者页和留言板静态结构已经落地。
- `[x]` 本地动态实现：统一 `navigation.js`、Cloudflare Worker+D1 客户端、Hugo JSON 搜索、GitHub 信息卡以及页面级可选模块均已写入工作树；评论只保留自建接口占位。
- `[x]` 本地交付检查：普通/minify Hugo 构建、JS 语法检查、差异检查、静态路由和基础暗色模式回归已有记录；`tode.md` 已合并并删除，`todo.md` 是唯一进度文档。

### 等待外部输入：当前不执行空测

- `[ ]` 自建评论系统：待定义 Worker API、D1 数据表、GitHub OAuth 登录流程、评论审核/回复/分页及前端渲染协议；worker.js 当前不在本轮修改范围内。
- `[ ]` 阅读量生产验收：需要 Cloudflare Worker URL、D1 绑定和管理凭据后，才测试真实读写；现有内存 D1 smoke test 只证明本地协议逻辑，不等同于生产部署。
- `[ ]` 公网性能验收：需要公开部署地址或本地可用 Lighthouse/WebPageTest 工具；在条件出现前不反复测 LCP/INP/CLS。
- `[ ]` Pagefind：只有文章规模需要或用户明确要求时接入；当前 Hugo JSON 搜索已满足示例站点和中小规模内容。

### 本地仍有明确证据缺口

- `[-]` Clamp、旧格式 lazyload、Banner 打字效果：代码已拆分并按条件加载，但当前示例内容/配置没有正向 fixture；只有新增真实示例内容或用户要求兼容旧内容时才补测。
- `[-]` 性能收尾：只做一次有收益的静态审计，重点是核心 CSS/JS 体积、仍被模板引用的高亮资源和固定壳初始化；若没有可量化收益则保持现状，不继续为了“DOM 扫描”而扫描。

### 下一步计划（按顺序）

1. `[x]` 完成当前范围的静态完整性审计：模板中的可选加载器名称均能在 head 映射中找到，38 个本地资源引用中没有真实缺失项（Highlight `%s` 是预期模板占位符）；没有启动评论服务或伪造外部参数。
2. `[x]` 修复审计发现的真实本地问题：favicon 改用 `relURL`；代码高亮、分享、Pangu、Zoomify、旧格式 lazyload 的 vendor 不再由 head 提前加载，分享/Pangu 的动态依赖顺序已补齐；普通/minify 构建均通过。
3. `[x]` 当前静态审计没有发现新的阻断项，已停止继续拆分核心 JS/CSS；保留现有性能改动，等待真实服务参数或公开部署条件。
4. `[x]` 使用 `jiang068.github.io` 作为模拟生产环境：通过 `--themesDir E:\桌面\静态网页\Argon` 直接挂载当前本地 Argon 主题，未覆盖目标站点内容、构建产物或旧主题副本；目标站验收服务器运行在 `http://127.0.0.1:1317/`，并使用 `--renderToMemory`。
5. `[x]` 修复模拟生产环境的真实兼容问题：目标站点旧配置生成 XML 搜索索引，而当前 `argon-search.js` 请求 `/search.json`；已将目标 `hugo.yaml` 的 Search 输出改为 JSON，热重载无 warning，首页、`/search.json`、`/archives/` 均返回 200。
6. `[ ]` 由用户在 `http://127.0.0.1:1317/` 手动检查目标站纯前端页面和交互；收到明确复现路径后再做针对性修复，不启动评论、阅读量、D1、CORS 或公网性能测试。
7. `[ ]` 收到外部参数后，再单独创建评论/D1/公网性能验收子任务，不把外部验收混入本地迁移进度。

### 当前验收项：文章页左栏“文章目录”（2026-09-13）

- `[x]` 已在 `jiang068.github.io` 的真实文章页复现并定位：目标站 `hugo.yaml` 开启 `canonifyURLs: true`，若用 `127.0.0.1` 访问而资源地址按配置生成到 `localhost`，浏览器会因同一 dev 服务的主机名不一致而无法执行 jQuery、Argon 核心脚本和 headindex，左栏因此显示为空；这不是文章标题或目录数据缺失。
- `[x]` 已用资源地址与访问地址一致的本地目标站验证：`http://127.0.0.1:1317/` 使用匹配的 `--baseURL` 启动，`/t/96/`、`/t/109/`、`/t/63/` 分别生成 10、5、12 个目录项；在 `/t/96/` 点击目录项可滚动到对应标题并标记当前项。
- `[x]` 已确认示例站 `/post/welcome/` 的层级目录同样正常，当前没有启动评论、阅读量、D1 或任何外部服务，也没有修改 Dark Reader 兼容逻辑。
- `[ ]` 用户验收：请优先打开 `http://127.0.0.1:1317/` 检查文章页左栏目录；若验收通过，再更新目标仓库的 `themes/Hugo-Theme-Argon` gitlink 并部署。当前不更新 gitlink、不推送、不部署。

### 模拟生产环境交付边界（2026-09-13）

- `[x]` 本地主题已实际应用到 `jiang068.github.io` 的 Hugo 开发服务器；目标站点原有文章和配置结构保留，仅调整了与当前主题搜索契约冲突的 Search 输出格式。
- `[x]` 当前已完成的是纯前端可运行交付：页面模板、样式、静态资源、Hugo JSON 搜索、页面级按需模块和降级逻辑均可在本地环境检查。
- `[x]` 模拟生产真实内容 fixture 复核：`/t/96/` 实际渲染出 12 个旧格式 lazyload 节点；页面没有提前加载 lazyload vendor，`argon-lazyload.js` 与 vendor URL 均返回 200，文章结构、目录、分享和前后篇导航可见。
- `[x]` 模拟生产布局修复：目标站点 `params.pageLayout` 从 `double` 改为 `single`；热重载后的首页包含 `single-column` 且不包含 `triple-column`。
- `[x]` 单列布局问题复核与修复：确认 `pageLayout` 只控制侧栏/主区域，而 `articleListWaterflow: true` 独立启用桌面端 2/3 列文章流；已将模拟生产站点的该开关改为 `false`，首页热重载后不再输出 `waterflow` 类，浏览器页面按单列文章顺序显示。
- `[x]` 布局配置说明完善：恢复模拟生产站点 `pageLayout: double` 以显示左栏；主题新增 `articleListWaterflowColumns: 2|3` 的明确桌面列数语义，`articleListWaterflow: false` 明确表示单列，移动端仍保持单列。
- `[x]` 开发调试源已切换为 `Hugo-Theme-Argon/exampleSite`；当前 `1315` 服务通过 `--themesDir E:\桌面\静态网页\Argon` 挂载本地主题，完整样式样本页为 `/post/welcome/`，原 `jiang068.github.io` 文件未被覆盖。
- `[x]` 移动端分页修复：分页模板只输出普通 `.pagination`，旧 CSS 却在窄屏隐藏所有非 `.pagination-mobile` 节点，导致唯一分页行消失；已移除该隐藏规则并给 `.pagination-nav` 增加窄屏横向滚动，首页和 `/page/2/` 均能输出分页导航。
- `[x]` 示例站点样式与公式修复：`.shuoshuo-title`/`.shuoshuo-content` 改用主题文字变量，暗色模式下不再继承近黑色；代码块外层 `pre.hljs-codeblock` 补齐 8px 圆角，避免 Hugo 的内联背景露出方角；代码选中样式移除未定义的 `--color-selection-rgbstr`，改用主题选中色并明确选中文字色，选中区域在暗色代码块中可见。
- `[x]` 修复 Hugo 高亮代码双层背景：Hugo 生成的 `pre` 内联黑色背景会与高亮主题给 `code.hljs` 的背景色不一致；`argon-code.js` 在高亮完成后将外层背景同步为当前高亮主题背景，已在目标站 `/t/166/` 的 13 个代码块中验证无背景色不一致。
- `[x]` 示例站点数学公式修复：`exampleSite/hugo.yaml` 启用 `mathRender: mathjax3`；本地浏览器实际验证欢迎页的 `$...$` 内联公式和 `$$...$$` 块级公式均已排版，常用 `\\(...\\)`、`\\[...\\]` 及 TeX 环境由现有 MathJax 配置覆盖。
- `[x]` 本次范围边界：按用户要求未修改浏览器 Dark Reader 兼容逻辑；示例站仍在 `1315`，目标站目录验收实例在 `1317`，不涉及评论、阅读量、Worker/D1 或其他外接服务。
- `[ ]` 尚未宣称完成的部分：真实评论读写、真实阅读量、Cloudflare Worker/D1、跨域配置、公开站点性能指标；这些都需要用户提供服务或部署条件。
- `[ ]` 手动 debug 期间只记录真实的页面/交互问题；不为不存在的评论数据制造 DOM fixture，也不重复验证已经有明确通过证据的模块。

### 当前执行子目标

- `[x]` 评论接口清理：删除四种第三方评论的模板分支、配置字段、外部脚本/样式加载、初始化、失败重试和跨页实例清理逻辑；保留通用 `#comments` 挂载点与注释占位。
- `[x]` 验证评论接口清理：通过仓库残留搜索确认不再引用四种第三方服务；通过 JavaScript 语法检查、普通 Hugo 构建和差异检查；`worker.js` 未修改。
- `[x]` 页面级初始化：目录索引、卡片圆角、搜索和取色器接收当前页面根节点；保留首次加载的 `document` 兼容路径，并修复跨页设置面板初始化风险。
- `[x]` 验证页面级初始化：全新本地浏览器标签首屏未加载取色器资源，打开设置后按需生成取色器；跨页进入文章页后目录、搜索绑定和代码高亮正常，干净标签无新增警告/错误。
- `[x]` 核心资源拆分：将 Highlight.js 渲染、行号、复制、全屏和折行控制移至 `static/js/argon-code.js`；仅在当前页面存在代码块时动态加载，保留可配置高亮主题及语言资源。
- `[x]` 验证代码模块拆分：普通/minify 构建均通过；本地跨页回归确认首页不加载代码模块，进入含 2 个代码块的文章页后加载 1 个模块并生成 2 组控制栏，行号切换正常。
- `[x]` 分享资源拆分：将分享展开和复制链接事件委托移至 `static/js/argon-share.js`；核心脚本仅保留分享数据初始化，分享控制模块按文章页内容动态加载。
- `[x]` 验证分享模块拆分：普通/minify 构建均通过；本地跨页回归确认首页不加载分享模块，文章页加载 1 个分享模块且分享区可正常展开，浏览器日志无警告或错误。
- `[x]` GitHub 资源拆分：将 GitHub 信息卡的静态渲染、API 请求、缓存、超时和失败降级移至 `static/js/argon-github.js`；仅在当前页面存在 GitHub 卡片时动态加载。
- `[x]` 验证 GitHub 模块拆分：普通/minify 构建均通过；本地跨页回归确认首页不加载 GitHub 模块，文章页加载 1 个模块并完成卡片初始化，浏览器日志无警告或错误。
- `[x]` Hitokoto 资源拆分：将一言的节点初始化、空闲请求和失败降级移至 `static/js/argon-hitokoto.js`；仅在当前页面存在 `.hitokoto` 节点时动态加载。
- `[x]` 验证 Hitokoto 模块拆分：普通/minify 构建均通过；本地回归确认首页没有 `.hitokoto` 时不加载模块，文章页既有代码、分享和 GitHub 模块仍正常加载，浏览器日志无警告或错误。
- `[x]` 过时文章提示拆分：将过时 Toast 的显示和节点清理移至 `static/js/argon-outdate.js`；仅在当前页面出现 `#post_outdate_toast` 时动态加载，保留潜在自定义内容兼容性。
- `[x]` 验证过时提示模块拆分：普通/minify 构建均通过；当前首页和文章页无 Toast 节点时均不加载该模块，文章页其他按需模块和代码渲染正常，浏览器日志无警告或错误。
- `[x]` 评论图片预览拆分：将评论图片的懒加载、Zoomify 联动和点击委托移入 `static/js/argon-comment-image.js`；仅在当前页面出现 `.comment-item-text .comment-image` 时动态加载，并在跨页导航开始时清理活动图片状态和计时器。
- `[x]` 验证评论图片预览拆分：普通/minify 构建均通过；本地首页和示例文章没有评论图片时均不加载 `argon-comment-image.js`，文章页代码/分享/GitHub 模块和高亮仍正常，浏览器日志无警告或错误，服务、标签页已清理且端口已释放；两份重定向日志被宿主工具进程保持句柄，已记录为环境清理限制。
- `[x]` 折叠交互拆分：将 `collapse` 短代码的键盘支持、展开/收起动画和可访问状态更新移入 `static/js/argon-collapse.js`；仅在当前页面出现 `.collapse-block` 时动态加载，并按当前折叠块定位内容。
- `[x]` 验证折叠交互拆分：普通/minify 构建均通过；本地首页无折叠节点时不加载 `argon-collapse.js`，示例文章加载 1 个模块且折叠块初始收起，点击后 `aria-expanded=true`、内容显示，浏览器日志无警告或错误，服务、标签页和端口已清理。
- `[x]` Pangu 模块拆分：将文章内容的 Pangu 文本间距初始化移入 `static/js/argon-pangu.js`；仅在 `enablePangu=true` 且当前页面存在 `#post_content` 时动态加载，保留重复初始化保护并对 Pangu vendor 缺失安全降级。
- `[x]` 验证 Pangu 模块拆分：普通/minify 构建均通过；当前示例配置 `enablePangu=false`，本地首页和文章页均不加载 `argon-pangu.js`，文章页代码高亮和折叠交互仍正常，浏览器日志无警告或错误，服务、标签页和端口已清理。
- `[x]` Clamp 模块拆分：将 `.clamp` 文本截断初始化移入 `static/js/argon-clamp.js`；仅在当前页面存在 `.clamp` 节点时动态加载，保留 `data-argon-clamp-initialized` 防重复标记及 `$clamp` 缺失安全降级。
- `[-]` 验证 Clamp 模块拆分：普通/minify 构建均通过；当前示例文章没有 `.clamp` 节点，默认页面未加载 `argon-clamp.js` 且其他文章功能正常。正向动态加载和实际截断效果需有相关文章数据后补验，当前浏览器自动化环境也不允许注入临时 DOM fixture。
- `[x]` Zoomify 模块拆分：将正文图片的 Zoomify 初始化移入 `static/js/argon-zoomify.js`；仅在 `#post_content img` 存在且站点开关启用时加载，跨页缺少 vendor 时先动态加载 `zoomify.js`，避免依赖首页遗留的页面级配置。
- `[x]` 验证 Zoomify 跨页生命周期：普通/minify 构建均通过；首页文章预览不触发 Zoomify，跨页进入示例文章后 vendor 和模块各加载 1 个，正文图片获得 `.zoomify`，代码高亮和折叠交互仍正常，浏览器日志无警告或错误。
- `[x]` lazyload 模块拆分：将旧 jQuery lazyload 的图片/评论贴纸初始化移入 `static/js/argon-lazyload.js`；仅在当前页面出现旧格式 `.lazyload` 目标节点且站点开关启用时加载，跨页缺少 vendor 时先动态加载 `jquery.lazyload.min.js`，保留阈值、效果和去重标记。
- `[-]` 验证 lazyload 模块拆分：普通/minify 构建均通过；当前 Hugo 图片模板使用原生 `loading="lazy"`，首页/示例文章没有旧格式 `.lazyload` 节点，因此新模块加载数均为 0、文章其他功能正常；旧 jQuery lazyload 正向节点和评论贴纸路径需旧格式内容或真实评论 fixture 后补验。
- `[x]` Banner 模块拆分：将 `data-text` Banner 打字效果移入 `static/js/argon-banner.js`；仅在当前页面存在启用打字效果的 Banner 时动态加载，保留跨页替换后按当前 Banner 节点初始化和重复初始化保护。
- `[-]` 验证 Banner 模块拆分：普通/minify 构建均通过；当前示例配置 `enableTypingEffect=false`，首页和示例文章均无 `data-text` Banner，模块加载数为 0 且跨页无控制台警告/错误。打字效果的正向逐字渲染需启用该配置的实际页面后补验。
- `[x]` 搜索模块拆分：将 Hugo JSON 索引请求、会话内缓存、关键词匹配、摘要渲染和结果关闭行为移入 `static/js/argon-search.js`；核心脚本仅保留搜索框首次聚焦/点击的触发器，避免搜索实现首屏执行；索引请求失败后清除加载状态，后续再次聚焦/点击可以重试。
- `[x]` 验证搜索模块拆分：普通/minify 构建均通过；本地首页首屏不加载 `argon-search.js`，打开搜索并输入“`Hugo`”后加载 1 个模块并渲染 3 条结果，浏览器无警告/错误；静态检查确认失败分支清除 `data-argon-search-loading` 且触发器不是一次性监听器，服务、标签页和端口均已清理。
- `[x]` 短代码产物验收：示例文章生成 HTML 已实际包含提示块、标签/待办、折叠、隐藏文字、进度条、时间线和 GitHub 卡片结构；首页摘要与 RSS 含文章内容且无残留 Hugo 短代码标记，暗色模式选择器存在。
- `[x]` SEO/图片/站点输出产物复核：文章 HTML 实际包含 canonical、description、OG image、Twitter Card 和 Article JSON-LD；首图使用 eager/high priority，首页预览图片使用 lazy；`robots.txt`、`sitemap.xml` 和 `search.json` 均生成。
- `[x]` 静态页面路由与暗色模式回归：修复示例站点“关于”菜单与内容路径不一致的问题，`exampleSite/hugo.yaml` 统一指向 `/about/`，内容页使用明确 `url: "/about/"`；本地浏览器确认 `/about/` 与 `/page/about/` 均能打开关于页，时间线、留言板、作者、归档、说说均非 404，首页“关于”链接为 `/about/`，暗色模式可由 `false` 切换为 `true`。
- `[x]` 按需依赖与资源引用审计复核：普通/minify 构建均通过，均为 32 个页面、28 个 HTML、317 个静态文件、360 个总文件、9 个 alias；首页/文章产物不再提前输出 lazyload、Zoomify、分享、Pangu、Highlight vendor 或高亮样式，分享/Pangu vendor 已写入可选资源映射，`relURL` favicon 和 `/page/about/` alias 均保留。
- `[-]` 按“完成度重审”执行后续边界：本地静态审计及真实缺陷修复已完成；外部评论后端、真实 D1、Pagefind 和公网性能基线明确暂停，直到出现对应输入或需求。

## 第一批：简单、适合独立完成的项目

这些项目改动范围小，适合一次只做一个，并能独立构建和回归。

### 1. 修复已有配置项的生效逻辑

- `[x]` 让 `params.showShareBtn` 控制分享按钮显示与否。
- `[x]` 让 `params.showReadingtime` 控制阅读时间显示。
- `[x]` 使用 Hugo 的字数统计和 `readingSpeedCn`/`readingSpeedEn` 实现阅读时间。
- `[x]` 检查 `articleMeta` 中每个字段是否都能按配置隐藏，并兼容 `comments` 与 `read` 别名；`commentsCount: 0` 也能正确显示。
- `[x]` 为文章元信息、阅读时间和分享开关补齐最小示例、默认值和可用字段说明。

验收：分别打开配置项和关闭配置项，文章页、列表页的界面均符合预期。

### 2. 增加基础 Hugo 短代码

先实现不需要 JavaScript 和后端的短代码：

- `[x]` `alert`（兼容 `admonition`）
- `[x]` `tip`（映射到 `admonition`）
- `[x]` `tag`（兼容原主题 `label`）
- `[x]` `todo`（兼容原主题 `checkbox`）
- `[x]` `collapse`（兼容原主题 `fold`）
- `[x]` `hidden`（兼容原主题 `spoiler`）

后续再考虑：

- `[x]` `video`
- `[x]` `progressbar`
- `[x]` `timeline`
- `[x]` `github` 信息卡：支持前端 API、静态数据、加载和失败状态；采用 10 分钟会话缓存、5 秒请求超时和旧缓存兜底，缓存生命周期明确依赖当前浏览器会话。

验收：在 Markdown 中加入短代码后，文章页和 RSS/摘要输出不报错，暗色模式下样式正常。

### 3. 增加相关文章

- `[x]` 使用 Hugo Related Content 生成相关文章。
- `[x]` 默认按标签、分类匹配，并排除当前文章。
- `[x]` 在文章底部提供无相关文章时不渲染空容器。
- `[x]` 相关文章卡片复用现有缩略图逻辑；卡片结构与专用 CSS 对齐。由于相关文章是固定尺寸的横向卡片，保留独立结构而不直接复用 `article/preview.html`。

验收：文章底部能稳定显示相关内容，文章数量不足时布局不塌陷。

### 4. 统一文章列表布局类名

- `[x]` 统一 `baseof.html`、首页/列表模板和 `style.css` 使用的布局类名。
- `[x]` 让 `articleListLayout` 真正切换列表样式。
- `[x]` 让 `articleListWaterflow` 真正作用于文章列表容器。
- `[x]` 已覆盖单栏、双栏、反向双栏、三栏右栏和移动端布局。

验收：配置切换后不需要修改 CSS，首页、分类页、标签页的布局均正确。

### 5. 完善基础 SEO 和社交卡片

- `[x]` 补齐页面 description、canonical、Open Graph 和 Twitter Card。
- `[x]` 为文章使用文章封面或正文首图作为 `og:image`。
- `[x]` 增加 Article JSON-LD 的标题、作者、发布时间和更新时间。
- `[x]` 增加 robots.txt 和 sitemap 声明；RSS 继续使用 Hugo 默认输出。

验收：查看生成 HTML 的 head，首页、文章页、分类页均有合理的 meta 信息。

### 6. 优化文章图片

- `[x]` 使用 Hugo Page Resources 生成缩略图；静态路径和外链继续保留原地址。
- `[x]` 为列表卡片和相关文章提供 `srcset` 和 `sizes`。
- `[x]` 对可识别的页面资源图片输出明确宽高，减少 CLS。
- `[x]` 文章首图使用 eager/high priority，列表和相关文章使用 lazy loading。
- `[x]` 压缩内置 Banner；文章默认封面继续由页面资源图片处理生成 WebP，静态路径和外链不重复转码。

验收：桌面端和移动端都不会加载明显超出显示尺寸的大图，图片加载时页面不跳动。

## 第二批：中等规模的静态移植

- `[x]` 多语言：常见模板 UI、页脚、分享提示、分页无障碍标签、主题设置和主要脚本提示均已迁移到 `i18n`；主要页面标题、空状态文案与图片替代文本已补齐。Cloudflare 阅读量管理页属于独立管理工具，保持中文管理界面。
- `[x]` Shuoshuo：增加 `content/shuoshuo` 内容类型、列表页和首页展示方式。
- `[x]` 时间线：用日期排序的静态内容页替代 WordPress 时间线模板。
- `[-]` 留言板页面：已完成静态页面结构，并保留自建评论系统挂载点；评论界面和 API 待后续自建系统实现。
- `[x]` 归档页增加月度分组、文章数量和可配置显示方式。
- `[x]` 增加复用侧栏资料的作者介绍页；多作者 taxonomy 暂不实现。

## 第三批：需要外部服务或较多 JavaScript 的功能

- `[-]` 评论系统：四种第三方适配器、配置分支和外部脚本加载代码已删除；`#comments` 模板挂载点和 `argonCustomComments` 生命周期占位已保留，待自建 Worker/D1 接口确定后实现。
- `[-]` 阅读量：保留 Cloudflare Worker + D1 方案，并让请求只在启用阅读量的页面执行；已通过内存 D1 smoke test 验证鉴权、CORS、批量读写和管理员操作，真实 Cloudflare D1 部署仍需站点配置。
- `[-]` 搜索：已改为首次交互时按需加载的 Hugo 精简 JSON 模块，使用原生 DOM 渲染并支持索引请求失败后重试；文章较多时仍可继续接入 Pagefind。
- `[x]` GitHub 信息卡：设计失败状态、10 分钟会话缓存和 API 限流处理。
- `[x]` 密码文章：不在主题内实现客户端“密码保护”（静态页面无法安全隐藏内容）；需要访问控制时使用 Cloudflare Access、站点鉴权或构建前加密方案。
- `[x]` 页面导航：当前 navigation.js 是唯一导航入口，已移除旧搜索、password-form 和多容器 PJAX 兼容代码。

## 不建议迁移的 WordPress 专属功能

- `[x]` Gutenberg 编辑器和 WordPress 后台小工具：明确不迁移，改用 Hugo Markdown/短代码和站点配置。
- `[x]` WordPress 更新检查、后台设置页：明确不迁移，主题发布随 Git/构建流程管理。
- `[x]` 服务端评论编辑历史、邮件通知、验证码后台：不从 WordPress 迁移；未来由自建评论系统按实际需求设计。
- `[x]` 依赖 WordPress 查询接口的动态文章类型筛选：明确不迁移，使用 Hugo 内容类型、分类、标签和本地搜索替代。

## 性能任务

- `[-]` 已完成本地构建产物和运行时页面检查；完整 Lighthouse/WebPageTest 的 LCP、INP、CLS 基线仍待可用的 Lighthouse 工具或公开部署地址后补测。
- `[-]` JS bundle 已拆出页面目录索引及懒加载、Zoomify、分享、取色器、Pangu、高亮、GitHub、Hitokoto、过时提示、评论图片预览、折叠交互、Clamp、Banner 打字和搜索等可选模块；取色器 CSS/JS 现在仅在首次打开设置面板时加载，搜索实现仅在首次聚焦/点击时加载且失败可重试，分享限制到内容页，高亮、评论图片预览、折叠交互、Clamp、Zoomify、旧格式 lazyload 和 Banner 打字进一步限制到实际含目标节点/启用配置的页面，Pangu 进一步限制到启用配置且含文章正文的页面，Zoomify/lazyload vendor 也支持跨页按需补载；当前模板的原生 `loading="lazy"` 保持不变，核心 bundle 和其余 CSS 仍待进一步拆分。
- `[-]` 已从发布用 JS bundle 删除不再使用的 PJAX 依赖，清理孤立的 Dragula/PJAX/SVG loader 目录和 bootstrap-datepicker 目录，移除未直接引用的 `css/bootstrap`、`vendor/bootstrap`、`vendor/nprogress` 和 `vendor/onscreen` 目录（已由 Hugo Pipes 合并并指纹化），删除 10 个 source map（约 1.56 MB）和 14 个未被主题引用的未压缩/重复 vendor 副本；未使用的高亮主题和语言包仍待按配置兼容性进一步清理。
- `[-]` 主题脚本已改为有序 `defer`，Busuanzi 改为显式开关；完整模块化拆包仍待处理。
- `[-]` 外部字体已改为显式开关并默认关闭；Busuanzi、数学公式、分享、Hitokoto、GitHub 信息卡和阅读量脚本已按需/延迟加载。数学公式支持 MathJax 3、MathJax 2 和 KaTeX，并仅在启用且页面实际包含公式时动态加载；GitHub API 和阅读量请求也已延迟到浏览器空闲时执行；第三方 API 的进一步细粒度延迟仍可继续优化。
- `[-]` 核心 CSS/JS 已移入 `assets/`，经 Hugo Pipes `Minify` 后使用 SHA-256 指纹和 SRI；已修正合并 CSS 中 Font Awesome 字体的绝对资源路径，并通过 `static/_headers` 为指纹资源设置 immutable 缓存；vendor 资源仍需继续整理，其他托管平台需自行配置长期缓存头。
- `[-]` 已让人性化时间刷新只在页面存在 `.human-time` 时启动，定时器与计算均收敛到当前页面根节点；刷新和跨页导航后的图片懒加载、Zoomify、Pangu、Clamp、过时提示、GitHub 卡片、评论图片预览、折叠交互、目录索引、卡片圆角、搜索和取色器初始化均已限定到合理的页面/固定区域；Clamp 正向运行时仍待真实相关文章节点补验，其余全局 jQuery 插件和 DOM 扫描仍待继续审计。
- `[-]` 指纹化核心 CSS/JS 已通过 Cloudflare Pages `_headers` 启用 immutable 缓存；Brotli/Gzip 与 CDN 分发仍由具体托管平台提供。

## 推荐的实际推进顺序

1. 配置项生效逻辑
2. 基础短代码
3. 相关文章
4. 布局类名和瀑布流修复
5. SEO 和图片处理
6. Shuoshuo/时间线/留言板
7. 评论、搜索和其他外部服务
8. 资源拆分与性能优化

## 执行记录与当前状态

以下内容合并自原 `tode.md`，以后只维护本文件。

更新时间：2026-09-13

### 已完成的移植工作

- 配置项：分享按钮、阅读时间、中文/英文阅读速度、`articleMeta` 字段及 `comments`/`read` 别名均已接入；`commentsCount: 0` 能正确显示，并已补齐默认值、最小示例和说明。
- 第一批模板：文章列表布局、瀑布流、相关文章、SEO/Open Graph/Twitter Card/Article JSON-LD、robots.txt、sitemap 和图片 Page Resources 处理已完成；图片支持 WebP、srcset、尺寸属性、首图优先加载及列表懒加载。
- 短代码：已加入 `alert`、`tip`、`tag`、`todo`、`collapse`、`hidden`、`video`、`progressbar`、`timeline`、`github`，并兼容原主题常用别名。
- 第二批页面：中文/英文 i18n、Shuoshuo、时间线、归档页和作者介绍页已完成；留言板的静态结构已完成并保留自建评论挂载点。
- 动态功能：已移除四种第三方评论适配器；保留 Cloudflare Worker + D1 阅读量方案；搜索改为按需加载的 Hugo 精简 JSON；GitHub 信息卡支持静态数据、API、失败状态、5 秒超时、旧数据和 10 分钟会话缓存。
- 静态站点边界：未实现不安全的客户端密码保护；WordPress 后台、Gutenberg、更新检查、服务端评论历史/邮件/验证码和依赖 WordPress 查询接口的筛选均明确不迁移。
- 导航与性能：`navigation.js` 已成为唯一页面导航入口；可选的分享、数学公式、代码高亮、取色器、阅读量、GitHub、Hitokoto、过时文章提示、评论图片预览、折叠交互、Pangu、Clamp、正文图片 Zoomify、旧格式 lazyload、Banner 打字和搜索能力按需或延迟加载；代码高亮渲染控制已拆至 `argon-code.js`，分享控制已拆至 `argon-share.js`，GitHub 信息卡已拆至 `argon-github.js`，Hitokoto 已拆至 `argon-hitokoto.js`，过时文章提示已拆至 `argon-outdate.js`，评论图片预览已拆至 `argon-comment-image.js`，折叠交互已拆至 `argon-collapse.js`，Pangu 初始化已拆至 `argon-pangu.js`，Clamp 初始化已拆至 `argon-clamp.js`，Zoomify 初始化已拆至 `argon-zoomify.js`，lazyload 初始化已拆至 `argon-lazyload.js`，Banner 打字和搜索实现已分别拆至 `argon-banner.js`、`argon-search.js`，均按页面内容、配置或首次交互加载；当前页面图片仍使用原生 `loading="lazy"`；指纹化核心资源已设置 SRI，并提供 Cloudflare Pages `_headers` 的 immutable 缓存策略。
- 资源清理：已删除旧 PJAX、Dragula、SVG loader、source map、bootstrap-datepicker 及未直接引用的重复 Bootstrap/NProgress/OnScreen 目录；Pickr 仅保留实际使用的 `monolith` 主题。
- 跨页生命周期：图片懒加载、Zoomify、Pangu、Clamp、过时提示、GitHub 卡片、阅读量和人性化时间刷新已限定到当前页面根节点，避免旧页面响应污染新页面。
- 评论生命周期：四种第三方评论的 idle/timeout 调度、脚本状态和实例清理代码已删除；未来自建评论系统的生命周期从 `argonCustomComments` 占位扩展。
- 页面级初始化：目录索引、卡片圆角和搜索使用当前 `#page-view` 根节点；取色器保留固定浮动设置区域的 `document` 兼容路径，并在首次加载后避免重复实例化。
- 代码高亮拆分：核心脚本仅保留高亮依赖加载器，渲染、行号、复制及控制栏逻辑移入 `static/js/argon-code.js`；动态导航到代码页时可继续复用同一模块。
- 分享模块拆分：核心脚本仅保留分享数据初始化，展开分享区和复制链接逻辑移入 `static/js/argon-share.js`；动态导航到文章页时按内容加载该模块。
- GitHub 模块拆分：核心脚本仅保留 GitHub 模块加载器，信息卡的静态渲染、API、缓存和失败降级逻辑移入 `static/js/argon-github.js`；动态导航到含卡片页面时按内容加载该模块。
- Hitokoto 模块拆分：核心脚本仅保留 Hitokoto 模块加载器，一言节点初始化、空闲请求和失败降级移入 `static/js/argon-hitokoto.js`；动态导航到含节点页面时按内容加载该模块。
- 过时提示模块拆分：核心脚本仅保留 Toast 模块加载器，过时文章提示的显示和节点清理移入 `static/js/argon-outdate.js`；动态导航到含提示节点页面时按内容加载该模块。
- 评论图片预览拆分：核心脚本不再全局注册评论图片点击处理器，懒加载、Zoomify 联动和导航清理移入 `static/js/argon-comment-image.js`；动态导航到含评论图片页面时按内容加载该模块。
- 折叠交互拆分：核心脚本不再全局注册 `collapse-block` 事件处理器，键盘交互、动画和 ARIA 状态移入 `static/js/argon-collapse.js`；动态导航到含折叠短代码页面时按内容加载该模块。
- Pangu 模块拆分：核心脚本不再保留 Pangu 初始化实现，文章正文的间距处理移入 `static/js/argon-pangu.js`；动态导航到启用 Pangu 且含正文页面时按配置加载该模块。
- Clamp 模块拆分：核心脚本不再保留 `.clamp` 初始化实现，文本截断移入 `static/js/argon-clamp.js`；动态导航到含截断节点页面时按内容加载该模块。
- Zoomify 模块拆分：核心脚本不再保留正文图片 Zoomify 初始化实现，相关逻辑移入 `static/js/argon-zoomify.js`；动态导航到含正文图片页面时按需补载 vendor 和模块。
- lazyload 模块拆分：核心脚本不再保留旧 jQuery lazyload 初始化实现，图片/评论贴纸处理移入 `static/js/argon-lazyload.js`；动态导航到含旧格式 lazyload 节点页面时按需补载 vendor 和模块，原生 `loading="lazy"` 不受影响。
- Banner 和搜索模块拆分：Banner 打字实现移入 `argon-banner.js`，Hugo JSON 搜索实现移入 `argon-search.js`；前者按 `data-text` 配置加载，后者按首次搜索交互加载，核心脚本仅保留必要触发器。

### 验证记录

- 使用 Hugo v0.154.4 对 `exampleSite` 做普通构建和 minify 构建，均通过：32 个页面、27 个 HTML、317 个静态文件、359 个总文件；新增的代码、分享、GitHub、Hitokoto、过时提示、评论图片预览、折叠交互、Pangu、Clamp、Zoomify、lazyload、Banner 和搜索模块文件计入静态文件增长。
- 构建输出中未发现已清理的 bootstrap-datepicker、`/css/bootstrap/`、`/vendor/bootstrap/`、`/vendor/nprogress/` 或 `/vendor/onscreen/` 引用。
- `node --check` 已通过 `static/argontheme.js`、`static/js/custom.js`、`static/js/navigation.js` 和 `static/js/view-counter.js`；`git diff --check` 无内容错误，仅有 CRLF 转换和 Git 全局 ignore 权限提示。
- 配置矩阵已验证取色器开关、分享按钮、阅读时间、`articleMeta`、`commentsCount: 0` 和评论关闭状态；评论接口未实现前不会注入任何评论服务脚本，未启用阅读量时不会注入 `view-counter.js`。
- 已验证 MathJax 3、MathJax 2、KaTeX 的按需配置；默认无公式页面不注入外部公式脚本。
- 本地 Hugo server 和浏览器回归已验证：默认文章显示分享按钮和阅读时间，关闭配置后正确隐藏；搜索框聚焦时才加载 `/search.json`；从首页导航到含 2 个代码块的文章页后能动态高亮；取色器首次打开设置面板时才加载；阅读量 Worker smoke test 返回计数 `41`；测试服务、配置和构建输出均已清理。
- 短代码产物复核：普通构建得到 32 个页面、27 个 HTML、317 个静态文件；示例文章 HTML 包含 `admonition`、`collapse-block`、`argon-hidden-text`、`progress-wrapper`、`argon-timeline`、`github-info-card`、`badge-pill` 和 `custom-control-input`，首页摘要和 RSS 均包含文章内容且不含原始 `{{< ... >}}` 短代码标记，暗色模式 CSS 选择器存在，临时构建目录已清理。
- SEO/图片产物复核：普通构建得到 32 个页面、27 个 HTML、317 个静态文件；文章页 canonical、description、OG image、Twitter Card、Article JSON-LD 均匹配，文章首图含 `loading="eager"`/`fetchpriority="high"`，首页预览含 `loading="lazy"`，`robots.txt`、`sitemap.xml`、`search.json` 均存在，临时构建目录已清理。
- 本地构建输出和临时 fixture 已清理，没有提交或推送远端。
- 本轮评论生命周期改动通过 `node --check` 及普通/minify Hugo 构建，结果均为 32 个页面、27 个 HTML、304 个静态文件、346 个总文件。
- 本轮页面级初始化改动通过 `node --check`（`argontheme.js`、`custom.js`、`navigation.js`）及普通/minify Hugo 构建；全新本地浏览器标签确认首屏不加载 Pickr，打开设置后才加载并生成取色器，跨页文章页面初始化正常且无新增警告/错误。
- 页面级初始化修复复核：普通构建和 minify 构建均成功，分别得到 32 个页面、27 个 HTML、304 个静态文件、346 个总文件；该轮临时构建输出已清理，`git diff --check` 无内容错误。
- 代码高亮拆分复核：四个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、305 个静态文件、347 个总文件；本地浏览器确认首页 `argon-code.js` 加载数为 0、代码文章页加载数为 1、渲染 2 个代码块和 2 个控制栏，临时服务、标签页和日志均已清理。
- 分享模块拆分复核：五个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、306 个静态文件、348 个总文件；本地浏览器确认首页 `argon-share.js` 加载数为 0、文章页加载数为 1，分享区展开正常且无警告/错误，临时服务、标签页和日志均已清理。
- GitHub 模块拆分复核：六个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、307 个静态文件、349 个总文件；本地浏览器确认首页 `argon-github.js` 加载数为 0、文章页加载数为 1，卡片初始化完成并保留失败降级，临时服务、标签页和日志均已清理。
- Hitokoto 模块拆分复核：七个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、308 个静态文件、350 个总文件；本地浏览器确认首页无 `.hitokoto` 时 `argon-hitokoto.js` 加载数为 0，文章页代码、分享和 GitHub 模块分别加载 1 个且功能正常，临时服务、标签页和日志均已清理。
- 过时提示模块拆分复核：八个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、309 个静态文件、351 个总文件；本地浏览器确认首页和文章页无 `#post_outdate_toast` 时 `argon-outdate.js` 加载数均为 0，文章页其他按需模块和代码渲染正常，临时服务、标签页和日志均已清理。
- 评论图片预览拆分复核：九个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、310 个静态文件、352 个总文件；本地浏览器确认首页和示例文章没有评论图片时 `argon-comment-image.js` 加载数均为 0，文章页代码/分享/GitHub 模块分别加载 1 个且高亮正常，浏览器无警告/错误，`PORT 1314` 已释放；仅本轮两份重定向日志仍被宿主句柄锁定，未能删除。
- 折叠交互拆分复核：十个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、311 个静态文件、353 个总文件；本地浏览器确认首页无折叠节点时 `argon-collapse.js` 加载数为 0，示例文章加载数为 1，折叠块可从收起状态点击展开并更新 ARIA 状态，浏览器无警告/错误，服务、标签页和端口均已清理。
- Pangu 模块拆分复核：十一个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、312 个静态文件、354 个总文件；本地浏览器在 `enablePangu=false` 配置下确认首页和文章页 `argon-pangu.js` 加载数均为 0，文章页代码高亮和折叠交互正常，浏览器无警告/错误，服务、标签页和端口均已清理。
- Clamp 模块拆分复核：十二个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、313 个静态文件、355 个总文件；本地浏览器确认示例文章没有 `.clamp` 节点且 `argon-clamp.js` 加载数为 0，其他文章功能和浏览器日志正常；因当前 fixture 无正向 `.clamp` 节点且自动化环境禁止 DOM 注入，实际截断效果待真实相关文章数据补验，服务、标签页和端口已清理。
- Zoomify 跨页修复复核：十三个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、314 个静态文件、356 个总文件；本地浏览器从首页进入示例文章时确认首页 Zoomify 模块/vendor 加载数均为 0，文章页二者均为 1，正文图片 `zoomify` 类数量为 1，代码高亮和折叠模块仍正常，浏览器无警告/错误，服务、标签页和端口均已清理。
- lazyload 模块拆分复核：十四个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、315 个静态文件、357 个总文件；本地浏览器从首页进入示例文章时确认当前模板无旧格式 `.lazyload` 节点，新模块加载数为 0、lazyload vendor 保持页面模板所需的 1 个，文章其他功能正常且浏览器无警告/错误；旧格式 lazyload 正向路径待真实 fixture 补验，服务、标签页和端口已清理。
- Banner 模块拆分复核：十六个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、316 个静态文件、358 个总文件；本地浏览器从首页进入示例文章时确认当前示例未启用 `data-text` Banner，`argon-banner.js` 加载数均为 0，Banner 文本正常显示且跨页无警告/错误，服务、标签页和端口已清理；启用打字效果后的正向逐字渲染待真实配置页面补验。
- 搜索模块拆分复核：十七个 JS 文件均通过 `node --check`；普通/minify 构建均成功并得到 32 个页面、27 个 HTML、317 个静态文件、359 个总文件；本地浏览器确认首页首屏 `argon-search.js` 加载数为 0，打开搜索并输入“`Hugo`”后加载数为 1、渲染 3 条结果，浏览器无警告/错误；代码检查确认索引失败会清除加载状态且后续交互仍可触发重试，服务、标签页和端口已清理。
- 关于页路由修复复核：最初浏览器回归发现导航指向 `/about/` 但内容文件默认生成 `/page/about/`，导致 `/about/` 404；已改为显式 `url: "/about/"` 并同步顶栏/侧栏配置。修复后本地 Hugo server 确认 `/about/` 和 `/page/about/` 均正常渲染，静态页面路由矩阵（首页、关于、时间线、留言板、作者、归档、说说）全部非 404；暗色模式切换通过，浏览器标签页关闭，1314 无遗留监听进程。
- 最终本地验收复核：普通/minify 构建均通过，均为 32 个页面、28 个 HTML、317 个静态文件、360 个总文件、9 个 alias；生成 `/about/` 路由并保留 `/page/about/` 兼容重定向，canonical、Article JSON-LD、robots、sitemap、search 输出仍存在；17 个主题/模块 JS（含 `static/argontheme.js`、`static/js/*.js`）全部通过 `node --check`，`git diff --check` 退出码为 0（仅保留已知 CRLF/全局 ignore 权限提示）；本轮生成的构建/发布临时目录均已清理，无提交或推送。
- 按需依赖静态审计复核：发现并修复 head 对 lazyload、Zoomify、分享、Pangu、Highlight vendor/样式的提前加载；普通/minify 构建均通过，均为 32 个页面、28 个 HTML、317 个静态文件、360 个总文件、9 个 alias。产物检查确认首页/文章均无这些 vendor 的 `<script>`/高亮样式提前注入，分享与 Pangu 的 vendor 已由可选资源映射和模块加载顺序接管；可选加载器名称全部有映射，38 个本地资源引用无真实缺失（`%s` 为高亮样式模板占位符）。

### 尚未完成或需要站点侧配置

- 留言板的自建评论界面、Worker API、D1 表结构、GitHub OAuth 登录、权限/审核/通知和真实 Cloudflare D1 接入仍未实现；本轮仅保留接口注释占位，且不修改 `worker.js`。
- 搜索尚未接入可选的 Pagefind；当前按需加载的 Hugo JSON 搜索适合中小规模文章量。
- 尚未取得公开部署地址或可用 Lighthouse/WebPageTest 工具，因此没有真实公网 LCP、INP、CLS 基线。
- 性能清单仍有有限后续空间：核心 CSS/JS 体积、仍被模板引用的高亮资源和固定壳初始化可做一次静态审计；只有发现真实收益才修改，禁止继续进行无目标的全局 DOM 扫描。Brotli/Gzip/CDN 属于平台配置，搜索实现已拆分，固定搜索壳的触发器按需保留。
- 当前工作树包含本次迁移的未提交修改；按用户要求暂不提交或推送远端。

### 当前结论

第一项“已有配置项生效逻辑”及第一批基础迁移已完成；第二批页面和第三批本地动态代码也基本完成。当前评论方向已从四种第三方方案切换为自建 Worker/D1：旧适配器代码和配置已清理，后续需要先设计接口与数据模型，再实现前端挂载。其余未完成项主要是 Clamp、旧格式 lazyload、Banner 打字效果缺少正向 fixture，Pagefind 和公网性能属于可选事项。本轮不修改 `worker.js`，也不再对没有后端和参数的评论服务重复测试。
