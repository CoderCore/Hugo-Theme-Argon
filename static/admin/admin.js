(function () {
    'use strict';

    var state = {endpoint: '', adminCsrf: '', articleTitles: {}, pageSize: 20, viewsPage: 1, commentsPage: 1, commentsRequest: 0, viewsRequest: 0};
    var adminModules = [
        {page: 'home', href: '/admin/', icon: '⌂', label: '总览', hint: '后台首页'},
        {page: 'views', href: '/admin/views/', icon: '◷', label: '阅读量管理', hint: '文章统计'},
        {page: 'comments', href: '/admin/comments/', icon: '☵', label: '评论管理', hint: '评论审核'},
    ];

    function byId(id) { return document.getElementById(id); }
    function setStatus(text, type) { var el = byId('connection-status'); if (!el) return; el.textContent = text; el.className = 'status status-' + (type || 'pending'); }
    function setMessage(id, text, type) { var el = byId(id); if (!el) return; el.textContent = text || ''; el.className = 'message' + (type ? ' ' + type : ''); }

    function renderAdminNav() {
        var nav = byId('admin-nav'); if (!nav) return;
        var page = document.body.getAttribute('data-admin-page') || 'home';
        nav.textContent = '';
        var label = document.createElement('p'); label.className = 'admin-nav-label'; label.textContent = '管理中心'; nav.appendChild(label);
        adminModules.forEach(function (module) {
            var link = document.createElement('a'); link.className = 'admin-nav-link' + (module.page === page ? ' is-active' : ''); link.href = module.href; link.setAttribute('aria-current', module.page === page ? 'page' : 'false');
            var icon = document.createElement('span'); icon.className = 'admin-nav-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = module.icon;
            var copy = document.createElement('span'); copy.className = 'admin-nav-copy'; var name = document.createElement('strong'); name.textContent = module.label; var hint = document.createElement('small'); hint.textContent = module.hint; copy.appendChild(name); copy.appendChild(hint);
            link.appendChild(icon); link.appendChild(copy); nav.appendChild(link);
        });
    }

    function decodeBase64(value) {
        if (!value) return '';
        try {
            var binary = window.atob(value); var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
            return typeof TextDecoder === 'function' ? new TextDecoder().decode(bytes) : binary;
        } catch (error) { return ''; }
    }

    async function discoverEndpoint() {
        var response = await fetch(new URL('/', window.location.href).href, {cache: 'no-store'});
        if (!response.ok) throw new Error('站点首页返回 ' + response.status);
        var parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
        var meta = parsed.querySelector('meta[name="argon-view-counter-endpoint-b64"]');
        var endpoint = new URL(decodeBase64(meta && meta.getAttribute('content')), window.location.href);
        endpoint.pathname = endpoint.pathname.replace(/\/+$/, ''); endpoint.search = ''; endpoint.hash = '';
        if (!/\/api\/views$/.test(endpoint.pathname)) throw new Error('首页没有有效的阅读量 Worker 地址');
        state.endpoint = endpoint.href;
        if (byId('endpoint-label')) byId('endpoint-label').textContent = state.endpoint;
        if (byId('origin-label')) byId('origin-label').textContent = window.location.origin;
    }

    function apiUrl(path) {
        var endpoint = new URL(state.endpoint); var query = path.indexOf('?');
        var base = endpoint.pathname.replace(/\/api\/views\/?$/, '');
        endpoint.pathname = base + (query < 0 ? path : path.slice(0, query));
        endpoint.search = query < 0 ? '' : path.slice(query); endpoint.hash = '';
        return endpoint.href;
    }

    async function apiRequest(path, options) {
        var requestOptions = Object.assign({credentials: 'include'}, options || {});
        var headers = Object.assign({}, requestOptions.headers || {}, {Accept: 'application/json'});
        if (state.adminCsrf) headers['X-Admin-CSRF-Token'] = state.adminCsrf;
        requestOptions.headers = headers;
        var response = await fetch(apiUrl(path), requestOptions); var data = {};
        try { data = await response.json(); } catch (error) {}
        if (!response.ok) { var failure = new Error(data.error || ('Worker 返回 ' + response.status)); failure.status = response.status; failure.code = data.error || ''; throw failure; }
        return data;
    }

    function isUnauthorized(error) { return error && (error.status === 401 || error.code === 'unauthorized' || error.message === 'unauthorized'); }
    function redirectToLogin() { window.location.replace('/admin/login/?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search)); }

    async function loadArticleTitles() {
        try {
            var response = await fetch(new URL('/search.json', window.location.href).href, {cache: 'no-store'});
            if (!response.ok) return;
            var items = await response.json();
            (Array.isArray(items) ? items : []).forEach(function (item) { if (item && typeof item.url === 'string' && typeof item.title === 'string') state.articleTitles[item.url] = item.title; });
        } catch (error) {}
    }

    function formatTime(value) { if (!value) return '—'; var date = new Date(String(value).indexOf('Z') >= 0 ? value : String(value).replace(' ', 'T') + 'Z'); return isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', {hour12: false}); }
    function articleTitle(path) { return state.articleTitles[path] || '未匹配文章'; }

    function renderViews(rows) {
        var body = byId('views-body'); if (!body) return; body.textContent = '';
        if (!rows.length) { var empty = document.createElement('tr'); var cell = document.createElement('td'); cell.colSpan = 4; cell.className = 'empty-row'; cell.textContent = '没有匹配的阅读量记录。'; empty.appendChild(cell); body.appendChild(empty); return; }
        rows.forEach(function (row) {
            var tr = document.createElement('tr'); var title = document.createElement('td'); title.className = 'admin-title-cell'; title.textContent = articleTitle(row.slug);
            var slug = document.createElement('td'); slug.className = 'admin-path-cell'; slug.textContent = row.slug;
            var count = document.createElement('td'); var input = document.createElement('input'); input.className = 'count-input'; input.type = 'number'; input.min = '0'; input.max = '2147483647'; input.step = '1'; input.value = String(Number(row.views) || 0); input.setAttribute('aria-label', row.slug + ' 阅读量'); count.appendChild(input);
            var actions = document.createElement('td'); var wrap = document.createElement('div'); wrap.className = 'actions';
            var save = document.createElement('button'); save.type = 'button'; save.className = 'action-button'; save.textContent = '保存'; save.addEventListener('click', function () { updateView(row.slug, input, false); });
            var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'action-button delete'; remove.textContent = '删除'; remove.addEventListener('click', function () { updateView(row.slug, input, true); });
            wrap.appendChild(save); wrap.appendChild(remove); actions.appendChild(wrap); tr.appendChild(title); tr.appendChild(slug); tr.appendChild(count); tr.appendChild(actions); body.appendChild(tr);
        });
    }

    async function loadViews() {
        var requestId = ++state.viewsRequest; var search = (byId('view-filter') && byId('view-filter').value || '').trim();
        var data = await apiRequest('/api/admin/views?page=' + state.viewsPage + '&limit=' + state.pageSize + '&search=' + encodeURIComponent(search));
        if (requestId !== state.viewsRequest) return; renderViews(data.views || []);
        if (byId('site-total')) byId('site-total').value = String(Number(data.total) || 0);
        byId('views-page').textContent = '第 ' + data.page + ' 页'; byId('views-prev').disabled = data.page <= 1; byId('views-next').disabled = !data.hasNext; byId('views-summary').textContent = (data.views || []).length + ' 条本页记录 · 每页最多 ' + data.limit + ' 条';
    }

    async function updateView(slug, input, remove) {
        if (remove && !window.confirm('删除 ' + slug + ' 的阅读量记录？')) return;
        var value = Number(input.value); if (!remove && (!Number.isSafeInteger(value) || value < 0 || value > 2147483647)) { setMessage('views-message', '阅读量必须是 0 到 2147483647 的整数。', 'error'); return; }
        try { await apiRequest('/api/views', {method: remove ? 'DELETE' : 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: slug, views: value})}); setMessage('views-message', remove ? '已删除 ' + slug : '已保存 ' + slug, 'success'); await loadViews(); }
        catch (error) { if (isUnauthorized(error)) return redirectToLogin(); setMessage('views-message', '操作失败：' + error.message, 'error'); }
    }

    function renderComments(rows) {
        var body = byId('comments-body'); if (!body) return; body.textContent = '';
        if (!rows.length) { var empty = document.createElement('tr'); var cell = document.createElement('td'); cell.colSpan = 5; cell.className = 'empty-row'; cell.textContent = '没有匹配的评论。'; empty.appendChild(cell); body.appendChild(empty); return; }
        rows.forEach(function (comment) {
            var tr = document.createElement('tr'); var content = document.createElement('td'); content.className = 'admin-comment-cell'; var author = document.createElement('strong'); author.textContent = comment.authorName || '—'; var text = document.createElement('p'); text.textContent = comment.deleted ? '评论已删除' : (comment.content || ''); content.appendChild(author); content.appendChild(text);
            var path = document.createElement('td'); path.className = 'admin-path-cell'; path.textContent = comment.postPath || '—'; var status = document.createElement('td'); status.textContent = comment.deleted ? '已删除' : '有效'; status.className = comment.deleted ? 'admin-status-deleted' : 'admin-status-active'; var time = document.createElement('td'); time.textContent = formatTime(comment.updatedAt || comment.createdAt);
            var actions = document.createElement('td'); var wrap = document.createElement('div'); wrap.className = 'actions';
            if (!comment.deleted) { var edit = document.createElement('button'); edit.type = 'button'; edit.className = 'action-button'; edit.textContent = '编辑'; edit.addEventListener('click', function () { editComment(comment); }); var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'action-button delete'; remove.textContent = '删除'; remove.addEventListener('click', function () { deleteComment(comment); }); wrap.appendChild(edit); wrap.appendChild(remove); }
            actions.appendChild(wrap); tr.appendChild(content); tr.appendChild(path); tr.appendChild(status); tr.appendChild(time); tr.appendChild(actions); body.appendChild(tr);
        });
    }

    async function loadComments() {
        var requestId = ++state.commentsRequest; var query = '/api/admin/comments?page=' + state.commentsPage + '&limit=' + state.pageSize;
        query += '&post=' + encodeURIComponent((byId('comment-post-filter').value || '').trim()); query += '&author=' + encodeURIComponent((byId('comment-author-filter').value || '').trim()); query += '&status=' + encodeURIComponent(byId('comment-status-filter').value || 'active');
        var data = await apiRequest(query); if (requestId !== state.commentsRequest) return; renderComments(data.comments || []); byId('comments-page').textContent = '第 ' + data.page + ' 页'; byId('comments-prev').disabled = data.page <= 1; byId('comments-next').disabled = !data.hasNext; setMessage('comments-message', (data.comments || []).length + ' 条本页评论 · 每页最多 ' + data.limit + ' 条', 'success');
    }

    async function editComment(comment) { var content = window.prompt('编辑评论内容（支持安全 Markdown）：', comment.content || ''); if (content === null || !content.trim()) return; try { await apiRequest('/api/comments/' + comment.id, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({content: content})}); setMessage('comments-message', '评论已更新。', 'success'); await loadComments(); } catch (error) { if (isUnauthorized(error)) return redirectToLogin(); setMessage('comments-message', '编辑失败：' + error.message, 'error'); } }
    async function deleteComment(comment) { if (!window.confirm('删除这条评论？有回复时会保留删除占位。')) return; try { await apiRequest('/api/comments/' + comment.id, {method: 'DELETE'}); setMessage('comments-message', '评论已删除。', 'success'); await loadComments(); } catch (error) { if (isUnauthorized(error)) return redirectToLogin(); setMessage('comments-message', '删除失败：' + error.message, 'error'); } }

    function safeReturnTo() { var value = new URLSearchParams(window.location.search).get('returnTo') || '/admin/'; return value.charAt(0) === '/' && value.charAt(1) !== '/' ? value : '/admin/'; }
    function showAdminOAuthResult() {
        var result = new URLSearchParams(window.location.search).get('argon_admin_auth');
        if (!result) return false;
        var messages = {success: 'GitHub 管理员登录成功，正在进入后台…', forbidden: '这个 GitHub 账号不是已配置的唯一管理员。', cancelled: '已取消 GitHub 登录。', not_configured: '管理员 GitHub 登录尚未完成配置。', error: 'GitHub 登录失败，请稍后重试。'};
        if (result === 'success') { setStatus(messages.success, 'ok'); window.setTimeout(function () { window.location.replace(safeReturnTo()); }, 80); }
        else { setStatus(messages[result] || messages.error, 'error'); setMessage('login-message', messages[result] || messages.error, 'error'); }
        return true;
    }
    function startGithubAdminLogin() {
        var button = byId('github-admin-login-button'); if (!button) return;
        if (!state.endpoint) { setMessage('login-message', '尚未发现可用的阅读量 Worker。', 'error'); return; }
        button.disabled = true; setStatus('正在跳转到 GitHub…', 'pending');
        var returnTo = window.location.href;
        window.location.assign(apiUrl('/api/admin/auth/github/start?returnTo=' + encodeURIComponent(returnTo)));
    }
    async function login() {
        var button = byId('admin-login-button'); var key = byId('admin-login-key').value; if (!key) { setMessage('login-message', '请输入管理员密钥。', 'error'); return; }
        button.disabled = true; setStatus('正在验证管理员密钥…', 'pending');
        try { var data = await apiRequest('/api/admin/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({key: key})}); state.adminCsrf = data.csrfToken || ''; setStatus('登录成功，正在进入后台…', 'ok'); window.location.replace(safeReturnTo()); }
        catch (error) { setStatus('登录失败', 'error'); setMessage('login-message', error.code === 'unauthorized' ? '管理员密钥不正确。' : '登录失败：' + error.message, 'error'); button.disabled = false; }
    }

    async function logout() { try { await apiRequest('/api/admin/auth/logout', {method: 'POST'}); } catch (error) { if (!isUnauthorized(error)) setStatus('退出登录失败：' + error.message, 'error'); } window.location.replace('/admin/login/'); }

    async function ensureSession() { await discoverEndpoint(); var data = await apiRequest('/api/admin/auth/me'); if (!data.authenticated) throw new Error('unauthorized'); state.adminCsrf = data.csrfToken || ''; if (byId('auth-badge')) { byId('auth-badge').textContent = '已登录'; byId('auth-badge').className = 'badge'; } setStatus('管理员已登录。', 'ok'); }
    async function bootstrapProtected() { try { await ensureSession(); var page = document.body.getAttribute('data-admin-page') || 'home'; if (page === 'views' || page === 'comments') { await loadArticleTitles(); if (page === 'views') await loadViews(); else await loadComments(); } } catch (error) { if (isUnauthorized(error)) return redirectToLogin(); setStatus('后台连接失败：' + error.message, 'error'); } }

    function bindCommon() { if (byId('logout-button')) byId('logout-button').addEventListener('click', logout); }
    function bootstrapLogin() { renderAdminNav(); var oauthResult = showAdminOAuthResult(); var githubButton = byId('github-admin-login-button'); if (githubButton) githubButton.disabled = true; discoverEndpoint().then(function () { if (githubButton) githubButton.disabled = false; if (!oauthResult) setStatus('请选择一种管理员登录方式。', 'pending'); }).catch(function (error) { setStatus('未发现可用的阅读量 Worker：' + error.message, 'error'); }); byId('admin-login-form').addEventListener('submit', function (event) { event.preventDefault(); login(); }); if (githubButton) githubButton.addEventListener('click', startGithubAdminLogin); }
    function bootstrapAdmin() {
        renderAdminNav(); bindCommon();
        if (byId('reload-views')) byId('reload-views').addEventListener('click', function () { loadViews().catch(function (error) { if (isUnauthorized(error)) redirectToLogin(); else setMessage('views-message', error.message, 'error'); }); });
        if (byId('views-prev')) byId('views-prev').addEventListener('click', function () { if (state.viewsPage > 1) { state.viewsPage -= 1; loadViews().catch(function () {}); } });
        if (byId('views-next')) byId('views-next').addEventListener('click', function () { state.viewsPage += 1; loadViews().catch(function () {}); });
        if (byId('view-filter')) byId('view-filter').addEventListener('change', function () { state.viewsPage = 1; loadViews().catch(function () {}); });
        if (byId('reload-comments')) byId('reload-comments').addEventListener('click', function () { loadComments().catch(function (error) { if (isUnauthorized(error)) redirectToLogin(); else setMessage('comments-message', error.message, 'error'); }); });
        if (byId('comments-prev')) byId('comments-prev').addEventListener('click', function () { if (state.commentsPage > 1) { state.commentsPage -= 1; loadComments().catch(function () {}); } });
        if (byId('comments-next')) byId('comments-next').addEventListener('click', function () { state.commentsPage += 1; loadComments().catch(function () {}); });
        ['comment-post-filter', 'comment-author-filter', 'comment-status-filter'].forEach(function (id) { if (byId(id)) byId(id).addEventListener('change', function () { state.commentsPage = 1; loadComments().catch(function () {}); }); });
        bootstrapProtected();
    }

    if (document.body.getAttribute('data-admin-page') === 'login') bootstrapLogin(); else bootstrapAdmin();
}());
