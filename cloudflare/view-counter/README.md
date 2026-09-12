# Argon 阅读量 Worker

这里是静态 Hugo 站点使用的 Cloudflare Worker + D1 计数器。Cloudflare 的产品名称是 **D1**，不是 D2；D1 是基于 SQLite 的托管数据库，可绑定到 Worker。

## 部署

在本目录执行：

```sh
npx wrangler d1 create argon-views
```

把命令输出的 `database_id` 写入 `wrangler.jsonc`，然后初始化远程数据库：

```sh
npx wrangler d1 execute argon-views --remote --file=./schema.sql
npx wrangler deploy
```

`wrangler.jsonc` 的 `main` 指向可直接复制到 Worker 项目根目录的 `worker.js`。

在部署前设置共享密钥：

```sh
npx wrangler secret put VIEW_COUNTER_KEY
```

Worker 还会读取 `ALLOWED_ORIGINS`，值为逗号分隔的完整 Origin。未配置密钥或请求没有匹配的 `X-View-Counter-Key` 时，接口会返回 `401`；不在白名单的 Origin 会返回 `403`。

新文章可在部署后直接访问，首次 POST 会自动创建记录。若需迁移已有站点数据，请在独立的 Worker 项目中维护站点专用的初始化 SQL。

部署完成后，把 Worker 地址填入站点 `hugo.yaml`：

```yaml
params:
  viewCounter:
    enabled: true
    endpoint: "https://argon-view-counter.<你的账户>.workers.dev/api/views"
    key: "与 VIEW_COUNTER_KEY 相同的值"
```

前端在文章页发送 `POST {"id":"/文章路径/"}`，首页/分类页使用 `GET ?id=/文章路径/` 读取，不把 D1 凭据暴露给浏览器。由于静态前端必须把 `key` 发给浏览器，这个共享密钥可被访客看到，不能当作真正的服务端秘密；请同时配置精确的 Origin 白名单，并按需要增加 Cloudflare WAF/Rate Limiting 或 Turnstile。Worker 或后端请求失败时，主题会隐藏阅读量，不显示静态初始值。

## 管理阅读量与主题外观

主题自带一个独立的 `/settings/` 页面。页面会从站点首页读取 Worker 地址，不把生产地址或管理员密钥硬编码进主题。管理员密钥只通过请求头 `X-View-Counter-Admin-Key` 发送，前端只放在当前标签页的 `sessionStorage` 中。外观设置默认使用填空、颜色选择器、滑动条和下拉框；高级区域仍可粘贴简化 YAML，再应用到表单。

部署管理员密钥时使用 Cloudflare Secret，不要把它写入 `wrangler.jsonc`、`hugo.yaml` 或仓库：

```sh
npx wrangler secret put VIEW_COUNTER_ADMIN_KEY
npx wrangler secret put VIEW_COUNTER_KEY
npx wrangler d1 execute argon-views --remote --file=./schema.sql
npx wrangler deploy
```

`VIEW_COUNTER_KEY` 是公开前端计数请求使用的密钥；`VIEW_COUNTER_ADMIN_KEY` 才是设置页使用的高权限密钥。两者应使用不同的随机值。设置页的外观配置存储在 D1 的 `site_settings` 表中：YAML/Hugo 配置仍是基线，D1 返回的字段只覆盖同名字段，删除覆盖后会自动回退到 `hugo.yaml`。

本地调试可在此目录执行 `npx wrangler dev --local --port 8787`，并在站点目录把 Worker endpoint 临时改成 `http://127.0.0.1:8787/api/views`。若设置页显示断开，请先检查 Worker 进程、`ALLOWED_ORIGINS`（包含当前 Hugo 端口）以及 `schema.sql` 是否已初始化本地 D1。
