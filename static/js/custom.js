/* 主题扩展入口：跨路径导航也会触发，避免依赖已移除的 PJAX 响应对象。 */
document.addEventListener('argon:page-ready', function(event) {
    if (typeof(window.argonCustomPageLoaded) == 'function') {
        window.argonCustomPageLoaded(event.detail || {});
    }
});

/* Cloudflare Worker + D1 article view counter. Site configuration comes from hugo.yaml. */
(function(window, document) {
    'use strict';

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
        await refreshPageCounters();
    }

    document.addEventListener('argon:page-ready', function() {
        handlePageReady();
    });
})(window, document);
