(function () {
    'use strict';

    var state = {
        endpoint: '',
        slugs: [],
        counts: {},
        total: 0,
        adminKey: ''
    };

    function byId(id) { return document.getElementById(id); }

    function setStatus(text, type) {
        var element = byId('connection-status');
        element.textContent = text;
        element.className = 'status status-' + (type || 'pending');
    }

    function setMessage(text, type) {
        var element = byId('views-message');
        element.textContent = text || '';
        element.className = 'message' + (type ? ' ' + type : '');
    }

    function storageGet(key) {
        try { return window.sessionStorage.getItem(key) || ''; } catch (error) { return ''; }
    }

    function storageSet(key, value) {
        try {
            if (value) window.sessionStorage.setItem(key, value);
            else window.sessionStorage.removeItem(key);
        } catch (error) { /* Private browsing may disable sessionStorage. */ }
    }

    function decodeBase64(value) {
        if (!value || typeof window.atob !== 'function') return '';
        try {
            var binary = window.atob(value);
            var bytes = new Uint8Array(binary.length);
            for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
            return typeof TextDecoder === 'function' ? new TextDecoder().decode(bytes) : binary;
        } catch (error) { return ''; }
    }

    function normalizeEndpoint(value) {
        try {
            var url = new URL(value, window.location.href);
            var path = url.pathname.replace(/\/+$/, '');
            if (!/\/api\/views$/.test(path)) return '';
            url.pathname = path;
            url.search = '';
            url.hash = '';
            return url.href;
        } catch (error) { return ''; }
    }

    async function discoverEndpoint() {
        var response = await fetch(new URL('/', window.location.href).href, {cache: 'no-store', credentials: 'same-origin'});
        if (!response.ok) throw new Error('站点首页返回 ' + response.status);
        var html = await response.text();
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var endpointMeta = parsed.querySelector('meta[name="argon-view-counter-endpoint-b64"]');
        var endpoint = normalizeEndpoint(endpointMeta ? decodeBase64(endpointMeta.getAttribute('content')) : '');
        if (!endpoint) throw new Error('首页没有有效的阅读量 Worker 地址');
        state.endpoint = endpoint;
        byId('endpoint-label').textContent = endpoint;
        byId('origin-label').textContent = window.location.origin;
    }

    function apiUrl(path) {
        var url = new URL(state.endpoint);
        var basePath = url.pathname.replace(/\/api\/views\/?$/, '');
        var queryIndex = path.indexOf('?');
        var requestPath = queryIndex < 0 ? path : path.slice(0, queryIndex);
        url.pathname = basePath + requestPath;
        url.search = queryIndex < 0 ? '' : path.slice(queryIndex);
        url.hash = '';
        return url;
    }

    async function apiRequest(path, options) {
        var requestOptions = options || {};
        var headers = requestOptions.headers || {};
        headers.Accept = 'application/json';
        if (state.adminKey) headers['X-View-Counter-Admin-Key'] = state.adminKey;
        requestOptions.headers = headers;
        var response = await fetch(apiUrl(path).href, requestOptions);
        var data = {};
        try { data = await response.json(); } catch (error) { /* Keep the HTTP error below. */ }
        if (!response.ok) throw new Error((data && data.error) || ('Worker 返回 ' + response.status));
        return data;
    }

    function showGuide(show) { byId('offline-guide').hidden = !show; }

    function normalizeSlug(value) {
        try {
            var url = new URL(value, window.location.origin);
            var path = url.pathname || '/';
            if (path.charAt(0) !== '/') path = '/' + path;
            return path.replace(/\/+/g, '/');
        } catch (error) { return ''; }
    }

    function isArticlePath(path) {
        return path && path !== '/' && !/^\/(settings|archives|categories|tags|page)(\/|$)/.test(path) && !/\.(xml|json|rss|html)$/i.test(path);
    }

    async function loadSlugs() {
        var slugs = [];
        try {
            var response = await fetch(new URL('/sitemap.xml', window.location.href).href, {cache: 'no-store'});
            if (response.ok) {
                var xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
                Array.prototype.forEach.call(xml.querySelectorAll('loc'), function (loc) {
                    var slug = normalizeSlug(loc.textContent || '');
                    if (isArticlePath(slug) && slugs.indexOf(slug) < 0) slugs.push(slug);
                });
            }
        } catch (error) { /* Existing D1 rows still make the table useful. */ }
        state.slugs = slugs;
    }

    async function loadCounts() {
        var data = await apiRequest('/api/views?all=1', {method: 'GET'});
        state.counts = {};
        state.total = Number(data.total) || 0;
        (data.counts || []).forEach(function (row) {
            if (row && typeof row.slug === 'string') state.counts[row.slug] = Number(row.views) || 0;
        });
    }

    function allSlugs() {
        var values = state.slugs.slice();
        Object.keys(state.counts).forEach(function (slug) { if (values.indexOf(slug) < 0) values.push(slug); });
        return values.sort();
    }

    function renderViews() {
        var body = byId('views-body');
        var filter = (byId('view-filter').value || '').trim().toLowerCase();
        byId('site-total').value = String(state.total);
        body.textContent = '';
        var slugs = allSlugs().filter(function (slug) { return !filter || slug.toLowerCase().indexOf(filter) >= 0; });
        byId('views-summary').textContent = slugs.length + ' 条路径 · ' + Object.keys(state.counts).length + ' 条 D1 记录 · 网站总阅读量 ' + state.total;
        if (!slugs.length) {
            var empty = document.createElement('tr');
            var emptyCell = document.createElement('td');
            emptyCell.colSpan = 3;
            emptyCell.className = 'empty-row';
            emptyCell.textContent = filter ? '没有匹配的路径。' : 'sitemap 尚未提供文章路径，输入路径后可通过 API 管理已有记录。';
            empty.appendChild(emptyCell);
            body.appendChild(empty);
            return;
        }
        slugs.forEach(function (slug) {
            var row = document.createElement('tr');
            var slugCell = document.createElement('td');
            slugCell.textContent = slug;
            var countCell = document.createElement('td');
            var input = document.createElement('input');
            input.className = 'count-input';
            input.type = 'number';
            input.min = '0';
            input.max = '2147483647';
            input.step = '1';
            input.value = String(state.counts[slug] || 0);
            input.setAttribute('aria-label', slug + ' 阅读量');
            countCell.appendChild(input);
            var actionCell = document.createElement('td');
            var actions = document.createElement('div');
            actions.className = 'actions';
            var save = document.createElement('button');
            save.type = 'button';
            save.className = 'action-button';
            save.textContent = '保存';
            save.addEventListener('click', function () { updateCount(slug, input, false); });
            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'action-button delete';
            remove.textContent = '删除';
            remove.addEventListener('click', function () { updateCount(slug, input, true); });
            actions.appendChild(save);
            actions.appendChild(remove);
            actionCell.appendChild(actions);
            row.appendChild(slugCell);
            row.appendChild(countCell);
            row.appendChild(actionCell);
            body.appendChild(row);
        });
    }

    async function updateCount(slug, input, remove) {
        if (!state.adminKey) { setMessage('请先连接管理员密钥。', 'error'); return; }
        if (remove && !window.confirm('删除 ' + slug + ' 的阅读量记录？')) return;
        var value = Number(input.value);
        if (!remove && (!Number.isSafeInteger(value) || value < 0 || value > 2147483647)) {
            setMessage('阅读量必须是 0 到 2147483647 的整数。', 'error');
            return;
        }
        try {
            var data = await apiRequest('/api/views', {
                method: remove ? 'DELETE' : 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: slug, views: value})
            });
            if (remove) delete state.counts[slug];
            else state.counts[slug] = Number(data.views) || value;
            input.value = remove ? '0' : String(state.counts[slug]);
            renderViews();
            setMessage(remove ? '已删除 ' + slug : '已保存 ' + slug, 'success');
        } catch (error) {
            setMessage('保存失败：' + error.message, 'error');
            if (/unauthorized/i.test(error.message)) disconnect('管理员密钥无效');
        }
    }

    async function saveTotal() {
        if (!state.adminKey) { setMessage('请先连接管理员密钥。', 'error'); return; }
        var value = Number(byId('site-total').value);
        if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) {
            setMessage('网站总阅读量必须是 0 到 2147483647 的整数。', 'error');
            return;
        }
        try {
            var data = await apiRequest('/api/views', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: '__site_total__', views: value})
            });
            state.total = Number(data.total) || 0;
            renderViews();
            setMessage('网站总阅读量已保存。', 'success');
        } catch (error) {
            setMessage('保存网站总量失败：' + error.message, 'error');
        }
    }

    async function loadAdminData() {
        if (!state.adminKey) throw new Error('请输入管理员密钥');
        await Promise.all([loadCounts(), loadSlugs()]);
        renderViews();
        byId('auth-badge').textContent = '已连接';
        byId('auth-badge').className = 'badge';
        setStatus('Worker 已连接，可以管理阅读量和网站总量。', 'ok');
        showGuide(false);
    }

    function disconnect(message) {
        state.adminKey = '';
        storageSet('argon-view-counter-admin-key', '');
        byId('admin-key').value = '';
        byId('auth-badge').textContent = '未连接';
        byId('auth-badge').className = 'badge badge-muted';
        if (message) setStatus(message, 'error');
    }

    async function connect() {
        state.adminKey = byId('admin-key').value.trim();
        if (!state.adminKey) { setStatus('请输入管理员密钥。', 'error'); return; }
        storageSet('argon-view-counter-admin-key', state.adminKey);
        byId('connect-button').disabled = true;
        setStatus('正在验证管理员密钥…', 'pending');
        try {
            await loadAdminData();
        } catch (error) {
            disconnect('连接失败：' + error.message);
            showGuide(/Worker|fetch|Origin|首页/.test(error.message));
        } finally {
            byId('connect-button').disabled = false;
        }
    }

    async function bootstrap() {
        byId('admin-key').value = storageGet('argon-view-counter-admin-key');
        byId('origin-label').textContent = window.location.origin;
        try {
            await discoverEndpoint();
            setStatus('Worker 地址已发现；请输入管理员密钥管理阅读量。', 'ok');
            showGuide(false);
        } catch (error) {
            setStatus('未发现可用的阅读量 Worker：' + error.message, 'error');
            showGuide(true);
        }
    }

    byId('connect-button').addEventListener('click', connect);
    byId('forget-button').addEventListener('click', function () { disconnect('管理员密钥已清除。'); });
    byId('save-total').addEventListener('click', saveTotal);
    byId('reload-views').addEventListener('click', function () { if (state.adminKey) loadAdminData().catch(function (error) { setMessage(error.message, 'error'); }); });
    byId('view-filter').addEventListener('input', renderViews);
    bootstrap();
}());
