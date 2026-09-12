(function () {
    'use strict';

    var state = {
        endpoint: '',
        defaults: {},
        settings: {},
        sourceConfig: null,
        sourceYaml: '',
        formDirty: false,
        slugs: [],
        counts: {},
        total: 0,
        adminKey: ''
    };
    var defaultYaml = '# 当前站点还没有提供可导出的 hugo.yaml。\n';
    var appearanceCacheKey = 'argon_appearance_settings_local_v2';
    var legacyAppearanceCacheKey = 'argon_appearance_settings_cache_v1';

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

    async function loadSourceConfig() {
        try {
            var response = await fetch(new URL('/settings/source-hugo.yaml', window.location.href).href, {cache: 'no-store', credentials: 'same-origin'});
            if (!response.ok) return false;
            var sourceYaml = await response.text();
            var sourceConfig = parseYaml(sourceYaml);
            if (!sourceConfig || typeof sourceConfig !== 'object' || Array.isArray(sourceConfig)) return false;
            state.sourceYaml = sourceYaml;
            state.sourceConfig = sourceConfig;
            state.defaults = normalizeSettingKeys(sourceConfig);
            return true;
        } catch (error) {
            return false;
        }
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
                if (parsedDefaults && typeof parsedDefaults === 'object') state.defaults = {params: normalizeSettingKeys(parsedDefaults)};
            } catch (error) {
                throw new Error('首页的 hugo.yaml 默认值格式错误');
            }
        }
        var sourceLoaded = await loadSourceConfig();
        if (!endpoint) throw new Error('首页没有有效的阅读量 Worker 地址');
        state.endpoint = endpoint;
        byId('endpoint-label').textContent = endpoint;
        byId('origin-label').textContent = window.location.origin;
        byId('yaml-defaults-status').textContent = Object.keys(state.defaults).length
            ? (sourceLoaded ? '已读取仓库 hugo.yaml 原文；每个字段都可单独覆盖，导出会保留完整配置。' : '已读取当前站点参数；未发现仓库原文，导出将保留全部已知字段。')
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

    function stripYamlComment(value) {
        var quote = '';
        var escaped = false;
        for (var index = 0; index < value.length; index += 1) {
            var character = value.charAt(index);
            if (quote === '"' && escaped) { escaped = false; continue; }
            if (quote === '"' && character === '\\') { escaped = true; continue; }
            if (character === '"' || character === "'") {
                if (!quote) quote = character;
                else if (quote === character) quote = '';
            } else if (character === '#' && !quote && (index === 0 || /\s/.test(value.charAt(index - 1)))) {
                return value.slice(0, index).trim();
            }
        }
        return value.trim();
    }

    function yamlKeyValue(value, lineNumber) {
        var quote = '';
        var escaped = false;
        for (var index = 0; index < value.length; index += 1) {
            var character = value.charAt(index);
            if (quote === '"' && escaped) { escaped = false; continue; }
            if (quote === '"' && character === '\\') { escaped = true; continue; }
            if (character === '"' || character === "'") {
                if (!quote) quote = character;
                else if (quote === character) quote = '';
            } else if (character === ':' && !quote && (index + 1 === value.length || /\s/.test(value.charAt(index + 1)))) {
                var key = value.slice(0, index).trim();
                if (!key) throw new Error('第 ' + lineNumber + ' 行缺少字段名');
                return {key: key, raw: value.slice(index + 1).trim()};
            }
        }
        throw new Error('第 ' + lineNumber + ' 行不是 key: value 格式');
    }

    function parseYaml(text) {
        var lines = [];
        String(text || '').split(/\r?\n/).forEach(function (line, index) {
            if (/\t/.test(line)) throw new Error('第 ' + (index + 1) + ' 行请使用空格缩进');
            var content = stripYamlComment(line.replace(/^\s*/, ''));
            if (!content) return;
            var indent = line.length - line.replace(/^\s*/, '').length;
            lines.push({indent: indent, content: content, lineNumber: index + 1});
        });

        function parseBlock(start, indent) {
            if (start >= lines.length || lines[start].indent !== indent) return {value: {}, next: start};
            var list = /^-(?:\s|$)/.test(lines[start].content);
            var value = list ? [] : {};
            var index = start;
            while (index < lines.length && lines[index].indent === indent) {
                var line = lines[index];
                if (list !== /^-(?:\s|$)/.test(line.content)) break;
                if (list) {
                    var itemText = line.content.slice(1).trim();
                    index += 1;
                    if (!itemText) {
                        if (index < lines.length && lines[index].indent > indent) {
                            var child = parseBlock(index, lines[index].indent);
                            value.push(child.value);
                            index = child.next;
                        } else value.push(null);
                        continue;
                    }
                    if (/:\s|:$/.test(itemText)) {
                        var item = {};
                        var first = yamlKeyValue(itemText, line.lineNumber);
                        if (first.raw) item[first.key] = parseScalar(first.raw);
                        else if (index < lines.length && lines[index].indent > indent) {
                            var firstChild = parseBlock(index, lines[index].indent);
                            item[first.key] = firstChild.value;
                            index = firstChild.next;
                        } else item[first.key] = null;
                        if (index < lines.length && lines[index].indent > indent) {
                            var continuation = parseBlock(index, lines[index].indent);
                            if (!continuation.value || typeof continuation.value !== 'object' || Array.isArray(continuation.value)) {
                                throw new Error('第 ' + lines[index].lineNumber + ' 行列表项结构错误');
                            }
                            item = mergeSettings(item, continuation.value);
                            index = continuation.next;
                        }
                        value.push(item);
                    } else {
                        value.push(parseScalar(itemText));
                        if (index < lines.length && lines[index].indent > indent) {
                            throw new Error('第 ' + lines[index].lineNumber + ' 行列表缩进层级错误');
                        }
                    }
                } else {
                    var entry = yamlKeyValue(line.content, line.lineNumber);
                    index += 1;
                    if (entry.raw) value[entry.key] = parseScalar(entry.raw);
                    else if (index < lines.length && lines[index].indent > indent) {
                        var nested = parseBlock(index, lines[index].indent);
                        value[entry.key] = nested.value;
                        index = nested.next;
                    } else value[entry.key] = null;
                }
            }
            return {value: value, next: index};
        }

        if (!lines.length) return {};
        var parsed = parseBlock(0, lines[0].indent);
        if (parsed.next !== lines.length) throw new Error('第 ' + lines[parsed.next].lineNumber + ' 行缩进层级错误');
        return parsed.value;
    }

    function scalarText(value) {
        if (typeof value === 'string') return JSON.stringify(value);
        if (value === null) return 'null';
        if (Array.isArray(value)) return JSON.stringify(value);
        if (typeof value === 'undefined') return 'null';
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

    function canonicalSettingKey(path) {
        var canonical = path;
        var legacyAliases = {
            'params.themecolor': 'params.themeColor',
            'params.cardradius': 'params.cardRadius',
            'params.cardshadow': 'params.cardShadow',
            'params.pagebackgroundurl': 'params.pageBackgroundUrl',
            'params.pagebackgrounddarkurl': 'params.pageBackgroundDarkUrl',
            'params.pagebackgroundopacity': 'params.pageBackgroundOpacity',
            'params.transparentbanner': 'params.transparentBanner',
            'params.banner.backgroundurl': 'params.banner.backgroundUrl',
            'params.banner.backgroundcolortype': 'params.banner.backgroundColorType',
            'params.banner.backgroundhideshapes': 'params.banner.backgroundHideShapes',
            'params.sidebar.bannertitle': 'params.sidebar.bannerTitle',
            'params.sidebar.bannersubtitle': 'params.sidebar.bannerSubtitle',
            'params.sidebar.authorname': 'params.sidebar.authorName',
            'params.sidebar.authorimage': 'params.sidebar.authorImage',
            'params.sidebar.authordescription': 'params.sidebar.authorDescription'
        };
        if (legacyAliases[path.toLowerCase()]) canonical = legacyAliases[path.toLowerCase()];
        document.querySelectorAll('[data-setting-toggle]').forEach(function(toggle) {
            var candidate = toggle.getAttribute('data-setting-toggle');
            if (candidate && candidate.toLowerCase() === path.toLowerCase()) canonical = candidate;
        });
        return canonical.split('.').pop();
    }

    function normalizeSettingKeys(value, prefix) {
        if (Array.isArray(value)) return value.map(function(item) { return normalizeSettingKeys(item, prefix); });
        if (!value || typeof value !== 'object') return value;
        var result = {};
        Object.keys(value).forEach(function(key) {
            var path = prefix ? prefix + '.' + key : key;
            var canonical = canonicalSettingKey(path);
            var childPrefix = prefix ? prefix + '.' + canonical : canonical;
            result[canonical] = normalizeSettingKeys(value[key], childPrefix);
        });
        return result;
    }

    var categoryLabels = {
        banner: '横幅',
        toolbar: '顶栏',
        sidebar: '侧栏',
        fab: '悬浮操作按钮',
        viewCounter: '阅读量',
        article: '文章',
        footerHtml: '页脚'
    };
    var articleSettingKeys = {
        excerpt: true, excerptLength: true, firstImageAsThumbnail: true, articleMeta: true,
        showReadingtime: true, readingSpeedCn: true, readingSpeedEn: true,
        showThumbnailInBannerInContentPage: true, showShareBtn: true, donateQrcodeUrl: true,
        additionalContentAfterPost: true, articleHeaderStyle: true
    };

    function settingCategory(path) {
        var parts = path.split('.');
        if (parts[0] !== 'params') return '站点构建配置';
        var key = parts[1] || 'params';
        var categoryKey = Object.keys(categoryLabels).find(function(candidate) { return candidate.toLowerCase() === key.toLowerCase(); });
        if (categoryKey) return categoryLabels[categoryKey];
        var articleKey = Object.keys(articleSettingKeys).find(function(candidate) { return candidate.toLowerCase() === key.toLowerCase(); });
        if (articleKey) return '文章';
        return '基础与全局';
    }

    function settingLabel(path) {
        var parts = path.split('.');
        return parts[parts.length - 1];
    }

    function settingId(path) {
        return 'argon-setting-' + path.replace(/[^a-zA-Z0-9_-]/g, '-');
    }

    function collectSettingLeaves(value, path, leaves) {
        if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length) {
            Object.keys(value).forEach(function(key) {
                collectSettingLeaves(value[key], path ? path + '.' + key : key, leaves);
            });
            return;
        }
        leaves.push({path: path, value: value});
    }

    function makeSettingEditor(item) {
        var value = item.value;
        var editor;
        var jsonValue = value === null || (value && typeof value === 'object');
        if (jsonValue) {
            editor = document.createElement('textarea');
            editor.className = 'setting-control setting-control-json';
            editor.setAttribute('data-setting-json', 'true');
            editor.value = JSON.stringify(value, null, 2);
        } else {
            editor = document.createElement('input');
            editor.className = 'setting-control' + (typeof value === 'boolean' ? ' setting-checkbox' : '');
            if (typeof value === 'boolean') editor.type = 'checkbox';
            else if (typeof value === 'number') {
                editor.type = 'number';
                editor.step = Number.isInteger(value) ? '1' : 'any';
            } else if (typeof value === 'string' && (value.length > 120 || /\r?\n/.test(value))) {
                editor = document.createElement('textarea');
                editor.className = 'setting-control setting-control-longtext';
                editor.value = value;
            } else {
                editor.type = 'text';
                editor.value = value === undefined ? '' : String(value);
            }
        }
        editor.id = settingId(item.path);
        editor.setAttribute('data-setting-input', item.path);
        editor.setAttribute('aria-label', item.path);
        return editor;
    }

    function renderDynamicSettings(settings) {
        var container = byId('dynamic-settings');
        if (!container) return;
        container.textContent = '';
        var source = mergeSettings(state.defaults, settings || {});
        var leaves = [];
        collectSettingLeaves(source, '', leaves);
        if (!leaves.length || !leaves[0].path) {
            var empty = document.createElement('p');
            empty.className = 'yaml-defaults-status';
            empty.textContent = '尚未读取到 hugo.yaml，请稍后刷新。';
            container.appendChild(empty);
            return;
        }
        var groups = {};
        var order = [];
        leaves.forEach(function(item) {
            var category = settingCategory(item.path);
            if (!groups[category]) { groups[category] = []; order.push(category); }
            groups[category].push(item);
        });
        order.forEach(function(category) {
            var fieldset = document.createElement('fieldset');
            var legend = document.createElement('legend');
            legend.textContent = category;
            fieldset.appendChild(legend);
            var grid = document.createElement('div');
            grid.className = 'appearance-form-grid';
            groups[category].forEach(function(item) {
                var field = document.createElement('div');
                var value = item.value;
                var wide = value === null || (value && typeof value === 'object') || (typeof value === 'string' && (value.length > 120 || /\r?\n/.test(value)));
                field.className = 'appearance-field' + (wide ? ' appearance-field-wide' : '');
                var row = document.createElement('div');
                row.className = 'field-label-row';
                var label = document.createElement('label');
                label.setAttribute('for', settingId(item.path));
                label.textContent = settingLabel(item.path);
                row.appendChild(label);
                var overrideLabel = document.createElement('label');
                overrideLabel.className = 'override-toggle';
                var toggle = document.createElement('input');
                toggle.type = 'checkbox';
                toggle.setAttribute('data-setting-toggle', item.path);
                overrideLabel.appendChild(toggle);
                overrideLabel.appendChild(document.createTextNode('覆盖'));
                row.appendChild(overrideLabel);
                field.appendChild(row);
                var pathHint = document.createElement('div');
                pathHint.className = 'setting-path';
                pathHint.textContent = item.path;
                field.appendChild(pathHint);
                field.appendChild(makeSettingEditor(item));
                grid.appendChild(field);
            });
            fieldset.appendChild(grid);
            container.appendChild(fieldset);
        });
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
        var baseline = normalizeSettingKeys(defaults && typeof defaults === 'object' ? defaults : {});
        var overrideSource = normalizeSettingKeys(overrides && typeof overrides === 'object' ? overrides : {});
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
            else if (input.getAttribute('data-setting-json') === 'true') input.value = JSON.stringify(value, null, 2);
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

    function deleteSetting(settings, path) {
        var parts = path.split('.');
        var target = settings;
        for (var index = 0; index < parts.length - 1; index += 1) {
            if (!target || typeof target !== 'object' || !Object.prototype.hasOwnProperty.call(target, parts[index])) return;
            target = target[parts[index]];
        }
        if (target && typeof target === 'object') delete target[parts[parts.length - 1]];
    }

    function collectFormSettings(existing) {
        var settings = mergeSettings({}, existing && typeof existing === 'object' ? existing : {});
        document.querySelectorAll('[data-setting-toggle]').forEach(function(toggle) {
            var path = toggle.getAttribute('data-setting-toggle');
            if (!toggle.checked) { deleteSetting(settings, path); return; }
            var input = settingInput(path);
            if (!input) return;
            var value;
            if (input.type === 'checkbox') value = input.checked;
            else if (input.getAttribute('data-setting-json') === 'true') {
                try { value = JSON.parse(input.value); } catch (error) { throw new Error(path + ' 的 JSON 格式错误'); }
            } else value = input.value;
            if (input.type === 'range' || input.type === 'number') value = Number(input.value);
            if (path === 'themeColor' || path === 'params.themeColor') {
                value = normalizedColor(value);
                if (!value) throw new Error('主题色必须是 #fff 或 #ffffff 格式');
            }
            if (/url$/i.test(path)) {
                if (!isSafeSettingUrl(String(value))) throw new Error(path + ' 只支持 / 路径或 http(s) 地址');
            }
            writeSetting(settings, path, value);
        });
        return settings;
    }

    function hasSettingValue(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
        return Object.keys(value).some(function(key) { return hasSettingValue(value[key]); });
    }

    function generateYamlFromForm() {
        var overrides = collectFormSettings(state.settings);
        var settings = mergeSettings(state.defaults, overrides);
        var text;
        if (state.sourceYaml && !hasSettingValue(overrides)) text = state.sourceYaml;
        else {
            text = formatYaml(settings, '') + '\n';
            if (text === '\n') text = defaultYaml;
        }
        byId('settings-yaml').value = text || defaultYaml;
        state.formDirty = false;
        return settings;
    }

    function yamlTextForExport() {
        var textarea = byId('settings-yaml');
        if (state.formDirty || !textarea.value.trim() || textarea.value.trim() === defaultYaml.trim()) generateYamlFromForm();
        return textarea.value;
    }

    async function copyYaml() {
        try {
            var text = yamlTextForExport();
            if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
            else {
                var textarea = byId('settings-yaml');
                textarea.focus();
                textarea.select();
                document.execCommand('copy');
            }
            setMessage('appearance-message', '完整 hugo.yaml 已复制。', 'success');
        } catch (error) {
            setMessage('appearance-message', '复制失败，请手动复制文本框内容。', 'error');
        }
    }

    function downloadYaml() {
        try {
            var blob = new Blob([yamlTextForExport()], {type: 'text/yaml;charset=utf-8'});
            var url = URL.createObjectURL(blob);
            var link = document.createElement('a');
            link.href = url;
            link.download = 'hugo.yaml';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setMessage('appearance-message', '完整 hugo.yaml 已下载。', 'success');
        } catch (error) {
            setMessage('appearance-message', '下载失败，请使用“复制 YAML”。', 'error');
        }
    }

    function renderSettings(settings) {
        renderDynamicSettings(settings);
        setFormSettings(state.defaults, settings);
        try { generateYamlFromForm(); } catch (error) { byId('settings-yaml').value = defaultYaml; }
        state.formDirty = false;
    }

    function showGuide(show) { byId('offline-guide').hidden = !show; }

    function loadLocalSettings() {
        try {
            var settings = {};
            var keys = [appearanceCacheKey, legacyAppearanceCacheKey];
            for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
                var raw = window.localStorage.getItem(keys[keyIndex]);
                if (!raw) continue;
                var parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
                settings = Object.prototype.hasOwnProperty.call(parsed, 'params')
                    ? parsed
                    : (Object.keys(parsed).length ? {params: parsed} : {});
                if (keys[keyIndex] !== appearanceCacheKey) {
                    try { window.localStorage.setItem(appearanceCacheKey, JSON.stringify(settings)); } catch (migrationError) {}
                }
                break;
            }
            state.settings = normalizeSettingKeys(settings);
        } catch (error) {
            state.settings = {};
        }
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

    async function saveTotal() {
        if (!state.adminKey) { setMessage('views-message', '请先连接管理员密钥。', 'error'); return; }
        var value = Number(byId('site-total').value);
        if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) {
            setMessage('views-message', '网站总阅读量必须是 0 到 2147483647 的整数。', 'error');
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
            setMessage('views-message', '网站总阅读量已保存。', 'success');
        } catch (error) {
            setMessage('views-message', '保存网站总量失败：' + error.message, 'error');
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

    async function saveSettings() {
        try {
            var settings = collectFormSettings(state.settings);
            state.settings = settings;
            cacheAppearanceSettings(state.settings);
            renderSettings(state.settings);
            setMessage('appearance-message', '已保存到当前浏览器。要让所有访客生效，请导出 YAML 并重新构建博客。', 'success');
        } catch (error) {
            setMessage('appearance-message', '保存失败：' + error.message, 'error');
        }
    }

    async function clearSettings() {
        if (!window.confirm('清空当前浏览器的全部主题覆盖并回退到 hugo.yaml？')) return;
        state.settings = {};
        cacheAppearanceSettings(state.settings);
        renderSettings({});
        setMessage('appearance-message', '已清空当前浏览器设置，站点将使用 hugo.yaml 基线。', 'success');
    }

    async function bootstrap() {
        byId('admin-key').value = storageGet('argon-view-counter-admin-key');
        byId('origin-label').textContent = window.location.origin;
        loadLocalSettings();
        try {
            await discoverEndpoint();
            renderSettings(state.settings);
            setStatus('Worker 地址已发现；主题设置保存在当前浏览器。', 'ok');
            showGuide(false);
        } catch (error) {
            renderSettings(state.settings);
            setStatus('未发现可用的阅读量 Worker：' + error.message, 'error');
            showGuide(true);
        }
    }

    byId('connect-button').addEventListener('click', connect);
    byId('forget-button').addEventListener('click', function () { disconnect('管理员密钥已清除。'); });
    byId('save-settings').addEventListener('click', saveSettings);
    byId('clear-settings').addEventListener('click', clearSettings);
    byId('save-total').addEventListener('click', saveTotal);
    byId('apply-yaml-settings').addEventListener('click', function() {
        try {
            var yamlValue = byId('settings-yaml').value;
            var parsed = parseYaml(yamlValue);
            var isFullConfig = parsed.params && typeof parsed.params === 'object' && !Array.isArray(parsed.params);
            var settings = isFullConfig ? parsed : {params: parsed};
            if (isFullConfig) {
                state.sourceYaml = yamlValue;
                state.sourceConfig = parsed;
            }
            state.settings = normalizeSettingKeys(settings);
            renderDynamicSettings(state.settings);
            setFormSettings(state.defaults, state.settings);
            state.formDirty = false;
            setMessage('appearance-message', 'YAML 已载入表单；检查后点击“保存本机设置”。', 'success');
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
    byId('copy-yaml-settings').addEventListener('click', copyYaml);
    byId('download-yaml-settings').addEventListener('click', downloadYaml);
    byId('reload-views').addEventListener('click', function () { if (state.adminKey) loadAdminData().catch(function (error) { setMessage('views-message', error.message, 'error'); }); });
    byId('view-filter').addEventListener('input', renderViews);
    byId('appearance-form').addEventListener('change', function(event) {
        var target = event.target;
        var path = target && target.getAttribute ? target.getAttribute('data-setting-toggle') : '';
        if (path) setSettingEnabled(path, target.checked);
        if (target && target.getAttribute && target.getAttribute('data-setting-input')) state.formDirty = true;
        if (path) state.formDirty = true;
    });
    byId('appearance-form').addEventListener('input', function(event) {
        var target = event.target;
        if (target && target.getAttribute && target.getAttribute('data-setting-input')) state.formDirty = true;
    });
    bootstrap();
}());
