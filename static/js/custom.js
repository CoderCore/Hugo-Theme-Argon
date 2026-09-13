/* 主题扩展入口：跨路径导航也会触发，避免依赖已移除的 PJAX 响应对象。 */
document.addEventListener('argon:page-ready', function(event) {
    if (typeof(window.argonCustomPageLoaded) == 'function') {
        window.argonCustomPageLoaded(event.detail || {});
    }
});

/* Comment providers are initialized from the page lifecycle so they also
 * work after the navigation layer replaces #page-view with a cloned fragment.
 * External providers are loaded only when a configured host exists. */
(function(window, document) {
    'use strict';

    var scriptPromises = {};
    var stylePromises = {};
    var walineInstance = null;
    var remark42Instance = null;
    var commentIdleHandle = null;
    var commentTimeoutHandle = null;

    function isLiveHost(host) {
        return !!(host && host.isConnected && document.documentElement.contains(host));
    }

    function destroyInstance(instance) {
        if (instance && typeof instance.destroy === 'function') {
            try { instance.destroy(); } catch (error) {}
        }
    }

    function cancelCommentSchedule() {
        if (commentIdleHandle !== null) {
            if (typeof window.cancelIdleCallback === 'function') {
                window.cancelIdleCallback(commentIdleHandle);
            }
            commentIdleHandle = null;
        }
        if (commentTimeoutHandle !== null) {
            window.clearTimeout(commentTimeoutHandle);
            commentTimeoutHandle = null;
        }
    }

    function cleanupCommentInstances() {
        cancelCommentSchedule();
        destroyInstance(walineInstance);
        destroyInstance(remark42Instance);
        walineInstance = null;
        remark42Instance = null;
    }

    function loadScript(src, attributes) {
        if (scriptPromises[src]) return scriptPromises[src];
        scriptPromises[src] = new Promise(function(resolve, reject) {
            var script = null;
            Array.prototype.some.call(document.querySelectorAll('script[data-argon-comment-script]'), function(candidate) {
                if (candidate.getAttribute('data-argon-comment-script') === src) {
                    script = candidate;
                    return true;
                }
                return false;
            });
            if (!script) {
                script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.dataset.argonCommentScript = src;
                Object.keys(attributes || {}).forEach(function(name) {
                    script.setAttribute(name, attributes[name]);
                });
            }
            script.addEventListener('load', function() {
                script.dataset.argonCommentLoaded = 'true';
                resolve(script);
            }, {once: true});
            script.addEventListener('error', function() {
                if (script.parentNode) script.parentNode.removeChild(script);
                reject(new Error('Comment provider failed to load'));
            }, {once: true});
            if (!script.parentNode) (document.head || document.body).appendChild(script);
            if (script.dataset.argonCommentLoaded === 'true') resolve(script);
        });
        scriptPromises[src] = scriptPromises[src].catch(function(error) {
            delete scriptPromises[src];
            throw error;
        });
        return scriptPromises[src];
    }

    function loadStylesheet(src) {
        if (stylePromises[src]) return stylePromises[src];
        stylePromises[src] = new Promise(function(resolve, reject) {
            var link = null;
            Array.prototype.some.call(document.querySelectorAll('link[data-argon-comment-style]'), function(candidate) {
                if (candidate.getAttribute('data-argon-comment-style') === src) {
                    link = candidate;
                    return true;
                }
                return false;
            });
            if (!link) {
                link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = src;
                link.setAttribute('data-argon-comment-style', src);
            }
            link.addEventListener('load', function() { resolve(link); }, {once: true});
            link.addEventListener('error', function() {
                if (link.parentNode) link.parentNode.removeChild(link);
                reject(new Error('Comment provider stylesheet failed to load'));
            }, {once: true});
            if (!link.parentNode) (document.head || document.body).appendChild(link);
        });
        stylePromises[src] = stylePromises[src].catch(function(error) {
            delete stylePromises[src];
            throw error;
        });
        return stylePromises[src];
    }

    function loadGiscus(root) {
        root = root || document;
        var host = root.querySelector ? root.querySelector('.giscus') : null;
        if (!isLiveHost(host) || host.dataset.loaded === 'true' || host.dataset.loaded === 'loading') return;
        if (!host.dataset.repo || !host.dataset.repoId || !host.dataset.category || !host.dataset.categoryId) return;
        host.dataset.loaded = 'loading';
        host.dataset.failed = 'false';
        var script = document.createElement('script');
        script.src = 'https://giscus.app/client.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        [['data-repo', 'repo'], ['data-repo-id', 'repoId'], ['data-category', 'category'], ['data-category-id', 'categoryId'], ['data-mapping', 'mapping'], ['data-lang', 'lang']].forEach(function (pair) {
            script.setAttribute(pair[0], host.dataset[pair[1]]);
        });
        script.setAttribute('data-reactions-enabled', '1');
        script.setAttribute('data-emit-metadata', '0');
        script.setAttribute('data-input-position', 'top');
        script.addEventListener('load', function() {
            host.dataset.loaded = 'true';
        }, {once: true});
        script.addEventListener('error', function() {
            host.dataset.loaded = 'false';
            host.dataset.failed = 'true';
            if (script.parentNode) script.parentNode.removeChild(script);
        }, {once: true});
        host.appendChild(script);
    }

    function loadWaline(root) {
        var host = root.querySelector ? root.querySelector('#waline[data-server-url]') : null;
        if (!isLiveHost(host) || host.dataset.loaded === 'true' || host.dataset.failed === 'true') return;
        host.dataset.loaded = 'loading';
        loadStylesheet('https://unpkg.com/@waline/client@3.15.2/dist/waline.css').catch(function() {}).then(function() {
            return import('https://unpkg.com/@waline/client@3.15.2/dist/waline.js');
        }).then(function(module) {
            if (!module || typeof module.init !== 'function') throw new Error('Waline init is unavailable');
            if (!isLiveHost(host)) return;
            walineInstance = module.init({
                el: host,
                serverURL: host.dataset.serverUrl,
                path: host.dataset.path || window.location.pathname,
                lang: host.dataset.lang || undefined
            });
            host.dataset.loaded = 'true';
        }).catch(function() {
            host.dataset.loaded = 'false';
            host.dataset.failed = 'true';
        });
    }

    function loadTwikoo(root) {
        var host = root.querySelector ? root.querySelector('#twikoo[data-env-id]') : null;
        if (!isLiveHost(host) || host.dataset.loaded === 'true' || host.dataset.failed === 'true') return;
        host.dataset.loaded = 'loading';
        loadScript('https://cdn.jsdelivr.net/npm/twikoo@1.7.20/dist/twikoo.min.js').then(function() {
            if (!isLiveHost(host)) return;
            if (!window.twikoo || typeof window.twikoo.init !== 'function') throw new Error('Twikoo init is unavailable');
            var options = {
                envId: host.dataset.envId,
                el: host,
                path: host.dataset.path || window.location.pathname,
                lang: host.dataset.lang || undefined
            };
            if (host.dataset.region) options.region = host.dataset.region;
            return window.twikoo.init(options);
        }).then(function() {
            host.dataset.loaded = 'true';
        }).catch(function() {
            host.dataset.loaded = 'false';
            host.dataset.failed = 'true';
        });
    }

    function loadRemark42(root) {
        var host = root.querySelector ? root.querySelector('#remark42[data-host][data-site-id]') : null;
        if (!isLiveHost(host) || host.dataset.loaded === 'true' || host.dataset.failed === 'true') return;
        host.dataset.loaded = 'loading';
        var remarkHost = host.dataset.host.replace(/\/+$/, '');
        var src = remarkHost + '/web/embed.mjs';
        loadScript(src, {type: 'module'}).then(function() {
            if (window.REMARK42 && typeof window.REMARK42.createInstance === 'function') return;
            return new Promise(function(resolve, reject) {
                var timer = window.setTimeout(function() { reject(new Error('Remark42 init timed out')); }, 8000);
                window.addEventListener('REMARK42::ready', function() {
                    window.clearTimeout(timer);
                    resolve();
                }, {once: true});
            });
        }).then(function() {
            if (!isLiveHost(host)) return;
            if (!window.REMARK42 || typeof window.REMARK42.createInstance !== 'function') throw new Error('Remark42 init is unavailable');
            destroyInstance(remark42Instance);
            remark42Instance = window.REMARK42.createInstance({
                node: host,
                host: remarkHost,
                site_id: host.dataset.siteId,
                url: host.dataset.url || window.location.href,
                page_title: host.dataset.pageTitle || document.title,
                locale: host.dataset.locale || 'en',
                theme: host.dataset.theme || 'light',
                components: ['embed']
            });
            host.dataset.loaded = 'true';
        }).catch(function() {
            host.dataset.loaded = 'false';
            host.dataset.failed = 'true';
        });
    }

    function loadComments(root) {
        loadGiscus(root);
        loadWaline(root);
        loadTwikoo(root);
        loadRemark42(root);
    }

    function scheduleCommentLoad(root) {
        cancelCommentSchedule();
        var schedule = function() {
            commentIdleHandle = null;
            commentTimeoutHandle = null;
            loadComments(root);
        };
        if ('requestIdleCallback' in window) {
            commentIdleHandle = window.requestIdleCallback(schedule, {timeout: 2500});
        } else {
            commentTimeoutHandle = window.setTimeout(schedule, 1200);
        }
    }

    document.addEventListener('argon:navigation-start', cleanupCommentInstances);

    document.addEventListener('argon:page-ready', function(event) {
        var root = event.detail && event.detail.root ? event.detail.root : document;
        scheduleCommentLoad(root);
    });
})(window, document);
