# Hugo-Theme-Argon

Argon 的 Hugo 主题移植版。保留卡片式布局、侧栏、文章目录、主题色、代码高亮、数学公式、说说、时间线、作者页、留言板和可选的 Cloudflare 阅读量/评论后端。

## 文档导航

| 文档 | 用途 |
| --- | --- |
| [`cloudflare/view-counter/README.md`](./cloudflare/view-counter/README.md) | Cloudflare Worker + D1 阅读量、评论、GitHub 登录的部署和配置教程 |
| [`todo.md`](./todo.md) | 当前 Goal 和待办清单 |
| [`update.md`](./update.md) | 主题改动时间线 |
| [`exampleSite/`](./exampleSite/) | 可直接运行的功能示例站点 |

## 快速安装

推荐使用 Git submodule：

```sh
git submodule add https://github.com/jiang068/Hugo-Theme-Argon.git themes/Hugo-Theme-Argon
git submodule update --init --recursive
```

然后在站点配置中启用主题：

```yaml
theme: Hugo-Theme-Argon
```

也可以直接复制到 `themes/Hugo-Theme-Argon`。主题仓库中的 `hugo.yaml` 仅用于示例，不会覆盖站点配置；实际站点应在自己的配置文件中覆盖 `params`。

## 常用配置

```yaml
params:
  description: "站点描述"
  themeColor: "#5e72e4"
  firstImageAsThumbnail: true
  imageProcessing: true
  articleMeta: "time|views|categories"
  showReadingtime: true
  readingSpeedCn: 300
  readingSpeedEn: 160
  showShareBtn: true
  enableCodeHighlight: true
  codeHighlightStyle: "vs2015"
  enableExternalFonts: false
  enableBusuanzi: false

  viewCounter:
    enabled: false
    endpoint: ""
    key: ""
    showOnPreview: true
    requestTimeout: 4000

  comments:
    enabled: false
    allowGuests: false
    endpoint: ""
    authEndpoint: ""
```

`baseURL` 建议保持为空，在部署时指定：

```sh
hugo --gc --minify --baseURL "https://example.com/"
```

### 布局

- `params.pageLayout: triple`：三栏页面。
- `params.sidebar.rightbar`：配置右栏；默认右栏为空。
- `params.articleListWaterflow: false`：关闭文章瀑布流，使用单列列表。
- `params.articleListWaterflowColumns: 2|3`：设置桌面端瀑布流列数；移动端自动单列。

### 数学公式和资源

- `params.mathRender` 可选 `mathjax3`、`mathjax2`、`katex` 或 `none`。
- 页面 Bundle 图片支持 WebP、`srcset` 和尺寸属性。
- 代码高亮、目录、分享、搜索、评论图片预览、Pangu、Zoomify 等功能按页面内容和配置按需加载。
- 本地搜索使用 Hugo `Search` 输出的 `/search.json`。

## 短代码

主题提供 `alert`、`tip`、`tag`、`todo`、`collapse`、`hidden`、`video`、`progressbar`、`timeline` 和 `github`：

```md
{{< alert color="green" icon="check" title="提示" >}}
内容支持 Markdown。
{{< /alert >}}

{{< todo checked="true" >}}已完成{{< /todo >}}
{{< progressbar progress="75" color="green" >}}完成度{{< /progressbar >}}
{{< github author="gohugoio" project="hugo" size="mini" />}}
```

同时兼容原 Argon 常用的 `admonition`、`label`、`checkbox`、`fold` 和 `spoiler` 名称。

## 页面与内容

- `content/shuoshuo/`：说说列表和详情。
- `layout: timeline`：时间线页面。
- `layout: author`：作者页面。
- `layout: msgboard`：留言板页面。
- `content/archives/_index.md`：归档页面。

文章可以用 front matter 的 `comments: false` 关闭评论。评论正文支持安全 Markdown，但不会执行 JavaScript 或不可信 HTML。

## 阅读量、评论和 GitHub 登录

后端不是主题的一部分，部署在独立的 Cloudflare Worker + D1 中。主题只负责调用 JSON API。

请先阅读完整教程：

**[`Cloudflare Worker + D1 后端配置教程`](./cloudflare/view-counter/README.md)**

教程包含：D1 创建、Worker 绑定、生产变量、GitHub OAuth App、回调地址、CSRF、CORS、限流、本地开发、Hugo 配置和接口验证。

最小前端配置示例：

```yaml
params:
  viewCounter:
    enabled: true
    endpoint: "https://comments.example.com/api/views"
    key: "公开阅读量密钥"

  comments:
    enabled: true
    allowGuests: false
    endpoint: "https://comments.example.com/api/comments"
    authEndpoint: "https://comments.example.com/api/auth"
```

`VIEW_COUNTER_ADMIN_KEY`、`GITHUB_CLIENT_SECRET` 等后端密钥只能保存在 Worker Secrets，不能写入 Hugo 配置或主题仓库。

## 本地运行示例站

需要 Hugo 和 Node.js。示例站配置位于 `exampleSite/`：

```sh
hugo server --source exampleSite --themesDir .. --bind 127.0.0.1 --port 1315
```

如果联调本地 Worker，请在 Worker 目录执行：

```sh
wrangler dev --config ./wrangler.local.jsonc --local --port 8787
```

本地配置和生产配置分离，避免把 localhost 放入生产 Origin 白名单。

## 构建与许可

生产构建：

```sh
hugo --gc --minify --source exampleSite --themesDir ..
```

主题用于学习和个人项目。使用或再发布时，请同时遵守 Argon 原项目及本仓库依赖资源的许可条款。
