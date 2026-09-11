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

仓库外的静态站点可以把 `worker.js` 复制到一个单独的 Cloudflare Worker 项目中直接部署。本主题仓库的 `cloudflare/view-counter/worker.js` 是可直接粘贴的单文件 Worker。Worker 需要一个名为 `DB` 的 D1 绑定。

### 1. 创建并初始化 D1

```sh
npx wrangler d1 create argon-views
npx wrangler d1 execute argon-views --remote --file=./schema.sql
```

`schema.sql` 创建 `view_counts` 表。若需要导入已有站点数据，请在独立的 Worker 项目中维护站点专用的初始化 SQL，不要把真实文章路径和浏览量提交到主题仓库。

### 2. 配置并部署 Worker

`wrangler.jsonc` 至少需要以下内容，`database_id` 使用创建 D1 时返回的值：

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

为接口设置共享密钥。密钥本身不要写入 Worker 源码或 `wrangler.jsonc`：

```sh
npx wrangler secret put VIEW_COUNTER_KEY
npx wrangler deploy
```

Worker 只接受允许的 `Origin`，并要求请求带有 `X-View-Counter-Key` 且与 `VIEW_COUNTER_KEY` 一致。未设置密钥、密钥错误、Origin 不在白名单或 D1 不可用时，接口会拒绝请求。

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

文章页会用 `POST` 增加一次计数，列表页用 `GET` 读取计数。D1 凭据永远只存在 Worker 中，不放进浏览器。

需要注意：静态 Hugo 页面必须把 `key` 发送给浏览器，因此它不是严格意义上的秘密，访客可以在开发者工具中看到。共享密钥主要用于降低误用和简单脚本请求；生产环境还应配合准确的 `ALLOWED_ORIGINS`、Cloudflare WAF/Rate Limiting，必要时增加 Turnstile 或改为由自己的服务端代理请求。

Worker 未部署、未配置密钥、请求超时或返回错误时，主题会保持阅读量元素隐藏，不显示 front matter 中的静态初始值，也不会阻塞页面渲染。只有 Worker 成功返回有效的 `views` 数字后才显示阅读量。

## 开发与许可

本主题用于学习和个人项目。使用或再发布时，请同时遵守 Argon 原项目及本仓库依赖资源的许可条款。
