(function () {
    'use strict';

    var state = {
        endpoint: '',
        adminKey: '',
        articleTitles: {},
        pageSize: 20,
        viewsPage: 1,
        commentsPage: 1,
        commentsRequest: 0,
        viewsRequest: 0
    };

    function byId(id) { return document.getElementById(id); }
    function storageGet(key) { try { return window.sessionStorage.getItem(key) || ''; } catch (error) { return ''; } }
    function storageSet(key, value) { try { if (value) window.sessionStorage.setItem(key, value); else window.sessionStorage.removeItem(key); } catch (error) {} }

    function setStatus(text, type) {
        var element = byId('connection-status');
        if (!element) return;
        element.textContent = text;
        element.className = 'status status-' + (type || 'pending');
    }

    function setMessage(id, text, type) {
        var element = byId(id);
        if (!element) return;
        element.textContent = text || '';
        element.className = 'message' + (type ? ' ' + type : '');
    }

    function decodeBase64(value) {
        if (!value) return '';
        try {
            var binary = window.atob(value);
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
            return typeof TextDecoder === 'function' ? new TextDecoder().decode(bytes) : binary;
        } catch (error) { return ''; }
    }

    async function discoverEndpoint() {
        var response = await fetch(new URL('/', window.location.href).href, {cache: 'no-store'});
        if (!response.ok) throw new Error('站点首页返回 ' + response.status);
        var html = await response.text();
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var meta = parsed.querySelector('meta[name="argon-view-counter-endpoint-b64"]');
        var value = decodeBase64(meta && meta.getAttribute('content'));
        var endpoint = new URL(value, window.location.href);
        endpoint.pathname = endpoint.pathname.replace(/\/+$/, '');
        if (!/\/api\/views$/.test(endpoint.pathname)) throw new Error('首页没有有效的阅读量 Worker 地址');
        endpoint.search = '';
        endpoint.hash = '';
        state.endpoint = endpoint.href;
        byId('endpoint-label').textContent = state.endpoint;
        byId('origin-label').textContent = window.location.origin;
    }

    function apiUrl(path) {
        var endpoint = new URL(state.endpoint);
        var base = endpoint.pathname.replace(/\/api\/views\/?$/, '');
        var query = path.indexOf('?');
        endpoint.pathname = base + (query < 0 ? path : path.slice(0, query));
        endpoint.search = query < 0 ? '' : path.slice(query);
        endpoint.hash = '';
        return endpoint.href;
    }

    async function apiRequest(path, options) {
        var requestOptions = options || {};
        var headers = Object.assign({}, requestOptions.headers || {}, {Accept: 'application/json'});
        if (state.adminKey) headers['X-View-Counter-Admin-Key'] = state.adminKey;
        requestOptions.headers = headers;
        var response = await fetch(apiUrl(path), requestOptions);
        var data = {};
        try { data = await response.json(); } catch (error) {}
        if (!response.ok) throw new Error(data.error || ('Worker 返回 ' + response.status));
        return data;
    }

    async function loadArticleTitles() {
        try {
            var response = await fetch(new URL('/search.json', window.location.href).href, {cache: 'no-store'});
            if (!response.ok) return;
            var items = await response.json();
            (Array.isArray(items) ? items : []).forEach(function (item) {
                if (item && typeof item.url === 'string' && typeof item.title === 'string') state.articleTitles[item.url] = item.title;
            });
        } catch (error) {}
    }

    function formatTime(value) {
        if (!value) return '—';
        var date = new Date(String(value).indexOf('Z') >= 0 ? value : String(value).replace(' ', 'T') + 'Z');
        return isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', {hour12: false});
    }

    function articleTitle(path) { return state.articleTitles[path] || '未匹配文章'; }

    function renderViews(rows) {
        var body = byId('views-body');
        if (!body) return;
        body.textContent = '';
        if (!rows.length) {
            var empty = document.createElement('tr');
            var cell = document.createElement('td');
            cell.colSpan = 4;
            cell.className = 'empty-row';
            cell.textContent = '没有匹配的阅读量记录。';
            empty.appendChild(cell);
            body.appendChild(empty);
            return;
        }
        rows.forEach(function (row) {
            var tr = document.createElement('tr');
            var title = document.createElement('td');
            title.className = 'admin-title-cell';
            title.textContent = articleTitle(row.slug);
            var slug = document.createElement('td');
            slug.className = 'admin-path-cell';
            slug.textContent = row.slug;
            var count = document.createElement('td');
            var input = document.createElement('input');
            input.className = 'count-input'; input.type = 'number'; input.min = '0'; input.max = '2147483647'; input.step = '1'; input.value = String(Number(row.views) || 0);
            input.setAttribute('aria-label', row.slug + ' 阅读量'); count.appendChild(input);
            var actions = document.createElement('td');
            var wrap = document.createElement('div'); wrap.className = 'actions';
            var save = document.createElement('button'); save.type = 'button'; save.className = 'action-button'; save.textContent = '保存';
            save.addEventListener('click', function () { updateView(row.slug, input, false); });
            var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'action-button delete'; remove.textContent = '删除';
            remove.addEventListener('click', function () { updateView(row.slug, input, true); });
            wrap.appendChild(save); wrap.appendChild(remove); actions.appendChild(wrap);
            tr.appendChild(title); tr.appendChild(slug); tr.appendChild(count); tr.appendChild(actions); body.appendChild(tr);
        });
    }

    async function loadViews() {
        var requestId = ++state.viewsRequest;
        var search = (byId('view-filter') && byId('view-filter').value || '').trim();
        var data = await apiRequest('/api/admin/views?page=' + state.viewsPage + '&limit=' + state.pageSize + '&search=' + encodeURIComponent(search));
        if (requestId !== state.viewsRequest) return;
        renderViews(data.views || []);
        if (byId('site-total')) byId('site-total').value = String(Number(data.total) || 0);
        byId('views-page').textContent = '第 ' + data.page + ' 页';
        byId('views-prev').disabled = data.page <= 1;
        byId('views-next').disabled = !data.hasNext;
        byId('views-summary').textContent = (data.views || []).length + ' 条本页记录 · 每页最多 ' + data.limit + ' 条';
    }

    async function updateView(slug, input, remove) {
        if (remove && !window.confirm('删除 ' + slug + ' 的阅读量记录？')) return;
        var value = Number(input.value);
        if (!remove && (!Number.isSafeInteger(value) || value < 0 || value > 2147483647)) { setMessage('views-message', '阅读量必须是 0 到 2147483647 的整数。', 'error'); return; }
        try {
            await apiRequest('/api/views', {method: remove ? 'DELETE' : 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: slug, views: value})});
            setMessage('views-message', remove ? '已删除 ' + slug : '已保存 ' + slug, 'success');
            await loadViews();
        } catch (error) { setMessage('views-message', '操作失败：' + error.message, 'error'); }
    }

    function renderComments(rows) {
        var body = byId('comments-body');
        if (!body) return;
        body.textContent = '';
        if (!rows.length) { var empty = document.createElement('tr'); var cell = document.createElement('td'); cell.colSpan = 5; cell.className = 'empty-row'; cell.textContent = '没有匹配的评论。'; empty.appendChild(cell); body.appendChild(empty); return; }
        rows.forEach(function (comment) {
            var tr = document.createElement('tr');
            var content = document.createElement('td'); content.className = 'admin-comment-cell';
            var author = document.createElement('strong'); author.textContent = comment.authorName || '—';
            var text = document.createElement('p'); text.textContent = comment.deleted ? '评论已删除' : (comment.content || '');
            content.appendChild(author); content.appendChild(text);
            var path = document.createElement('td'); path.className = 'admin-path-cell'; path.textContent = comment.postPath || '—';
            var status = document.createElement('td'); status.textContent = comment.deleted ? '已删除' : '有效'; status.className = comment.deleted ? 'admin-status-deleted' : 'admin-status-active';
            var time = document.createElement('td'); time.textContent = formatTime(comment.updatedAt || comment.createdAt);
            var actions = document.createElement('td'); var wrap = document.createElement('div'); wrap.className = 'actions';
            if (!comment.deleted) {
                var edit = document.createElement('button'); edit.type = 'button'; edit.className = 'action-button'; edit.textContent = '编辑'; edit.addEventListener('click', function () { editComment(comment); }); wrap.appendChild(edit);
                var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'action-button delete'; remove.textContent = '删除'; remove.addEventListener('click', function () { deleteComment(comment); }); wrap.appendChild(remove);
            }
            actions.appendChild(wrap); tr.appendChild(content); tr.appendChild(path); tr.appendChild(status); tr.appendChild(time); tr.appendChild(actions); body.appendChild(tr);
        });
    }

    async function loadComments() {
        var requestId = ++state.commentsRequest;
        var query = '/api/admin/comments?page=' + state.commentsPage + '&limit=' + state.pageSize;
        query += '&post=' + encodeURIComponent((byId('comment-post-filter').value || '').trim());
        query += '&author=' + encodeURIComponent((byId('comment-author-filter').value || '').trim());
        query += '&status=' + encodeURIComponent(byId('comment-status-filter').value || 'active');
        var data = await apiRequest(query);
        if (requestId !== state.commentsRequest) return;
        renderComments(data.comments || []);
        byId('comments-page').textContent = '第 ' + data.page + ' 页';
        byId('comments-prev').disabled = data.page <= 1;
        byId('comments-next').disabled = !data.hasNext;
        setMessage('comments-message', (data.comments || []).length + ' 条本页评论 · 每页最多 ' + data.limit + ' 条', 'success');
    }

    async function editComment(comment) {
        var content = window.prompt('编辑评论内容（支持安全 Markdown）：', comment.content || '');
        if (content === null || !content.trim()) return;
        try { await apiRequest('/api/comments/' + comment.id, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({content: content})}); setMessage('comments-message', '评论已更新。', 'success'); await loadComments(); }
        catch (error) { setMessage('comments-message', '编辑失败：' + error.message, 'error'); }
    }

    async function deleteComment(comment) {
        if (!window.confirm('删除这条评论？有回复时会保留删除占位。')) return;
        try { await apiRequest('/api/comments/' + comment.id, {method: 'DELETE'}); setMessage('comments-message', '评论已删除。', 'success'); await loadComments(); }
        catch (error) { setMessage('comments-message', '删除失败：' + error.message, 'error'); }
    }

    function disconnect(message) {
        state.adminKey = ''; storageSet('argon-view-counter-admin-key', '');
        if (byId('admin-key')) byId('admin-key').value = '';
        if (byId('auth-badge')) { byId('auth-badge').textContent = '未连接'; byId('auth-badge').className = 'badge badge-muted'; }
        if (message) setStatus(message, 'error');
    }

    async function connect() {
        state.adminKey = (byId('admin-key').value || '').trim();
        if (!state.adminKey) { setStatus('请输入管理员密钥。', 'error'); return; }
        storageSet('argon-view-counter-admin-key', state.adminKey);
        byId('connect-button').disabled = true; setStatus('正在验证管理员密钥…', 'pending');
        try {
            await apiRequest('/api/admin/status');
            byId('auth-badge').textContent = '已连接'; byId('auth-badge').className = 'badge';
            setStatus('管理员已连接；数据按页读取。', 'ok');
            await loadArticleTitles();
            if (document.body.getAttribute('data-admin-page') === 'comments') await loadComments(); else await loadViews();
        } catch (error) { disconnect('连接失败：' + error.message); }
        finally { byId('connect-button').disabled = false; }
    }

    function bootstrap() {
        if (!byId('admin-key')) return;
        byId('admin-key').value = storageGet('argon-view-counter-admin-key');
        byId('origin-label').textContent = window.location.origin;
        discoverEndpoint().then(function () { setStatus('Worker 地址已发现；请输入管理员密钥。', 'ok'); }).catch(function (error) { setStatus('未发现可用的阅读量 Worker：' + error.message, 'error'); });
        byId('connect-button').addEventListener('click', connect);
        byId('forget-button').addEventListener('click', function () { disconnect('管理员密钥已清除。'); });
        if (byId('reload-views')) byId('reload-views').addEventListener('click', function () { loadViews().catch(function (error) { setMessage('views-message', error.message, 'error'); }); });
        if (byId('views-prev')) byId('views-prev').addEventListener('click', function () { if (state.viewsPage > 1) { state.viewsPage -= 1; loadViews().catch(function (error) { setMessage('views-message', error.message, 'error'); }); } });
        if (byId('views-next')) byId('views-next').addEventListener('click', function () { state.viewsPage += 1; loadViews().catch(function (error) { setMessage('views-message', error.message, 'error'); }); });
        if (byId('view-filter')) byId('view-filter').addEventListener('change', function () { state.viewsPage = 1; if (state.adminKey) loadViews(); });
        if (byId('reload-comments')) byId('reload-comments').addEventListener('click', function () { loadComments().catch(function (error) { setMessage('comments-message', error.message, 'error'); }); });
        if (byId('comments-prev')) byId('comments-prev').addEventListener('click', function () { if (state.commentsPage > 1) { state.commentsPage -= 1; loadComments().catch(function (error) { setMessage('comments-message', error.message, 'error'); }); } });
        if (byId('comments-next')) byId('comments-next').addEventListener('click', function () { state.commentsPage += 1; loadComments().catch(function (error) { setMessage('comments-message', error.message, 'error'); }); });
        ['comment-post-filter', 'comment-author-filter', 'comment-status-filter'].forEach(function (id) { if (byId(id)) byId(id).addEventListener('change', function () { state.commentsPage = 1; if (state.adminKey) loadComments(); }); });
    }

    bootstrap();
}());
