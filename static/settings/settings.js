(function () {
    'use strict';

    var state = {
        endpoint: '',
        defaults: {},
        settings: {},
        slugs: [],
        counts: {},
        adminKey: ''
    };
    var defaultYaml = '# 只填写需要覆盖 hugo.yaml 的字段。删除字段即可回退。\n';
    var appearanceCacheKey = 'argon_appearance_settings_cache_v1';

    function byId(id) { return document.getElementById(id); }

    function setStatus(text, type) {
        var element = byId('connection-status');
        element.textContent = text;
        element.className = 'status status-' + (type || 'pending');
    }

    function setMessage(id, text, type) {
        var element = byId(id);
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

    function cacheAppearanceSettings(settings) {
        try {
            var value = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
            window.localStorage.setItem(appearanceCacheKey, JSON.stringify(value));
        } catch (error) { /* Private browsing or a full storage quota is non-fatal. */ }
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
        var defaultsMeta = parsed.querySelector('meta[name="argon-settings-defaults-b64"]');
        var defaultsText = defaultsMeta ? decodeBase64(defaultsMeta.getAttribute('content')) : '';
        if (defaultsText) {
            try {
                var parsedDefaults = JSON.parse(defaultsText);
                if (parsedDefaults && typeof parsedDefaults === 'object') state.defaults = parsedDefaults;
            } catch (error) {
                throw new Error('首页的 hugo.yaml 默认值格式错误');
            }
        }
        if (!endpoint) throw new Error('首页没有有效的阅读量 Worker 地址');
        state.endpoint = endpoint;
        byId('endpoint-label').textContent = endpoint;
        byId('origin-label').textContent = window.location.origin;
        byId('yaml-defaults-status').textContent = Object.keys(state.defaults).length
            ? '默认值来自当前站点的 hugo.yaml；带“覆盖”标记的值来自后台保存。'
            : '未发现 hugo.yaml 默认值，将使用主题内置默认值。';
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

    function parseScalar(raw) {
        var value = raw.trim();
        if (!value) return '';
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;
        if (/^-?(?:\d+|\d*\.\d+)$/.test(value)) return Number(value);
        if (value.charAt(0) === '"' || value.charAt(0) === "'") {
            if (value.charAt(0) === '"') {
                try { return JSON.parse(value); } catch (error) { throw new Error('字符串引号不匹配'); }
            }
            if (value.charAt(value.length - 1) === "'") return value.slice(1, -1).replace(/''/g, "'");
            throw new Error('字符串引号不匹配');
        }
        if (value.charAt(0) === '{' || value.charAt(0) === '[') {
            try { return JSON.parse(value); } catch (error) { throw new Error('JSON 值格式错误'); }
        }
        return value;
    }

    function parseYaml(text) {
        var root = {};
        var stack = [{indent: -1, value: root}];
        var lines = String(text || '').split(/\r?\n/);
        lines.forEach(function (line, lineIndex) {
            if (!line.trim() || /^\s*#/.test(line)) return;
            if (/\t/.test(line)) throw new Error('第 ' + (lineIndex + 1) + ' 行请使用空格缩进');
            var match = line.match(/^(\s*)([^:]+):(.*)$/);
            if (!match) throw new Error('第 ' + (lineIndex + 1) + ' 行不是 key: value 格式');
            var indent = match[1].length;
            var key = match[2].trim();
            if (!key) throw new Error('第 ' + (lineIndex + 1) + ' 行缺少字段名');
            while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
            var parent = stack[stack.length - 1].value;
            if (!parent || typeof parent !== 'object' || Array.isArray(parent)) throw new Error('第 ' + (lineIndex + 1) + ' 行缩进层级错误');
            var raw = match[3].trim();
            if (!raw) {
                parent[key] = {};
                stack.push({indent: indent, value: parent[key]});
            } else {
                parent[key] = parseScalar(raw);
            }
        });
        return root;
    }

    function scalarText(value) {
        if (typeof value === 'string') return JSON.stringify(value);
        if (value === null) return 'null';
        return String(value);
    }

    function formatYaml(value, indent) {
        var lines = [];
        Object.keys(value || {}).forEach(function (key) {
            var child = value[key];
            if (child && typeof child === 'object' && !Array.isArray(child)) {
                lines.push(indent + key + ':');
                lines = lines.concat(formatYaml(child, indent + '  '));
            } else {
                lines.push(indent + key + ': ' + scalarText(child));
            }
        });
        return lines.join('\n');
    }

    function hasSetting(settings, path) {
        var value = settings;
        var parts = path.split('.');
        for (var index = 0; index < parts.length; index += 1) {
            if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, parts[index])) return false;
            value = value[parts[index]];
        }
        return true;
    }

    function readSetting(settings, path) {
        var value = settings;
        path.split('.').forEach(function(part) { value = value && value[part]; });
        return value;
    }

    function writeSetting(settings, path, value) {
        var parts = path.split('.');
        var target = settings;
        parts.forEach(function(part, index) {
            if (index === parts.length - 1) target[part] = value;
            else {
                if (!target[part] || typeof target[part] !== 'object' || Array.isArray(target[part])) target[part] = {};
                target = target[part];
            }
        });
    }

    function mergeSettings(base, overrides) {
        var result = {};
        [base, overrides].forEach(function(source) {
            if (!source || typeof source !== 'object') return;
            Object.keys(source).forEach(function(key) {
                var value = source[key];
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    result[key] = mergeSettings(result[key], value);
                } else {
                    result[key] = value;
                }
            });
        });
        return result;
    }

    function settingInput(path) {
        return document.querySelector('[data-setting-input="' + path + '"]');
    }

    function settingToggle(path) {
        return document.querySelector('[data-setting-toggle="' + path + '"]');
    }

    function setSettingEnabled(path, enabled) {
        var input = settingInput(path);
        if (input) input.disabled = !enabled;
        document.querySelectorAll('[data-color-companion="' + path + '"]').forEach(function(companion) {
            companion.disabled = !enabled;
        });
    }

    function normalizedColor(value) {
        var color = String(value || '').trim();
        if (/^#[0-9a-f]{3}$/i.test(color)) {
            return '#' + color.slice(1).split('').map(function(part) { return part + part; }).join('');
        }
        return /^#[0-9a-f]{6}$/i.test(color) ? color : '';
    }

    function isSafeSettingUrl(value) {
        return !value || value.charAt(0) === '/' || /^https?:\/\//i.test(value);
    }

    function updateRangeOutput(path) {
        var input = settingInput(path);
        var output = document.querySelector('[data-range-output="' + path + '"]');
        if (!input || !output) return;
        var value = Number(input.value);
        if (path === 'pageBackgroundOpacity') output.textContent = Math.round(value * 100) + '%';
        else if (path === 'cardRadius') output.textContent = value + 'px';
        else output.textContent = String(value);
    }

    function setFormSettings(defaults, overrides) {
        var baseline = defaults && typeof defaults === 'object' ? defaults : {};
        var overrideSource = overrides && typeof overrides === 'object' ? overrides : {};
        var source = mergeSettings(baseline, overrideSource);
        document.querySelectorAll('[data-setting-toggle]').forEach(function(toggle) {
            var path = toggle.getAttribute('data-setting-toggle');
            var enabled = hasSetting(overrideSource, path);
            var input = settingInput(path);
            toggle.checked = enabled;
            setSettingEnabled(path, enabled);
            if (!input || !hasSetting(source, path)) {
                if (input) {
                    if (input.type === 'checkbox') input.checked = false;
                    else if (input.tagName === 'SELECT') input.selectedIndex = 0;
                    else input.value = input.defaultValue || '';
                }
                document.querySelectorAll('[data-color-companion="' + path + '"]').forEach(function(companion) {
                    companion.value = companion.defaultValue || '';
                });
                updateRangeOutput(path);
                return;
            }
            var value = readSetting(source, path);
            if (input.type === 'checkbox') input.checked = value === true;
            else if (value !== undefined && value !== null) input.value = String(value);
            updateRangeOutput(path);
        });
        var colorText = settingInput('themeColor');
        var colorPicker = document.querySelector('[data-color-companion="themeColor"]');
        var color = normalizedColor(colorText ? colorText.value : '');
        if (hasSetting(source, 'themeColor')) color = normalizedColor(readSetting(source, 'themeColor'));
        if (colorText && hasSetting(source, 'themeColor')) colorText.value = color || String(readSetting(source, 'themeColor') || '');
        if (colorPicker && color) colorPicker.value = color;
        document.querySelectorAll('[data-range-output]').forEach(function(output) { updateRangeOutput(output.getAttribute('data-range-output')); });
    }

    function collectFormSettings() {
        var settings = {};
        document.querySelectorAll('[data-setting-toggle]').forEach(function(toggle) {
            if (!toggle.checked) return;
            var path = toggle.getAttribute('data-setting-toggle');
            var input = settingInput(path);
            if (!input) return;
            var value = input.type === 'checkbox' ? input.checked : input.value;
            if (input.type === 'range') value = Number(input.value);
            if (path === 'themeColor') {
                value = normalizedColor(value);
                if (!value) throw new Error('主题色必须是 #fff 或 #ffffff 格式');
            }
            if (/Url$/.test(path) || path === 'sidebar.authorImage') {
                if (!isSafeSettingUrl(String(value))) throw new Error(path + ' 只支持 / 路径或 http(s) 地址');
            }
            writeSetting(settings, path, value);
        });
        return settings;
    }

    function generateYamlFromForm() {
        var settings = collectFormSettings();
        var text = formatYaml(settings, '');
        byId('settings-yaml').value = text ? text + '\n' : defaultYaml;
        return settings;
    }

    function renderSettings(settings) {
        setFormSettings(state.defaults, settings);
        try { generateYamlFromForm(); } catch (error) { byId('settings-yaml').value = defaultYaml; }
    }

    function showGuide(show) { byId('offline-guide').hidden = !show; }

    async function loadPublicSettings() {
        var data = await apiRequest('/api/settings', {method: 'GET'});
        state.settings = data && data.settings && typeof data.settings === 'object' ? data.settings : {};
        cacheAppearanceSettings(state.settings);
        renderSettings(state.settings);
    }

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
        body.textContent = '';
        var slugs = allSlugs().filter(function (slug) { return !filter || slug.toLowerCase().indexOf(filter) >= 0; });
        byId('views-summary').textContent = slugs.length + ' 条路径 · ' + Object.keys(state.counts).length + ' 条 D1 记录';
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
        if (!state.adminKey) { setMessage('views-message', '请先连接管理员密钥。', 'error'); return; }
        if (remove && !window.confirm('删除 ' + slug + ' 的阅读量记录？')) return;
        var value = Number(input.value);
        if (!remove && (!Number.isSafeInteger(value) || value < 0 || value > 2147483647)) {
            setMessage('views-message', '阅读量必须是 0 到 2147483647 的整数。', 'error');
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
            setMessage('views-message', remove ? '已删除 ' + slug : '已保存 ' + slug, 'success');
        } catch (error) {
            setMessage('views-message', '保存失败：' + error.message, 'error');
            if (/unauthorized/i.test(error.message)) disconnect('管理员密钥无效');
        }
    }

    async function loadAdminData() {
        if (!state.adminKey) throw new Error('请输入管理员密钥');
        await Promise.all([loadCounts(), loadSlugs()]);
        renderViews();
        byId('auth-badge').textContent = '已连接';
        byId('auth-badge').className = 'badge';
        setStatus('Worker 已连接，可以管理阅读量和外观。', 'ok');
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

    async function saveSettings() {
        if (!state.adminKey) { setMessage('appearance-message', '请先连接管理员密钥。', 'error'); return; }
        try {
            var settings = collectFormSettings();
            var data = await apiRequest('/api/settings', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({settings: settings})
            });
            state.settings = data.settings || {};
            cacheAppearanceSettings(state.settings);
            renderSettings(state.settings);
            setMessage('appearance-message', '外观覆盖已保存，打开站点页面即可看到效果。', 'success');
        } catch (error) {
            setMessage('appearance-message', '保存失败：' + error.message, 'error');
        }
    }

    async function clearSettings() {
        if (!state.adminKey) { setMessage('appearance-message', '请先连接管理员密钥。', 'error'); return; }
        if (!window.confirm('清空全部外观覆盖并回退到 hugo.yaml？')) return;
        try {
            await apiRequest('/api/settings', {method: 'DELETE'});
            state.settings = {};
            cacheAppearanceSettings(state.settings);
            renderSettings({});
            setMessage('appearance-message', '已清空，站点将使用 hugo.yaml 基线。', 'success');
        } catch (error) {
            setMessage('appearance-message', '清空失败：' + error.message, 'error');
        }
    }

    async function bootstrap() {
        byId('admin-key').value = storageGet('argon-view-counter-admin-key');
        byId('origin-label').textContent = window.location.origin;
        try {
            await discoverEndpoint();
            await loadPublicSettings();
            setStatus('Worker 地址已发现，请输入管理员密钥。', 'ok');
            showGuide(false);
        } catch (error) {
            setStatus('无法发现 Worker：' + error.message, 'error');
            showGuide(true);
            renderSettings({});
        }
    }

    byId('connect-button').addEventListener('click', connect);
    byId('forget-button').addEventListener('click', function () { disconnect('管理员密钥已清除。'); });
    byId('save-settings').addEventListener('click', saveSettings);
    byId('clear-settings').addEventListener('click', clearSettings);
    byId('apply-yaml-settings').addEventListener('click', function() {
        try {
            var settings = parseYaml(byId('settings-yaml').value);
            setFormSettings(state.defaults, settings);
            setMessage('appearance-message', 'YAML 已载入表单；检查后点击“保存表单设置”。', 'success');
        } catch (error) {
            setMessage('appearance-message', 'YAML 格式错误：' + error.message, 'error');
        }
    });
    byId('generate-yaml-settings').addEventListener('click', function() {
        try {
            generateYamlFromForm();
            setMessage('appearance-message', '已从当前表单生成 YAML。', 'success');
        } catch (error) {
            setMessage('appearance-message', error.message, 'error');
        }
    });
    byId('reload-views').addEventListener('click', function () { if (state.adminKey) loadAdminData().catch(function (error) { setMessage('views-message', error.message, 'error'); }); });
    byId('view-filter').addEventListener('input', renderViews);
    document.querySelectorAll('[data-setting-toggle]').forEach(function(toggle) {
        toggle.addEventListener('change', function() {
            var path = toggle.getAttribute('data-setting-toggle');
            setSettingEnabled(path, toggle.checked);
            if (toggle.checked && path === 'themeColor') {
                var text = settingInput(path);
                var picker = document.querySelector('[data-color-companion="' + path + '"]');
                if (text && !normalizedColor(text.value) && picker) text.value = picker.value;
            }
            updateRangeOutput(path);
        });
    });
    document.querySelectorAll('[data-setting-input]').forEach(function(input) {
        input.addEventListener('input', function() {
            updateRangeOutput(input.getAttribute('data-setting-input'));
        });
    });
    var themeColorText = settingInput('themeColor');
    var themeColorPicker = document.querySelector('[data-color-companion="themeColor"]');
    if (themeColorText && themeColorPicker) {
        themeColorPicker.addEventListener('input', function() { themeColorText.value = themeColorPicker.value; });
        themeColorText.addEventListener('input', function() {
            var color = normalizedColor(themeColorText.value);
            if (color) themeColorPicker.value = color;
        });
    }
    bootstrap();
}());
