# Hugo-Theme-Argon

Argon 的 Hugo 主题移植版，保留了原主题的卡片式布局、侧栏、文章目录、主题色设置、代码高亮和可选的阅读量显示。

## 安装

在 Hugo 站点中任选一种方式安装：

### Git submodule（推荐）

```sh
git submodule add https://github.com/jiang068/Hugo-Theme-Argon.git themes/Hugo-Theme-Argon
git submodule update --init --recursive
```

站点配置：

```yaml
theme: Hugo-Theme-Argon
```

也可以直接把主题目录复制到 `themes/Hugo-Theme-Argon`。如果主题放在站点目录之外，则配置对应的 `themesDir`，例如：

```yaml
themesDir: "../"
theme: Hugo-Theme-Argon
```

主题仓库中的 `hugo.yaml` 是演示配置，不会覆盖站点配置。实际站点只需要在自己的 `hugo.yaml` 中写 `params` 覆盖项。`baseURL` 建议保持为空，在每个部署命令中指定目标域名：

```sh
hugo --gc --minify --baseURL "https://example.com/"
```

## 常用配置

完整的示例配置见仓库中的 `hugo.yaml`。常用的站点级配置如下：

```yaml
params:
  themeColor: "#5e72e4"
  description: "站点默认描述，用于 description、OG 和 Twitter Card"
  firstImageAsThumbnail: true
  imageProcessing: true
  # 可选：time|edittime|views|comments|categories|words|readingtime（read 为 views 兼容别名）
  articleMeta: "time|views|categories"
  showReadingtime: true
  readingSpeedCn: 300
  readingSpeedEn: 160
  showShareBtn: true
  enableExternalFonts: false # 按需加载 fonts.loli.net 的主题字体
  enableCodeHighlight: true
  codeHighlightStyle: "vs2015"
  enableBusuanzi: false
  viewCounter:
    enabled: false
    endpoint: ""
    key: ""
    showOnPreview: true
    requestTimeout: 4000
  shuoshuo:
    showOnHome: false
    homeLimit: 3
    homeTitle: "说说"
```

文章头图优先使用 front matter 的 `image`，其次使用页面资源或正文首图；旧文章中的 `featured_image` 仍作为最后的兼容字段。主题不会把旧图片地址自动改写成其他域名。

当封面是页面 Bundle 中的图片且 `imageProcessing` 开启时，主题会在构建时生成 480、800、1200 像素的 WebP 版本，并输出 `srcset`、`sizes` 和图片尺寸。放在 `static/` 中的图片、外链图片和无法识别的格式会保留原地址。仓库自带的 Banner 已缩放至 1920×1280 并压缩；没有封面时不会强行使用 Banner，而是按页面资源、正文首图和 `featured_image` 顺序回退。

## 基础短代码

主题提供不依赖后端的 `alert`、`tip`、`tag`、`todo`、`collapse`、`hidden`、`video`、`progressbar` 和 `timeline` 短代码；同时兼容原主题常用的 `admonition`、`label`、`checkbox`、`fold` 和 `spoiler` 名称。`github` 短代码会在浏览器空闲时读取 GitHub API，也可以传入 `description`、`stars`、`forks` 作为静态数据。

```md
{{< alert color="green" icon="check" title="提示" >}}
内容支持 Markdown。
{{< /alert >}}

{{< tip color="orange" title="注意" >}}
这是一段提示内容。
{{< /tip >}}

{{< tag color="blue" shape="round" >}}Hugo{{< /tag >}}
{{< todo checked="true" >}}已完成的事项{{< /todo >}}

{{< collapse title="展开详情" color="indigo" collapsed="true" >}}
折叠内容。
{{< /collapse >}}

{{< hidden type="blur" tip="鼠标悬停显示" >}}隐藏文字{{< /hidden >}}

{{< progressbar progress="75" color="green" >}}完成度{{< /progressbar >}}

{{< timeline >}}
2024-01|主题开始迁移|从 WordPress 迁移到 Hugo。
2024-02/10|完成基础功能|增加短代码支持。
{{< /timeline >}}

{{< video url="/media/demo.mp4" >}}

{{< github author="gohugoio" project="hugo" size="mini" />}}
```

## 静态内容页面

主题支持 Hugo 的 `shuoshuo` 内容类型：在站点的 `content/shuoshuo/` 中新增 Markdown 文件即可生成 `/shuoshuo/` 列表和详情页。首页展示默认关闭，可通过 `params.shuoshuo.showOnHome` 开启。

时间线页面可在站点内容中创建 `layout: timeline` 的页面；主题会按主栏目文章的年份和月份生成静态链接。归档页可创建 `content/archives/_index.md`，并通过 `archive.monthly` 控制是否显示月份分组。留言板可创建 `layout: msgboard` 的页面，页面正文和评论容器已经就绪，评论区域保留自建评论系统的挂载点。

作者页可创建 `layout: author` 的页面，自动复用 `params.sidebar.authorImage`、`authorName`、`authorDescription` 和 `authorLinks`，并列出 `mainSections` 中的文章。

设置 `params.pageLayout: triple` 可开启三栏布局；在 `params.sidebar.rightbar` 中用 `title`、`content` 或 `items` 配置右栏卡片。默认右栏为空，因此不会影响双栏站点。

`params.pageLayout` 控制页面外壳和左/右栏，`params.articleListWaterflow` 独立控制文章列表是否使用瀑布流。关闭 `articleListWaterflow` 即为单列文章列表；开启后可用 `params.articleListWaterflowColumns: 2` 或 `3` 明确指定桌面端列数，移动端仍自动保持单列。

评论区域使用 Argon 原有评论结构，接入自建 Worker/D1 评论 API，支持列表、回复、分页和安全 Markdown。登录仅支持 GitHub OAuth；`params.comments.allowGuests: false` 时，只有 GitHub 登录用户可以发表评论。主题通过会话接口保持全站登录态，并提供退出登录入口。

单篇文章可以在 front matter 中使用 `comments: false` 关闭评论，或用 `comments: true` 显式开启。Worker 端还要同步设置 `COMMENTS_ALLOW_GUESTS`；前端开关只负责界面，最终评论权限由 Worker 强制执行。GitHub OAuth、D1 会话和部署变量说明见 [`cloudflare/view-counter/README.md`](./cloudflare/view-counter/README.md)。

数学公式通过 `params.mathRender` 选择 `mathjax3`、`mathjax2` 或 `katex`；留空或设为 `none` 时关闭。公式渲染器仅在启用后且当前页面实际包含 `$...$`、`$$...$$`、`\(...\)` 或 `\[...\]` 公式时，才在浏览器端按需加载，跨页导航时也会复用已加载的资源。

主题脚本使用 `defer` 保持执行顺序并避免阻塞 HTML 解析；核心 CSS/JS 通过 Hugo Pipes 生成带 SHA-256 指纹和 SRI 的 URL，可配合 immutable 缓存。使用 Cloudflare Pages 时，仓库内的 `static/_headers` 会为这两个指纹资源设置一年缓存；Brotli/Gzip 压缩和 CDN 分发仍由托管平台负责。目录索引只在页面内容页加载，分享只在文章/内容页加载，代码高亮仅在实际含代码块的页面加载，懒加载、Zoomify、取色器、Pangu 和阅读量脚本等按配置按需加载。Busuanzi 默认关闭，只有实际使用页脚统计时才设置 `enableBusuanzi: true`。

本地搜索使用 Hugo 的 `Search` 输出格式生成 `/search.json`，只有用户聚焦搜索框时才下载索引；索引加载期间输入的关键词会在加载完成后继续搜索。搜索地址会跟随 `Site.Home.RelPermalink`，因此部署在子路径时也能正确定位索引。

相关文章默认关闭。启用时，在站点配置中加入：

```yaml
params:
  relatedPosts:
    enabled: true
    limit: 6

related:
  indices:
    - name: tags
      weight: 100
    - name: categories
      weight: 80
```

## 可选：Cloudflare Worker + D1 阅读量

仓库外的静态站点可以把 [`cloudflare/view-counter/worker.js`](./cloudflare/view-counter/worker.js) 的全部内容复制到一个单独的 Cloudflare Worker 中直接部署。它是只提供 JSON API 的单文件 Worker，需要一个名为 `DB` 的 D1 绑定；首次带有效密钥访问 API 时会自动创建阅读量表。

完整的 Cloudflare 控制台复制粘贴部署步骤见 [`cloudflare/view-counter/README.md`](./cloudflare/view-counter/README.md)。简要配置如下。

### 1. 创建 D1 并绑定 Worker

在 Cloudflare 控制台创建 D1 数据库，在 Worker 的 **Settings → Bindings** 添加 D1 binding：

- 变量名：`DB`
- 数据库：选择刚创建的 D1

不需要预先执行 SQL；也可以在 [`cloudflare/view-counter/schema.sql`](./cloudflare/view-counter/schema.sql) 中显式初始化。

### 2. 配置并部署 Worker

为 Worker 配置精确的站点 Origin，并设置两个密钥：

- `ALLOWED_ORIGINS`：站点 Origin，多个值用英文逗号分隔，不要填路径或末尾 `/`。
- `VIEW_COUNTER_KEY`：公开前端请求使用的共享密钥，与站点配置相同。
- `VIEW_COUNTER_ADMIN_KEY`：仅设置页管理员使用的不同 Secret。

需要 Wrangler 时，`wrangler.jsonc` 至少需要以下内容，`database_id` 使用创建 D1 时返回的值：

```jsonc
{
  "name": "argon-view-counter",
  "main": "worker.js",
  "compatibility_date": "2026-09-11",
  "d1_databases": [{
    "binding": "DB",
    "database_name": "argon-views",
    "database_id": "REPLACE_WITH_D1_DATABASE_ID"
  }],
  "vars": {
    "ALLOWED_ORIGINS": "https://example.com,http://localhost:1313"
  }
}
```

密钥本身不要写入 Worker 源码或 `wrangler.jsonc`：

```sh
npx wrangler secret put VIEW_COUNTER_KEY
npx wrangler secret put VIEW_COUNTER_ADMIN_KEY
npx wrangler deploy
```

浏览器跨域请求只允许白名单中的 `Origin`，并要求请求带有 `X-View-Counter-Key` 或管理员请求头。未设置密钥、密钥错误、Origin 不在白名单或 D1 不可用时，接口会拒绝请求；错误请求不会触发数据库初始化。

### 3. 接入 Hugo 前端

将 Worker 地址和同一个共享密钥配置到站点的 `params.viewCounter`：

```yaml
params:
  viewCounter:
    enabled: true
    endpoint: "https://argon-view-counter.<account>.workers.dev/api/views"
    key: "YOUR_FRONTEND_SHARED_KEY"
    showOnPreview: true
    requestTimeout: 4000
```

文章页和列表页会通过 `/api/views/batch` 一次读取可见文章的计数，当前文章在同一请求中增加一次计数。管理员可在 `/settings/` 页面编辑文章阅读量和网站总阅读量。

主题和网站配置统一以仓库中的 `hugo.yaml` 为准。`/settings/` 页面只用于管理员查看和修改文章阅读量、网站总阅读量，不读取、保存或导出 YAML 配置。

需要注意：静态 Hugo 页面必须把 `key` 发送给浏览器，因此它不是严格意义上的秘密，访客可以在开发者工具中看到。共享密钥主要用于降低误用和简单脚本请求；生产环境还应配合准确的 `ALLOWED_ORIGINS`、Cloudflare WAF/Rate Limiting，必要时增加 Turnstile 或改为由自己的服务端代理请求。

Worker 未部署、未配置密钥、请求超时或返回错误时，主题会保持阅读量元素隐藏，不显示 front matter 中的静态初始值，也不会阻塞页面渲染。只有批量 API 成功返回有效的计数后才显示阅读量。

## 开发与许可

本主题用于学习和个人项目。使用或再发布时，请同时遵守 Argon 原项目及本仓库依赖资源的许可条款。
