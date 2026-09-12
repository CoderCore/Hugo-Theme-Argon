/* 主题扩展入口：跨路径导航也会触发，避免依赖已移除的 PJAX 响应对象。 */
document.addEventListener('argon:page-ready', function(event) {
    if (typeof(window.argonCustomPageLoaded) == 'function') {
        window.argonCustomPageLoaded(event.detail || {});
    }
});

/* Cloudflare Worker + D1 article view counter and runtime appearance overrides. */
(function(window, document) {
    'use strict';

    function hasOwn(object, key) {
        return Object.prototype.hasOwnProperty.call(object, key);
    }

    function metaContent(name) {
        var meta = document.querySelector('meta[name="' + name + '"]');
        return meta ? (meta.getAttribute('content') || '') : '';
    }

    function decodedMetaContent(name) {
        var encoded = metaContent(name);
        if (!encoded || typeof window.atob !== 'function') {
            return '';
        }
        try {
            var binary = window.atob(encoded);
            var bytes = new Uint8Array(binary.length);
            for (var index = 0; index < binary.length; index += 1) {
                bytes[index] = binary.charCodeAt(index);
            }
            return typeof TextDecoder === 'function' ? new TextDecoder().decode(bytes) : binary;
        } catch (error) {
            return '';
        }
    }

    function counterConfig() {
        var config = window.argonViewCounterConfig || {};
        if (!config.endpoint) {
            config.endpoint = decodedMetaContent('argon-view-counter-endpoint-b64');
        }
        if (!config.key) {
            config.key = decodedMetaContent('argon-view-counter-key-b64');
        }
        return config;
    }

    function endpointUrl() {
        var endpoint = counterConfig().endpoint;
        return typeof endpoint === 'string' ? endpoint.replace(/\/+$/, '') : '';
    }

    function formatCount(value) {
        var count = Number(value);
        return Number.isFinite(count) ? new Intl.NumberFormat().format(count) : '0';
    }

    function renderCount(counter, value) {
        var target = counter.querySelector('.argon-view-count-value') || counter;
        target.textContent = formatCount(value);
        counter.hidden = false;
        counter.classList.remove('d-none');
        counter.setAttribute('aria-hidden', 'false');
        counter.setAttribute('data-view-loaded', 'true');
    }

    function hideCount(counter) {
        counter.hidden = true;
        counter.classList.add('d-none');
        counter.setAttribute('aria-hidden', 'true');
        counter.removeAttribute('data-view-loaded');
    }

    function syncMetaDividers() {
        document.querySelectorAll('.post-meta').forEach(function(meta) {
            var children = Array.prototype.slice.call(meta.children);
            children.forEach(function(child, index) {
                if (!child.classList.contains('post-meta-devide')) return;
                var previous = index > 0 ? children[index - 1] : null;
                var next = index + 1 < children.length ? children[index + 1] : null;
                var previousVisible = previous && !previous.hidden && !previous.classList.contains('d-none');
                var nextVisible = next && !next.hidden && !next.classList.contains('d-none');
                var hidden = !(previousVisible && nextVisible);
                child.hidden = hidden;
                child.classList.toggle('d-none', hidden);
            });
        });
    }

    var appearanceCacheKey = 'argon_appearance_settings_local_v2';
    var legacyAppearanceCacheKey = 'argon_appearance_settings_cache_v1';

    function readAppearanceCache() {
        try {
            var keys = [appearanceCacheKey, legacyAppearanceCacheKey];
            for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
                var key = keys[keyIndex];
                var raw = window.localStorage.getItem(key);
                if (!raw) continue;
                var cached = JSON.parse(raw);
                if (!cached || typeof cached !== 'object' || Array.isArray(cached)) continue;
                if (key !== appearanceCacheKey) {
                    try { window.localStorage.setItem(appearanceCacheKey, JSON.stringify(cached)); } catch (migrationError) {}
                }
                return cached;
            }
            return {};
        } catch (error) {
            return {};
        }
    }

    async function requestBatchCounts(ids, increment) {
        var endpoint = endpointUrl();
        if (!endpoint || !ids.length) return null;
        var config = counterConfig();
        var controller = typeof AbortController === 'function' ? new AbortController() : null;
        var timeout = Number(config.requestTimeout) || 4000;
        var timer = controller ? window.setTimeout(function() { controller.abort(); }, timeout) : null;
        try {
            var requestUrl = new URL(endpoint, window.location.href);
            requestUrl.pathname = requestUrl.pathname.replace(/\/+$/, '') + '/batch';
            requestUrl.search = '';
            requestUrl.hash = '';
            var headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            if (typeof config.key === 'string' && config.key) {
                headers['X-View-Counter-Key'] = config.key;
            }
            var body = {ids: ids};
            if (increment) body.increment = increment;
            var response = await fetch(requestUrl.href, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body),
                signal: controller ? controller.signal : undefined,
                credentials: 'omit'
            });
            if (!response.ok) return null;
            var data = await response.json();
            return data && data.counts && typeof data.counts === 'object' ? data : null;
        } catch (error) {
            return null;
        } finally {
            if (timer) window.clearTimeout(timer);
        }
    }

    function loadAppearanceSettings() {
        return readAppearanceCache();
    }

    function setText(selector, value) {
        document.querySelectorAll(selector).forEach(function(element) {
            element.textContent = value;
        });
    }

    function setCssUrl(property, value) {
        var cssValue = typeof value === 'string' && value.trim() ? 'url(' + JSON.stringify(value.trim()) + ')' : 'none';
        var content = document.getElementById('content');
        if (content) content.style.setProperty(property, cssValue);
        if (property === '--argon-runtime-bg-dark') {
            document.documentElement.classList.toggle('argon-has-dark-background', cssValue !== 'none');
        }
    }

    function setThemeColor(color) {
        if (typeof color !== 'string') return;
        var value = color.trim().replace(/^#/, '');
        if (value.length === 3) {
            value = value.split('').map(function(part) { return part + part; }).join('');
        }
        if (!/^[0-9a-f]{6}$/i.test(value)) return;
        var r = parseInt(value.slice(0, 2), 16);
        var g = parseInt(value.slice(2, 4), 16);
        var b = parseInt(value.slice(4, 6), 16);
        var max = Math.max(r, g, b) / 255;
        var min = Math.min(r, g, b) / 255;
        var delta = max - min;
        var lightness = (max + min) / 2;
        var saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
        var hue = 0;
        if (delta !== 0) {
            if (max === r / 255) hue = 60 * (((g - b) / 255 / delta) % 6);
            else if (max === g / 255) hue = 60 * (((b - r) / 255 / delta) + 2);
            else hue = 60 * (((r - g) / 255 / delta) + 4);
        }
        if (hue < 0) hue += 360;
        var root = document.documentElement.style;
        root.setProperty('--themecolor', '#' + value);
        root.setProperty('--themecolor-R', String(r));
        root.setProperty('--themecolor-G', String(g));
        root.setProperty('--themecolor-B', String(b));
        root.setProperty('--themecolor-H', String(Math.round(hue)));
        root.setProperty('--themecolor-S', String(Math.round(saturation * 100)));
        root.setProperty('--themecolor-L', String(Math.round(lightness * 100)));
        root.setProperty('--themecolor-rgbstr', r + ', ' + g + ', ' + b);
        document.querySelectorAll('meta[name="theme-color"], meta[name="theme-color-origin"]').forEach(function(meta) {
            meta.setAttribute('content', '#' + value);
        });
    }

    function applyAppearanceSettings(settings) {
        if (!settings || typeof settings !== 'object') return;

        if (hasOwn(settings, 'title')) {
            var title = String(settings.title);
            setText('#navbar-main a.navbar-brand:not(.navbar-icon):not(.navbar-icon-mobile)', title);
            setText('.leftbar-banner-title', title);
            var titleParts = document.title.split(' - ');
            document.title = titleParts.length > 1 ? titleParts[0] + ' - ' + title : title;
        }
        if (hasOwn(settings, 'themeColor')) setThemeColor(settings.themeColor);
        if (hasOwn(settings, 'cardRadius')) {
            var radius = Number(settings.cardRadius);
            if (Number.isFinite(radius) && radius >= 0 && radius <= 48) {
                document.documentElement.style.setProperty('--card-radius', radius + 'px');
                document.querySelectorAll('meta[name="theme-card-radius"]').forEach(function(meta) {
                    meta.setAttribute('content', String(radius));
                });
            }
        }
        if (hasOwn(settings, 'cardShadow')) {
            document.documentElement.classList.toggle('use-big-shadow', settings.cardShadow === 'big');
        }
        if (hasOwn(settings, 'font')) {
            document.documentElement.classList.toggle('use-serif', settings.font === 'serif');
        }
        if (hasOwn(settings, 'pageBackgroundUrl')) setCssUrl('--argon-runtime-bg', settings.pageBackgroundUrl);
        if (hasOwn(settings, 'pageBackgroundDarkUrl')) setCssUrl('--argon-runtime-bg-dark', settings.pageBackgroundDarkUrl);
        if (hasOwn(settings, 'pageBackgroundOpacity')) {
            var content = document.getElementById('content');
            if (content) content.style.setProperty('--argon-runtime-bg-opacity', String(settings.pageBackgroundOpacity));
        }
        if (hasOwn(settings, 'transparentBanner')) {
            document.documentElement.classList.toggle('argon-runtime-transparent-banner', settings.transparentBanner === true);
            document.documentElement.classList.toggle('argon-runtime-opaque-banner', settings.transparentBanner === false);
        }

        var banner = settings.banner && typeof settings.banner === 'object' ? settings.banner : {};
        if (hasOwn(banner, 'title')) {
            setText('#banner .banner-title-inner', String(banner.title));
            document.querySelectorAll('#banner .banner-title[data-text]').forEach(function(element) {
                element.setAttribute('data-text', String(banner.title));
            });
        }
        if (hasOwn(banner, 'size')) {
            var bannerElement = document.getElementById('banner');
            var sizes = ['full', 'mini', 'fullscreen', 'hidden'];
            if (bannerElement && sizes.indexOf(banner.size) >= 0) {
                sizes.forEach(function(size) { bannerElement.classList.remove('banner-size-' + size); });
                bannerElement.classList.add('banner-size-' + banner.size);
                document.documentElement.classList.remove('banner-is-fullscreen', 'banner-is-hidden');
                if (banner.size === 'fullscreen') document.documentElement.classList.add('banner-is-fullscreen');
                if (banner.size === 'hidden') document.documentElement.classList.add('banner-is-hidden');
            }
        }
        if (hasOwn(banner, 'backgroundColorType')) {
            var shape = document.querySelector('#banner .shape');
            var shapeTypes = ['shape-primary', 'shape-default', 'shape-dark', 'shape-info', 'shape-success', 'shape-warning', 'shape-danger'];
            if (shape && shapeTypes.indexOf(banner.backgroundColorType) >= 0) {
                shapeTypes.forEach(function(type) { shape.classList.remove(type); });
                shape.classList.add(banner.backgroundColorType);
            }
        }
        if (hasOwn(banner, 'subtitle')) {
            var subtitle = document.querySelector('#banner .banner-subtitle');
            if (subtitle) {
                subtitle.textContent = String(banner.subtitle);
                subtitle.style.display = banner.subtitle ? '' : 'none';
            }
        }
        if (hasOwn(banner, 'backgroundUrl')) {
            var bannerElement = document.getElementById('banner');
            if (bannerElement) bannerElement.style.backgroundImage = banner.backgroundUrl ? 'url(' + JSON.stringify(banner.backgroundUrl) + ')' : 'none';
        }
        if (hasOwn(banner, 'backgroundHideShapes')) {
            document.querySelectorAll('#banner .shape').forEach(function(shape) {
                shape.style.display = banner.backgroundHideShapes ? 'none' : '';
            });
        }

        var sidebar = settings.sidebar && typeof settings.sidebar === 'object' ? settings.sidebar : {};
        if (hasOwn(sidebar, 'bannerTitle')) setText('.leftbar-banner-title', String(sidebar.bannerTitle));
        if (hasOwn(sidebar, 'bannerSubtitle')) setText('.leftbar-banner-subtitle', String(sidebar.bannerSubtitle));
        if (hasOwn(sidebar, 'authorName')) setText('#leftbar_overview_author_name', String(sidebar.authorName));
        if (hasOwn(sidebar, 'authorImage')) {
            var image = document.getElementById('leftbar_overview_author_image');
            if (image) image.setAttribute('src', sidebar.authorImage);
        }
        if (hasOwn(sidebar, 'authorDescription')) {
            var description = document.getElementById('leftbar_overview_author_description');
            if (!description) {
                description = document.createElement('p');
                description.id = 'leftbar_overview_author_description';
                description.className = 'text-muted small mb-3';
                var authorName = document.getElementById('leftbar_overview_author_name');
                if (authorName && authorName.parentNode) authorName.parentNode.insertBefore(description, authorName.nextSibling);
            }
            if (description) {
                description.textContent = String(sidebar.authorDescription);
                description.hidden = !sidebar.authorDescription;
            }
        }

        var toolbar = settings.toolbar && typeof settings.toolbar === 'object' ? settings.toolbar : {};
        if (hasOwn(toolbar, 'title')) setText('#navbar-main a.navbar-brand:not(.navbar-icon):not(.navbar-icon-mobile)', String(toolbar.title));
        if (hasOwn(toolbar, 'blur')) {
            var navbar = document.getElementById('navbar-main');
            if (navbar) navbar.classList.toggle('navbar-blur', toolbar.blur === true);
        }
    }

    async function refreshPageCounters() {
        var config = counterConfig();
        var counters = Array.prototype.slice.call(document.querySelectorAll('[data-view-count][data-view-id]'));
        if (!config.enabled || !endpointUrl()) {
            counters.forEach(hideCount);
            syncMetaDividers();
            return;
        }
        counters.forEach(hideCount);
        var fullArticle = document.querySelector('article.post-full');
        var fullCounter = fullArticle ? fullArticle.querySelector('[data-view-count][data-view-id]') : null;
        var visibleCounters = counters.filter(function(counter) {
            return counter !== fullCounter && (config.showOnPreview !== false || !counter.closest('article.post-preview'));
        });
        if (fullCounter) visibleCounters.push(fullCounter);
        var ids = [];
        visibleCounters.forEach(function(counter) {
            var id = counter.getAttribute('data-view-id');
            if (id && ids.indexOf(id) < 0) ids.push(id);
        });
        if (!ids.length) {
            syncMetaDividers();
            return;
        }

        /* One request serves all visible cards. The current article is also
         * incremented in that request, avoiding a second round trip. */
        var chunks = [];
        for (var start = 0; start < ids.length; start += 100) chunks.push(ids.slice(start, start + 100));
        var results = await Promise.all(chunks.map(function(chunk) {
            var increment = fullCounter ? fullCounter.getAttribute('data-view-id') : '';
            return requestBatchCounts(chunk, chunk.indexOf(increment) >= 0 ? increment : '');
        }));
        var values = {};
        var successful = true;
        results.forEach(function(result) {
            if (!result) { successful = false; return; }
            Object.keys(result.counts).forEach(function(id) { values[id] = result.counts[id]; });
        });
        visibleCounters.forEach(function(counter) {
            var id = counter.getAttribute('data-view-id');
            if (successful && Object.prototype.hasOwnProperty.call(values, id)) renderCount(counter, values[id]);
            else hideCount(counter);
        });
        syncMetaDividers();
    }

    async function handlePageReady() {
        /* Apply the last known local settings without a Worker round trip. */
        var settings = loadAppearanceSettings();
        applyAppearanceSettings(settings);
        await refreshPageCounters();
    }

    document.addEventListener('argon:page-ready', function() {
        handlePageReady();
    });
})(window, document);
