# Argon 阅读量 Worker

这是一个只提供 JSON API 的 Cloudflare Worker + D1 阅读量计数器。Worker 不提供 HTML 页面，也不保存主题外观配置；主题设置由 `/settings/` 前端页面保存在浏览器 `localStorage`，导出到 `hugo.yaml` 后重新构建站点。

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

`VIEW_COUNTER_KEY` 会随浏览器请求发送，所以它不是严格意义上的后端秘密；请把 `ALLOWED_ORIGINS` 设置为自己的站点，不要使用 `*`。`VIEW_COUNTER_ADMIN_KEY` 不能写入 `hugo.yaml`、网页代码或 Git 仓库。

如果 D1 没绑定、密钥没设置或密钥不匹配，Worker 不会初始化数据库。

### 5. 绑定自定义域名（可选）

如果不使用 Cloudflare 分配的 `workers.dev` 地址，可在 **Domains & Routes** 中给同一个 Worker 添加自定义域名，例如 `blog-view-counter.example.com`。这个域名必须指向当前 Worker。

### 6. 配置 Hugo 站点

部署完成后，把 API 地址填入站点 `hugo.yaml`。endpoint 必须指向 `/api/views`：

```yaml
params:
  viewCounter:
    enabled: true
    endpoint: "https://blog-view-counter.example.com/api/views"
    key: "与 VIEW_COUNTER_KEY 相同的值"
```

## API

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

## 主题设置与 `/settings/`

主题设置不进入 D1。`/settings/` 页面会从当前博客首页读取 Hugo 默认值，编辑结果保存在当前浏览器的 `localStorage` 中，并可生成 `params:` YAML 片段。

如果要让所有访客看到修改：

1. 在 `/settings/` 中编辑并生成 YAML。
2. 将配置合并到博客的 `hugo.yaml`。
3. 重新执行 Hugo 构建并部署静态站点。

只保存到 `localStorage` 的修改只对当前浏览器有效，换设备或清除浏览器数据后不会保留。管理员密钥只用于阅读量管理，不用于主题配置。

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

## 官方文档

- [Cloudflare D1：从 Worker 访问数据库](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Cloudflare D1：远程开发和控制台操作](https://developers.cloudflare.com/d1/best-practices/remote-development/)
- [Cloudflare Workers：Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
