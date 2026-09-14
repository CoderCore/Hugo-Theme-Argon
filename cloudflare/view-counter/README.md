# Argon 阅读量与评论 Worker

这是一个只提供 JSON API 的 Cloudflare Worker + D1 后端，负责文章阅读量统计和自建评论系统。Worker 不提供 HTML 页面，也不保存主题配置；主题和网站配置统一以仓库中的 `hugo.yaml` 为准，`/settings/` 前端页面只负责阅读量管理。

最新版 Worker 会在第一次收到带有效密钥的 API 请求时自动初始化 D1，不需要预先执行 SQL 或安装 Wrangler。

## 推荐方式：直接在 Cloudflare 控制台部署

下面的流程适合不熟悉命令行的用户。只需要把 [`worker.js`](./worker.js) 的全部内容复制到 Cloudflare 的 Worker 编辑器中。

### 1. 创建 D1 数据库

在 Cloudflare 控制台打开 **Workers & Pages → D1**，创建一个数据库，例如命名为 `argon-views`。数据库名称可以自定义；后面绑定时选择这个数据库即可。

不需要在这一步执行 `schema.sql`。首次正确的阅读量 API 请求会自动创建 `view_counts` 表、索引和网站总量记录，不会删除已有文章阅读量。

### 2. 创建 Worker 并粘贴代码

打开 **Workers & Pages → Create → Worker**，或者打开已有的 Worker，进入 **Edit code**：

1. 删除编辑器中的示例代码。
2. 复制本目录 [`worker.js`](./worker.js) 的全部内容并粘贴。
3. 点击 **Save and deploy**。

Worker 根地址故意不提供页面，访问根地址返回 JSON `404` 是正常现象。

### 3. 绑定 D1

在这个 Worker 的 **Settings → Bindings** 中添加 **D1 database binding**：

- **Variable name**：`DB`
- **D1 database**：选择刚才创建的数据库

保存绑定后，如控制台提示需要重新部署，请再次点击部署。变量名必须是大写的 `DB`，因为代码通过 `env.DB` 访问数据库。

### 4. 配置变量和密钥

在 **Settings → Variables and Secrets** 中添加以下项目。Origin 只填写协议、域名和端口，不要填写路径，也不要在末尾加 `/`。

| 名称 | 类型 | 值 |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | Text | 站点 Origin，多个值用英文逗号分隔，例如 `https://fufu.blog,https://www.fufu.blog` |
| `VIEW_COUNTER_KEY` | Secret | 与站点 `hugo.yaml` 中 `params.viewCounter.key` 完全相同的随机值 |
| `VIEW_COUNTER_ADMIN_KEY` | Secret | 另一个不同的随机值，只给管理员编辑阅读量使用 |
| `COMMENTS_ALLOW_GUESTS` | Text | `true` 允许未登录访客评论；`false` 时评论发表必须 GitHub 登录，生产建议 `false` |
| `GITHUB_CLIENT_ID` | Text | GitHub OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | Secret | GitHub OAuth App 的 Client Secret |
| `GITHUB_REDIRECT_URI` | Text | OAuth App 中登记的精确回调地址，例如 `https://comments.example.com/api/auth/github/callback` |

`VIEW_COUNTER_KEY` 会随浏览器请求发送，所以它不是严格意义上的后端秘密；请把 `ALLOWED_ORIGINS` 设置为自己的站点，不要使用 `*`。`VIEW_COUNTER_ADMIN_KEY` 不能写入 `hugo.yaml`、网页代码或 Git 仓库。

如果 D1 没绑定、密钥没设置或密钥不匹配，Worker 不会初始化数据库。

### 5. 配置 GitHub 登录

在 GitHub 的 **Settings → Developer settings → OAuth Apps** 创建 OAuth App：

- **Authorization callback URL** 填写与 `GITHUB_REDIRECT_URI` 完全一致的地址。
- 不要把 Client Secret 写入主题仓库、Hugo 配置或浏览器代码。
- Worker 使用授权码 + PKCE 流程，回调后在服务端换取 GitHub token，再读取当前用户身份；token 不写入 D1。
- Worker 只把 GitHub 用户标识、昵称、头像地址和个人主页地址写入 D1，并给浏览器发放哈希存储的站点会话 Cookie。

生产环境建议给 Worker 配置与博客同站点的自定义域名，例如 `comments.example.com`，再把博客域名加入 `ALLOWED_ORIGINS`。这样可以减少浏览器对跨站 Cookie 的限制；如果直接使用 `workers.dev`，跨站 Cookie 可能被浏览器的第三方 Cookie 策略拦截。

### 6. 绑定自定义域名（可选）

如果不使用 Cloudflare 分配的 `workers.dev` 地址，可在 **Domains & Routes** 中给同一个 Worker 添加自定义域名，例如 `blog-view-counter.example.com`。这个域名必须指向当前 Worker。

### 7. 配置 Hugo 站点

部署完成后，把 API 地址填入站点 `hugo.yaml`。endpoint 必须指向 `/api/views`：

```yaml
params:
  viewCounter:
    enabled: true
    endpoint: "https://blog-view-counter.example.com/api/views"
    key: "与 VIEW_COUNTER_KEY 相同的值"
  comments:
    enabled: true
    allowGuests: false
    endpoint: "https://comments.example.com/api/comments"
    # authEndpoint: "https://comments.example.com/api/auth" # 可选
```

## API

### 阅读量 API

普通页面使用批量 API。请求头中的 `X-View-Counter-Key` 必须与 Worker Secret `VIEW_COUNTER_KEY` 相同：

```http
POST /api/views/batch
X-View-Counter-Key: <VIEW_COUNTER_KEY>
Content-Type: application/json

{"ids":["/a/","/b/"],"increment":"/a/"}
```

返回：

```json
{
  "counts": {"/a/": 12, "/b/": 8},
  "total": 20
}
```

兼容单篇文章的请求：

```http
POST /api/views
{"id":"/文章路径/"}
```

管理员接口使用 `X-View-Counter-Admin-Key`：

- `GET /api/views?all=1`：读取全部文章阅读量和 `total`
- `PUT /api/views`：设置 `{ "id": "/文章路径/", "views": 100 }`
- `PUT /api/views`：设置网站总量 `{ "id": "__site_total__", "views": 1000 }`
- `DELETE /api/views`：删除一篇文章的记录

`__site_total__` 是保留 ID，不会显示为文章。普通文章访问会同时增加文章阅读量和网站总阅读量；管理员修改单篇文章数值时，网站总量不会自动跟随变化，因此总量可以单独校正。

### 评论与认证 API

评论按文章路径隔离，`post`/`postPath` 必须是以 `/` 开头的站内路径。评论正文以 Markdown 文本保存，在主题端安全渲染；不执行评论中的 JavaScript 或不安全 HTML。

```http
GET /api/comments?post=/post/example/&page=1&limit=20
```

返回 `comments`、`page`、`limit`、`total` 和 `pages`；每条评论包含 `id`、`postPath`、`parentId`、`authorName`、`content` 和 `createdAt`。

```http
POST /api/comments
Content-Type: application/json

{"postPath":"/post/example/","authorName":"访客","content":"你好"}
```

回复时增加 `"parentId": 1`。Worker 会确认父评论属于同一篇文章，不接受跨文章回复。`COMMENTS_ALLOW_GUESTS=false` 时，未登录 POST 返回 `401 auth_required`；登录用户的昵称由 GitHub 身份决定，不信任浏览器提交的昵称。

认证接口：

- `GET /api/auth/github/start?returnTo=<站点地址>`：创建短期 OAuth state 和 PKCE verifier，跳转到 GitHub。
- `GET /api/auth/github/callback`：校验 state，服务端换取 token、读取 GitHub 用户并创建站点会话，然后回到原页面。
- `GET /api/auth/me`：返回当前登录用户；主题使用 `credentials: include` 保持全站登录态。
- `POST /api/auth/logout`：删除当前 D1 会话并清理 Cookie。

当前已实现 GitHub 登录和会话基础链路；限流、审核、编辑/删除、管理员操作、CSRF/反滥用策略仍需在公网发布前补齐。

## `/settings/`

`/settings/` 页面只用于管理员查看和修改文章阅读量、网站总阅读量。管理员密钥只用于阅读量 API，不用于主题配置；主题配置请直接修改仓库中的 `hugo.yaml`，然后按传统流程重新构建并部署站点。

## 部署后检查

把域名替换成你的 Worker 域名，并使用正确的阅读量密钥：

```text
POST https://blog-view-counter.example.com/api/views/batch
body: {"ids":["/test/"],"increment":"/test/"}
```

常见错误：

| 状态 | 含义和处理方式 |
| --- | --- |
| `404` | 请求的域名没有运行这份代码，或者访问了根地址/错误路径。 |
| `500 database_error` | 通常是 D1 绑定错误、Worker 不是最新版或 SQL 执行失败；检查 `DB` 绑定和 Worker 日志。 |
| `503 database_not_configured` | Worker 没有 D1 绑定；添加变量名为 `DB` 的 D1 binding。 |
| `401 unauthorized` | 阅读量密钥或管理员密钥缺失/不匹配。 |
| `401 auth_required` | 评论设置为不允许访客评论，当前请求没有有效 GitHub 会话。 |
| `503 github_oauth_not_configured` | Worker 未配置 GitHub OAuth Client ID/Secret。 |
| `403 origin_not_allowed` | 请求来源不在 `ALLOWED_ORIGINS`，或配置包含路径、空格或末尾斜杠。 |

批量请求仍可能包含一次 CORS 预检，但同一页面只发送一次批量 API 请求，不会为每篇文章单独请求 Worker。

## 可选：使用 Wrangler 部署

命令行适合需要版本控制或自动化部署的用户。先确认 [`wrangler.jsonc`](./wrangler.jsonc) 中的 `database_id` 是目标 D1 数据库的 ID，然后在本目录执行：

```sh
npx wrangler secret put VIEW_COUNTER_KEY
npx wrangler secret put VIEW_COUNTER_ADMIN_KEY
npx wrangler d1 execute argon-views --remote --file=./schema.sql
npx wrangler deploy
```

由于 Worker 支持首次授权请求自动初始化，`d1 execute` 不是必需步骤；显式执行 [`schema.sql`](./schema.sql) 适合希望在部署前初始化或维护已有环境的用户。旧版本已经存在的 `site_settings` 表不会被自动删除，但新 Worker 不再读取它。

本地调试可在此目录执行：

```sh
npx wrangler dev --local --port 8787
npx wrangler d1 execute argon-views --local --file=./schema.sql
```

同时启动主题示例站即可联调：

```sh
hugo server --source ../../exampleSite --themesDir ../../.. --bind 127.0.0.1 --port 1315 --baseURL http://127.0.0.1:1315/
```

示例站本地配置将评论 API 指向 `http://127.0.0.1:8787/api/comments`，并默认关闭访客评论。由于本地没有 GitHub OAuth Secret，登录接口在本地只会返回未配置提示；配置 OAuth Secret 后再进行完整回调联调。部署公网前，必须完成 GitHub OAuth、限流、审核和安全策略。

## 官方文档

- [Cloudflare D1：从 Worker 访问数据库](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Cloudflare D1：远程开发和控制台操作](https://developers.cloudflare.com/d1/best-practices/remote-development/)
- [Cloudflare Workers：Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [GitHub：Authorizing OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub：Get the authenticated user](https://docs.github.com/en/rest/users/users#get-the-authenticated-user)
