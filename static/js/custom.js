/* 主题扩展入口：跨路径导航也会触发，避免依赖已移除的 PJAX 响应对象。 */
document.addEventListener('argon:page-ready', function(event) {
    if (typeof(window.argonCustomPageLoaded) == 'function') {
        window.argonCustomPageLoaded(event.detail || {});
    }
});

/* Cloudflare Worker + D1 article view counter. It stays inert until an endpoint is configured. */
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

    async function requestCount(id, increment) {
        var endpoint = endpointUrl();
        if (!endpoint || !id) {
            return null;
        }
        var config = counterConfig();
        var controller = typeof AbortController === 'function' ? new AbortController() : null;
        var timeout = Number(config.requestTimeout) || 4000;
        var timer = controller ? window.setTimeout(function() { controller.abort(); }, timeout) : null;
        try {
            var headers = {};
            if (increment) {
                headers['Content-Type'] = 'application/json';
            }
            if (typeof config.key === 'string' && config.key) {
                headers['X-View-Counter-Key'] = config.key;
            }
            var response = await fetch(endpoint, {
                method: increment ? 'POST' : 'GET',
                headers: headers,
                body: increment ? JSON.stringify({id: id}) : undefined,
                signal: controller ? controller.signal : undefined,
                credentials: 'omit'
            });
            if (!response.ok) {
                return null;
            }
            var data = await response.json();
            return typeof data.views === 'number' ? data.views : null;
        } catch (error) {
            return null;
        } finally {
            if (timer) {
                window.clearTimeout(timer);
            }
        }
    }

    async function refreshPageCounters() {
        var config = counterConfig();
        var counters = Array.prototype.slice.call(document.querySelectorAll('[data-view-count][data-view-id]'));
        if (!config.enabled || !endpointUrl()) {
            counters.forEach(hideCount);
            return;
        }
        counters.forEach(hideCount);
        var fullArticle = document.querySelector('article.post-full');
        var fullCounter = fullArticle ? fullArticle.querySelector('[data-view-count][data-view-id]') : null;
        var jobs = counters.filter(function(counter) {
            return counter !== fullCounter && (config.showOnPreview !== false || !counter.closest('article.post-preview'));
        }).map(function(counter) {
            return requestCount(counter.getAttribute('data-view-id'), false).then(function(value) {
                if (value !== null) {
                    renderCount(counter, value);
                } else {
                    hideCount(counter);
                }
            });
        });
        if (fullCounter) {
            jobs.push(requestCount(fullCounter.getAttribute('data-view-id'), true).then(function(value) {
                if (value !== null) {
                    renderCount(fullCounter, value);
                } else {
                    hideCount(fullCounter);
                }
            }));
        }
        await Promise.all(jobs);
    }

    document.addEventListener('argon:page-ready', refreshPageCounters);
})(window, document);
