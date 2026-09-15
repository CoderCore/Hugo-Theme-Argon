(function () {
    'use strict';

    var state = {endpoint: '', adminCsrf: '', articleTitles: {}, pageSize: 20, viewsPage: 1, commentsPage: 1, commentsRequest: 0, viewsRequest: 0, commentPolicyMode: 'blacklist'};
    var ADMIN_SESSION_CACHE_KEY = 'argon_admin_session_cache';
    var ADMIN_SESSION_CACHE_TTL = 5 * 60 * 1000;
    var ADMIN_ENDPOINT_CACHE_KEY = 'argon_admin_endpoint';
    var adminModules = [
        {page: 'home', href: '/admin/', icon: '⌂', label: '总览', hint: '后台首页'},
        {page: 'views', href: '/admin/views/', icon: '◷', label: '阅读量管理', hint: '文章统计'},
        {page: 'comments', href: '/admin/comments/', icon: '☵', label: '评论管理', hint: '评论审核'},
    ];

    function byId(id) { return document.getElementById(id); }
    function setStatus(text, type) { var el = byId('connection-status'); if (!el) return; el.textContent = text; el.className = 'status status-' + (type || 'pending'); }
    function setMessage(id, text, type) { var el = byId(id); if (!el) return; el.textContent = text || ''; el.className = 'message' + (type ? ' ' + type : ''); }
    function readSessionValue(key) { try { return sessionStorage.getItem(key) || ''; } catch (error) { return ''; } }
    function writeSessionValue(key, value) { try { sessionStorage.setItem(key, value); } catch (error) {} }

    function validColor(value) { return typeof value === 'string' && value.trim() && (!window.CSS || !window.CSS.supports || window.CSS.supports('color', value.trim())); }
    function applyThemeColor(value) {
        if (!validColor(value)) return;
        var color = value.trim(); document.documentElement.style.setProperty('--settings-primary', color);
        var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', color);
    }
    function updateThemeToggle() {
        var button = byId('admin-theme-toggle'); if (!button) return;
        var dark = document.documentElement.classList.contains('darkmode'); button.setAttribute('aria-pressed', dark ? 'true' : 'false');
        button.setAttribute('aria-label', dark ? '切换亮色模式' : '切换暗色模式');
        var label = button.querySelector('.admin-theme-toggle-label'); if (label) label.textContent = dark ? '亮色模式' : '暗色模式';
        var icon = button.querySelector('.admin-theme-toggle-icon'); if (icon) icon.textContent = dark ? '☀' : '☾';
    }
    function setAdminDarkmode(enable, persist) {
        document.documentElement.classList.toggle('darkmode', enable === true);
        if (persist) sessionStorage.setItem('Argon_Enable_Dark_Mode', enable ? 'true' : 'false');
        updateThemeToggle();
    }
    function bootstrapTheme() {
        var storedMode = sessionStorage.getItem('Argon_Enable_Dark_Mode');
        if (storedMode === 'true' || storedMode === 'false') setAdminDarkmode(storedMode === 'true', false);
        try { applyThemeColor(localStorage.getItem('argon_custom_theme_color') || ''); } catch (error) {}
        updateThemeToggle();
        var button = byId('admin-theme-toggle'); if (button) button.addEventListener('click', function () { setAdminDarkmode(!document.documentElement.classList.contains('darkmode'), true); });
    }

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
        var cachedEndpoint = readSessionValue(ADMIN_ENDPOINT_CACHE_KEY);
        if (cachedEndpoint) {
            try {
                var cachedUrl = new URL(cachedEndpoint, window.location.href);
                cachedUrl.pathname = cachedUrl.pathname.replace(/\/+$/, ''); cachedUrl.search = ''; cachedUrl.hash = '';
                if (/\/api\/views$/.test(cachedUrl.pathname)) {
                    state.endpoint = cachedUrl.href;
                    if (byId('endpoint-label')) byId('endpoint-label').textContent = state.endpoint;
                    if (byId('origin-label')) byId('origin-label').textContent = window.location.origin;
                    return;
                }
            } catch (error) { writeSessionValue(ADMIN_ENDPOINT_CACHE_KEY, ''); }
        }
        var response = await fetch(new URL('/', window.location.href).href, {cache: 'no-store'});
        if (!response.ok) throw new Error('站点首页返回 ' + response.status);
        var parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
        var meta = parsed.querySelector('meta[name="argon-view-counter-endpoint-b64"]');
        var endpoint = new URL(decodeBase64(meta && meta.getAttribute('content')), window.location.href);
        endpoint.pathname = endpoint.pathname.replace(/\/+$/, ''); endpoint.search = ''; endpoint.hash = '';
        if (!/\/api\/views$/.test(endpoint.pathname)) throw new Error('首页没有有效的阅读量 Worker 地址');
        state.endpoint = endpoint.href;
        writeSessionValue(ADMIN_ENDPOINT_CACHE_KEY, state.endpoint);
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
    function redirectToLogin() { writeSessionValue(ADMIN_SESSION_CACHE_KEY, ''); window.location.replace('/admin/login/?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search)); }

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
            var tr = document.createElement('tr');
            var content = document.createElement('td'); content.className = 'admin-comment-cell';
            var author = document.createElement('strong'); author.textContent = comment.authorName || comment.githubId || '—';
            var text = document.createElement('p'); text.textContent = comment.content || (comment.deleted ? '（原文不可用）' : '');
            content.appendChild(author); content.appendChild(text);
            if (comment.githubId) { var github = document.createElement('small'); github.className = 'admin-comment-github'; github.textContent = 'GitHub ID: ' + comment.githubId; content.appendChild(github); }
            var path = document.createElement('td'); path.className = 'admin-path-cell'; path.textContent = comment.postPath || '—';
            var status = document.createElement('td'); status.textContent = comment.deleted ? '已删除' : (comment.blocked ? '已拉黑' : '有效'); status.className = comment.deleted ? 'admin-status-deleted' : (comment.blocked ? 'admin-status-blocked' : 'admin-status-active');
            if (comment.private) { var privateBadge = document.createElement('span'); privateBadge.className = 'admin-private-badge'; privateBadge.textContent = '悄悄话'; status.insertBefore(privateBadge, status.firstChild); }
            var time = document.createElement('td'); time.textContent = formatTime(comment.updatedAt || comment.createdAt);
            var actions = document.createElement('td'); var wrap = document.createElement('div'); wrap.className = 'actions';
            if (!comment.deleted) {
                var edit = document.createElement('button'); edit.type = 'button'; edit.className = 'action-button'; edit.textContent = '编辑'; edit.addEventListener('click', function () { editComment(comment); });
                var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'action-button delete'; remove.textContent = '删除'; remove.addEventListener('click', function () { deleteComment(comment); });
                wrap.appendChild(edit); wrap.appendChild(remove);
                if (comment.canPin) { var pin = document.createElement('button'); pin.type = 'button'; pin.className = 'action-button'; pin.textContent = comment.pinned ? '取消置顶' : '置顶'; pin.addEventListener('click', function () { pinComment(comment); }); wrap.appendChild(pin); }
            }
            if (comment.deleted && comment.canPurge) { var purge = document.createElement('button'); purge.type = 'button'; purge.className = 'action-button purge'; purge.textContent = '彻底删除'; purge.addEventListener('click', function () { purgeComment(comment); }); wrap.appendChild(purge); }
            if (comment.githubId) { var policy = document.createElement('button'); policy.type = 'button'; policy.className = 'action-button' + (comment.blocked ? ' unblock' : ' delete'); policy.textContent = comment.blocked ? '解除拉黑' : '拉黑用户'; policy.addEventListener('click', function () { togglePolicyForComment(comment); }); wrap.appendChild(policy); }
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
    async function purgeComment(comment) { if (!window.confirm('彻底删除这条评论的墓碑？有回复时会把回复提升到原父级，不能恢复。')) return; try { await apiRequest('/api/admin/comments/' + comment.id, {method: 'DELETE'}); setMessage('comments-message', '评论墓碑已彻底删除。', 'success'); await loadComments(); } catch (error) { if (isUnauthorized(error)) return redirectToLogin(); setMessage('comments-message', '彻底删除失败：' + error.message, 'error'); } }
    async function pinComment(comment) { var next = !comment.pinned; if (!window.confirm((next ? '置顶' : '取消置顶') + '这条评论？')) return; try { await apiRequest('/api/admin/comments/' + comment.id + '/pin', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({pinned: next})}); setMessage('comments-message', next ? '评论已置顶。' : '评论已取消置顶。', 'success'); await loadComments(); } catch (error) { if (isUnauthorized(error)) return redirectToLogin(); setMessage('comments-message', '置顶操作失败：' + error.message, 'error'); } }

    function renderPolicy(data) {
        state.commentPolicyMode = data.mode === 'whitelist' ? 'whitelist' : 'blacklist';
        var select = byId('comment-policy-mode'); if (select) select.value = state.commentPolicyMode;
        var description = byId('policy-description'); if (description) description.textContent = state.commentPolicyMode === 'whitelist' ? '白名单模式：只有名单中的 GitHub 用户可以发表评论、回复、编辑、删除和点赞。' : '黑名单模式：名单中的 GitHub 用户不能发表评论、回复、编辑、删除或点赞，其评论对访客显示为已删除。';
        var list = byId('policy-users'); if (!list) return; list.textContent = '';
        var entries = Array.isArray(data.entries) ? data.entries : [];
        if (!entries.length) { var empty = document.createElement('p'); empty.className = 'policy-empty'; empty.textContent = '名单为空。'; list.appendChild(empty); return; }
        entries.forEach(function (entry) {
            var row = document.createElement('div'); row.className = 'policy-entry';
            if (entry.avatarUrl) { var avatar = document.createElement('img'); avatar.className = 'policy-entry-avatar'; avatar.src = entry.avatarUrl; avatar.alt = ''; avatar.loading = 'lazy'; avatar.referrerPolicy = 'no-referrer'; row.appendChild(avatar); }
            var meta = document.createElement('div'); meta.className = 'policy-entry-meta'; var name = document.createElement('strong'); name.textContent = entry.displayName || entry.login || entry.githubId; var id = document.createElement('small'); id.textContent = (entry.login ? '@' + entry.login + ' · ' : '') + 'GitHub ID: ' + entry.githubId; meta.appendChild(name); meta.appendChild(id); row.appendChild(meta);
            var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'action-button delete policy-entry-remove'; remove.textContent = '移出名单'; remove.addEventListener('click', function () { removePolicyEntry(entry.githubId); }); row.appendChild(remove); list.appendChild(row);
        });
    }
    async function loadCommentPolicy() { var data = await apiRequest('/api/admin/comment-policy?page=1&limit=50'); renderPolicy(data); }
    async function saveCommentPolicy() { var select = byId('comment-policy-mode'); var mode = select && select.value === 'whitelist' ? 'whitelist' : 'blacklist'; try { var data = await apiRequest('/api/admin/comment-policy', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({mode: mode})}); renderPolicy({mode: data.mode, entries: []}); await loadCommentPolicy(); setMessage('policy-message', '评论策略已保存。', 'success'); } catch (error) { if (isUnauthorized(error)) return redirectToLogin(); setMessage('policy-message', '保存策略失败：' + error.message, 'error'); } }
    async function addPolicyEntry() { var input = byId('policy-github-id'); var githubId = input && input.value.trim(); if (!/^\d{1,20}$/.test(githubId || '') || githubId === '0') { setMessage('policy-message', '请输入有效的 GitHub 数字 ID。', 'error'); return; } try { await apiRequest('/api/admin/comment-policy/entries', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({githubId: githubId})}); input.value = ''; await loadCommentPolicy(); await loadComments(); setMessage('policy-message', '用户已加入名单。', 'success'); } catch (error) { if (isUnauthorized(error)) return redirectToLogin(); setMessage('policy-message', '加入名单失败：' + error.message, 'error'); } }
    async function removePolicyEntry(githubId) { if (!window.confirm('将 GitHub ID ' + githubId + ' 移出名单？')) return; try { await apiRequest('/api/admin/comment-policy/entries/' + encodeURIComponent(githubId), {method: 'DELETE'}); await loadCommentPolicy(); await loadComments(); setMessage('policy-message', '用户已移出名单。', 'success'); } catch (error) { if (isUnauthorized(error)) return redirectToLogin(); setMessage('policy-message', '移出名单失败：' + error.message, 'error'); } }
    async function togglePolicyForComment(comment) { if (!comment.githubId) return; if (comment.blocked) return removePolicyEntry(comment.githubId); if (!window.confirm('拉黑 GitHub ID ' + comment.githubId + '？该用户的评论将对访客显示为已删除。')) return; try { await apiRequest('/api/admin/comment-policy/entries', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({githubId: comment.githubId, login: comment.authorName})}); await loadCommentPolicy(); await loadComments(); setMessage('policy-message', '用户已拉黑。', 'success'); } catch (error) { if (isUnauthorized(error)) return redirectToLogin(); setMessage('policy-message', '拉黑失败：' + error.message, 'error'); } }

    function safeReturnTo() { var value = new URLSearchParams(window.location.search).get('returnTo') || '/admin/'; return value.charAt(0) === '/' && value.charAt(1) !== '/' ? value : '/admin/'; }
    function showAdminOAuthResult() {
        var result = new URLSearchParams(window.location.search).get('argon_admin_auth');
        if (!result) return false;
        var messages = {success: 'GitHub 管理员登录成功，正在进入后台…', forbidden: '这个 GitHub 账号不是已配置的唯一管理员。', cancelled: '已取消 GitHub 登录。', not_configured: '管理员 GitHub 登录尚未完成配置。', error: 'GitHub 登录失败，请稍后重试。'};
        if (result === 'success') { writeSessionValue(ADMIN_SESSION_CACHE_KEY, ''); setStatus(messages.success, 'ok'); window.setTimeout(function () { window.location.replace(safeReturnTo()); }, 80); }
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
    async function logout() { try { await apiRequest('/api/admin/auth/logout', {method: 'POST'}); } catch (error) { if (!isUnauthorized(error)) setStatus('退出登录失败：' + error.message, 'error'); } writeSessionValue(ADMIN_SESSION_CACHE_KEY, ''); window.location.replace('/admin/login/'); }

    function cachedAdminSession() {
        var raw = readSessionValue(ADMIN_SESSION_CACHE_KEY); if (!raw) return null;
        try {
            var cached = JSON.parse(raw);
            if (!cached || !cached.csrfToken || !cached.savedAt || Date.now() - Number(cached.savedAt) > ADMIN_SESSION_CACHE_TTL) return null;
            return cached;
        } catch (error) { return null; }
    }
    function markAdminSession(csrfToken) { writeSessionValue(ADMIN_SESSION_CACHE_KEY, JSON.stringify({csrfToken: csrfToken || '', savedAt: Date.now()})); }
    async function ensureSession() {
        await discoverEndpoint();
        var cached = cachedAdminSession();
        if (cached) { state.adminCsrf = cached.csrfToken; setStatus('管理员已登录。', 'ok'); return; }
        var data = await apiRequest('/api/admin/auth/me');
        if (!data.authenticated) throw new Error('unauthorized');
        state.adminCsrf = data.csrfToken || ''; markAdminSession(state.adminCsrf);
        if (byId('auth-badge')) { byId('auth-badge').textContent = '已登录'; byId('auth-badge').className = 'badge'; } setStatus('管理员已登录。', 'ok');
    }
    async function bootstrapProtected() { try { await ensureSession(); var page = document.body.getAttribute('data-admin-page') || 'home'; if (page === 'views' || page === 'comments') { await loadArticleTitles(); if (page === 'views') await loadViews(); else { await loadCommentPolicy(); await loadComments(); } } } catch (error) { if (isUnauthorized(error)) return redirectToLogin(); setStatus('后台连接失败：' + error.message, 'error'); } }

    function bindCommon() { if (byId('logout-button')) byId('logout-button').addEventListener('click', logout); }
    function bootstrapLogin() { renderAdminNav(); var oauthResult = showAdminOAuthResult(); var githubButton = byId('github-admin-login-button'); if (githubButton) githubButton.disabled = true; discoverEndpoint().then(function () { if (githubButton) githubButton.disabled = false; if (!oauthResult) setStatus('请使用唯一的 GitHub 管理员账号登录。', 'pending'); }).catch(function (error) { setStatus('未发现可用的阅读量 Worker：' + error.message, 'error'); }); if (githubButton) githubButton.addEventListener('click', startGithubAdminLogin); }
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
        if (byId('comment-policy-mode')) byId('comment-policy-mode').addEventListener('change', function () { saveCommentPolicy(); });
        if (byId('policy-add')) byId('policy-add').addEventListener('click', addPolicyEntry);
        bootstrapProtected();
    }

    bootstrapTheme();
    if (document.body.getAttribute('data-admin-page') === 'login') bootstrapLogin(); else bootstrapAdmin();
}());
