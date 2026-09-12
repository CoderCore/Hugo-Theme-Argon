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
  firstImageAsThumbnail: true
  articleMeta: "time|views|categories"
  enableCodeHighlight: true
  codeHighlightStyle: "vs2015"
  viewCounter:
    enabled: false
    endpoint: ""
    key: ""
    showOnPreview: true
    requestTimeout: 4000
```

文章头图优先使用 front matter 的 `image`，其次使用页面资源或正文首图；旧文章中的 `featured_image` 仍作为最后的兼容字段。主题不会把旧图片地址自动改写成其他域名。

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

主题外观设置不写入 D1：设置页把覆盖项保存到当前浏览器的 `localStorage`，并可导出为 `params:` YAML。只保存到本机时仅当前浏览器生效；要让所有访客看到修改，需要将导出的配置合并到 `hugo.yaml` 并重新构建。

需要注意：静态 Hugo 页面必须把 `key` 发送给浏览器，因此它不是严格意义上的秘密，访客可以在开发者工具中看到。共享密钥主要用于降低误用和简单脚本请求；生产环境还应配合准确的 `ALLOWED_ORIGINS`、Cloudflare WAF/Rate Limiting，必要时增加 Turnstile 或改为由自己的服务端代理请求。

Worker 未部署、未配置密钥、请求超时或返回错误时，主题会保持阅读量元素隐藏，不显示 front matter 中的静态初始值，也不会阻塞页面渲染。只有批量 API 成功返回有效的计数后才显示阅读量。

## 开发与许可

本主题用于学习和个人项目。使用或再发布时，请同时遵守 Argon 原项目及本仓库依赖资源的许可条款。
