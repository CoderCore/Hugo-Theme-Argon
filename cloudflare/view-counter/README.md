# Argon 阅读量与评论 Worker

这是一个独立的 Cloudflare Worker + D1 后端，为 Argon Hugo 主题提供：

- 文章阅读量和站点总阅读量；
- 评论列表、回复、分页和安全 Markdown；
- GitHub OAuth 登录、全站会话和退出登录；
- CSRF、Origin/Fetch Metadata、JSON Content-Type 和 Cloudflare Rate Limiting。

Worker 只返回 JSON，不提供 HTML 页面。主题配置仍保存在博客自己的 `hugo.yaml` 中。

## 目录

1. [部署前准备](#部署前准备)
2. [创建 D1 和 Worker](#创建-d1-和-worker)
3. [配置变量和密钥](#配置变量和密钥)
4. [配置 GitHub 登录](#配置-github-登录)
5. [配置 Hugo 主题](#配置-hugo-主题)
6. [本地开发](#本地开发)
7. [接口和安全规则](#接口和安全规则)
8. [部署验证](#部署验证)

## 部署前准备

需要：

- Cloudflare 账号；
- 一个 D1 数据库；
- 一个 Worker；
- 博客的正式 Origin，例如 `https://example.com`；
- 需要登录评论时，一个 GitHub OAuth App。

推荐给 Worker 绑定自定义域名，例如 `comments.example.com`，然后让主题的阅读量和评论 endpoint 都使用这个域名。这样比直接使用 `workers.dev` 更适合 Cookie 会话。

## 创建 D1 和 Worker

### 1. 创建 D1

Cloudflare 控制台：**Workers & Pages → D1 → Create database**。

数据库名称可以自定义，例如 `argon-views`。首次收到有效 API 请求时，Worker 会自动创建表和索引；也可以显式执行 [`schema.sql`](./schema.sql)。

### 2. 创建 Worker

1. 打开 **Workers & Pages → Create → Worker**。
2. 进入 **Edit code**，删除示例代码。
3. 粘贴 [`worker.js`](./worker.js) 的全部内容。
4. 点击 **Save and deploy**。

根地址返回 JSON `404` 是正常现象，因为 Worker 不提供页面。

### 3. 绑定 D1

在 Worker 的 **Settings → Bindings → D1 database bindings** 添加：

| 字段 | 值 |
| --- | --- |
| Variable name | `DB` |
| D1 database | 选择刚创建的数据库 |

变量名必须是大写 `DB`，代码通过 `env.DB` 访问数据库。

## 配置变量和密钥

在 **Settings → Variables and Secrets** 中配置：

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `ALLOWED_ORIGINS` | Text | 允许访问 API 的完整 Origin，逗号分隔；不要写路径或末尾 `/` |
| `COMMENTS_ALLOW_GUESTS` | Text | `false` 时必须 GitHub 登录后才能发表评论 |
| `VIEW_COUNTER_KEY` | Secret | 主题公开阅读量请求使用的共享密钥 |
| `VIEW_COUNTER_ADMIN_KEY` | Secret | `/settings/` 管理阅读量使用的密钥 |
| `GITHUB_CLIENT_ID` | Text | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | Secret | GitHub OAuth App Client Secret |
| `GITHUB_REDIRECT_URI` | Text | GitHub OAuth App 中登记的精确回调地址 |

生产示例：

```text
ALLOWED_ORIGINS=https://example.com,https://www.example.com
COMMENTS_ALLOW_GUESTS=false
GITHUB_REDIRECT_URI=https://comments.example.com/api/auth/github/callback
```

安全规则：

- 不要在 `hugo.yaml`、浏览器代码、Worker 源码或 Git 中保存 Secret。
- `VIEW_COUNTER_KEY` 会发送到浏览器，因此它不是严格意义上的后端秘密；真正的管理员密钥必须使用 Secret。
- 不要使用 `ALLOWED_ORIGINS=*`。
- 生产不要加入 `localhost` 或 `127.0.0.1`。
- 曾经暴露过的 GitHub Client Secret 应立即轮换。

## 配置 GitHub 登录

### 1. 创建 OAuth App

GitHub：**头像菜单 → Settings → Developer settings → OAuth Apps → New OAuth App**。

填写：

| GitHub 字段 | 推荐值 |
| --- | --- |
| Application name | 访客能识别的博客名称 |
| Homepage URL | `https://example.com` |
| Application description | 可选 |
| Authorization callback URL | `https://comments.example.com/api/auth/github/callback` |

回调地址必须与 `GITHUB_REDIRECT_URI` 完全一致，包括协议、域名、路径和大小写。不要只填写 Worker 根域名，正确路径是：

```text
/api/auth/github/callback
```

### 2. 保存 GitHub 凭据

- Client ID 写入 Worker 的 `GITHUB_CLIENT_ID`。
- Client Secret 写入 Worker Secret `GITHUB_CLIENT_SECRET`。
- 不要把 Client Secret 写入博客仓库。

Worker 使用授权码 + PKCE：

1. `/api/auth/github/start` 创建短期 `state` 和 verifier。
2. GitHub 授权后回到 callback。
3. Worker 校验 `state`，服务端换取 GitHub token。
4. Worker 读取 GitHub 用户资料，只保存用户资料和哈希后的站点会话。
5. GitHub access token 不写入 D1，也不返回浏览器。

## 配置 Hugo 主题

```yaml
params:
  viewCounter:
    enabled: true
    endpoint: "https://comments.example.com/api/views"
    key: "与 VIEW_COUNTER_KEY 相同的值"
    showOnPreview: true
    requestTimeout: 4000

  comments:
    enabled: true
    allowGuests: false
    endpoint: "https://comments.example.com/api/comments"
    authEndpoint: "https://comments.example.com/api/auth"
```

说明：

- `comments.enabled` 控制主题是否显示评论区域。
- `comments.allowGuests` 只控制前端界面；最终权限由 Worker 的 `COMMENTS_ALLOW_GUESTS` 强制执行。
- 文章可以用 front matter `comments: false` 关闭评论。
- 阅读量 endpoint 必须指向 `/api/views`，评论 endpoint 必须指向 `/api/comments`。

## 本地开发

本目录提供独立的本地配置 [`wrangler.local.jsonc`](./wrangler.local.jsonc)，只允许：

```text
http://127.0.0.1:1315
http://localhost:1315
```

启动 Worker：

```sh
wrangler dev --config ./wrangler.local.jsonc --local --port 8787
```

本地密钥放在被 Git 忽略的 `.dev.vars`，不要提交。启动示例站：

```sh
hugo server --source ../../exampleSite --themesDir ../../.. \
  --bind 127.0.0.1 --port 1315 \
  --baseURL http://127.0.0.1:1315/
```

本地没有 GitHub OAuth 凭据时，评论列表仍可读取；登录入口会返回未配置提示。`COMMENTS_ALLOW_GUESTS=false` 时，未登录用户不能发表评论。

## 接口和安全规则

### 阅读量

```http
POST /api/views/batch
X-View-Counter-Key: <VIEW_COUNTER_KEY>
Content-Type: application/json

{"ids":["/a/","/b/"],"increment":"/a/"}
```

管理员接口：

- `GET /api/views?all=1`：读取全部计数；
- `PUT /api/views`：设置 `{ "id": "/a/", "views": 100 }`；
- `DELETE /api/views`：删除文章计数。

### 评论和登录

```http
GET /api/comments?post=/post/example/&page=1&limit=20
```

列表读取只要求 Origin 在白名单中。发布评论需要会话和 CSRF Token：

```http
POST /api/comments
Content-Type: application/json
X-CSRF-Token: <GET /api/auth/me 返回的 csrfToken>

{"postPath":"/post/example/","content":"你好","parentId":null}
```

认证接口：

| 接口 | 作用 |
| --- | --- |
| `GET /api/auth/github/start?returnTo=...` | 开始 GitHub 登录 |
| `GET /api/auth/github/callback` | 校验 state、创建会话 |
| `GET /api/auth/me` | 查询登录态并获得 CSRF Token |
| `POST /api/auth/logout` | 携带 CSRF Token 退出登录 |

安全行为：

- 非法 Origin 返回 `403 origin_not_allowed`。
- 缺失或错误 CSRF 返回 `403 csrf_failed`。
- 非 JSON 写请求返回 `415 invalid_content_type` 或 `403 csrf_failed`。
- 未登录且不允许访客评论时返回 `401 auth_required`。
- OAuth 每客户端每分钟 10 次，评论每用户/客户端每分钟 5 次。
- 评论 Markdown 在主题端安全渲染，不执行 JavaScript 或不可信 HTML。

## 部署和验证

### Wrangler 部署

确保 [`wrangler.jsonc`](./wrangler.jsonc) 中的 `database_id` 是目标 D1，然后执行：

```sh
wrangler secret put VIEW_COUNTER_KEY
wrangler secret put VIEW_COUNTER_ADMIN_KEY
wrangler secret put GITHUB_CLIENT_SECRET
wrangler deploy --keep-vars --domain comments.example.com
```

`GITHUB_CLIENT_ID`、`GITHUB_REDIRECT_URI`、`ALLOWED_ORIGINS` 和 `COMMENTS_ALLOW_GUESTS` 可在配置文件或 Cloudflare Variables 中设置。部署时不要把本地配置文件作为生产配置。

### 最小检查

```sh
curl -i \
  -H "Origin: https://example.com" \
  "https://comments.example.com/api/auth/me"

curl -i \
  -H "Origin: https://example.com" \
  "https://comments.example.com/api/comments?post=/post/example/&page=1&limit=20"
```

预期：正式 Origin 返回 `200` 并带 `Access-Control-Allow-Origin`；本地 Origin 在生产环境应返回 `403`。

## 常见错误

| 状态 | 原因 |
| --- | --- |
| `401 unauthorized` | 阅读量密钥或管理员密钥错误 |
| `401 auth_required` | 评论设置为不允许访客评论，当前没有 GitHub 会话 |
| `403 origin_not_allowed` | Origin 不在白名单；检查协议、端口、路径和末尾 `/` |
| `403 csrf_failed` | CSRF Token 缺失/错误，或请求来源上下文不合法 |
| `404` | Worker 域名、路径或部署版本错误 |
| `500 database_error` | D1 绑定或 SQL 初始化失败 |
| `503 github_oauth_not_configured` | GitHub OAuth 变量或 Secret 未配置 |
| `429 rate_limited` | 超过 OAuth 或评论限流 |

## 官方文档

- [Cloudflare Workers 配置](https://developers.cloudflare.com/workers/configuration/)
- [Cloudflare D1 Worker API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
