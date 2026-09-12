(function(window, document) {
    'use strict';

    var pageView = document.getElementById('page-view');
    if (!pageView) {
        return;
    }

    var config = window.argonConfig || {};
    var cache = new Map();
    var pendingController = null;
    var navigationSerial = 0;
    var cacheLifetime = 5 * 60 * 1000;
    var managedHtmlClasses = ['banner-is-fullscreen', 'banner-is-hidden'];
    var navigationDebugKey = 'argon_navigation_debug';
    var navigationDebug = false;
    var navigationLogBuffer = [];

    try {
        navigationDebug = new URLSearchParams(window.location.search).get('argonNavDebug') === '1' ||
            window.localStorage.getItem(navigationDebugKey) === '1';
    } catch (error) {
        navigationDebug = false;
    }

    function navigationLog(eventName, detail) {
        if (!navigationDebug || !window.console || typeof window.console.info !== 'function') {
            return;
        }
        var payload = Object.assign({
            event: eventName,
            href: window.location.href,
            serial: navigationSerial,
            time: new Date().toISOString()
        }, detail || {});
        navigationLogBuffer.push(payload);
        if (navigationLogBuffer.length > 300) {
            navigationLogBuffer.shift();
        }
        window.console.info('[Argon navigation]', eventName, payload);
    }

    window.argonNavigationDebug = {
        enable: function() {
            navigationDebug = true;
            try { window.localStorage.setItem(navigationDebugKey, '1'); } catch (error) {}
            navigationLog('debug-enabled');
        },
        disable: function() {
            navigationDebug = false;
            try { window.localStorage.removeItem(navigationDebugKey); } catch (error) {}
        },
        getLogs: function() {
            return navigationLogBuffer.slice();
        },
        clearLogs: function() {
            navigationLogBuffer.length = 0;
        }
    };

    function dispatch(name, detail) {
        document.dispatchEvent(new CustomEvent(name, {detail: detail || {}}));
    }

    function progressStart() {
        if (window.NProgress) {
            window.NProgress.start();
        }
    }

    function progressDone() {
        if (window.NProgress) {
            window.NProgress.done();
        }
    }

    function sameDocumentHash(url) {
        return url.origin === window.location.origin &&
            url.pathname === window.location.pathname &&
            url.search === window.location.search;
    }

    function isNavigableLink(link, event) {
        // This handler is the single owner of same-origin page navigation.
        // Another UI listener may have called preventDefault() earlier in the
        // capture phase; that must not make the address bar randomly stay put.
        if (!link || !link.href || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return false;
        }
        if (link.hasAttribute('no-pjax') || link.classList.contains('no-pjax') ||
            link.hasAttribute('download') || (link.target && link.target !== '_self')) {
            return false;
        }
        var url;
        try {
            url = new URL(link.href, window.location.href);
        } catch (error) {
            return false;
        }
        if (url.origin !== window.location.origin || url.protocol !== window.location.protocol) {
            return false;
        }
        if (sameDocumentHash(url)) {
            return false;
        }
        return url.protocol === 'http:' || url.protocol === 'https:';
    }

    function cacheGet(url) {
        var item = cache.get(url);
        if (!item) {
            return null;
        }
        if (Date.now() - item.created > cacheLifetime) {
            cache.delete(url);
            return null;
        }
        return item.html;
    }

    function cacheSet(url, html) {
        cache.set(url, {created: Date.now(), html: html});
        if (cache.size > 20) {
            cache.delete(cache.keys().next().value);
        }
    }

    function parsePage(url, html) {
        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var nextView = parsed.getElementById('page-view');
        if (!nextView) {
            throw new Error('The response does not contain #page-view');
        }
        return {url: url, document: parsed, view: nextView};
    }

    async function loadPage(url) {
        var cachedHtml = cacheGet(url);
        if (cachedHtml) {
            navigationLog('cache-hit', {url: url});
            return parsePage(url, cachedHtml);
        }

        var requestedUrl = new URL(url, window.location.href);

        if (pendingController) {
            navigationLog('abort-previous-request', {url: url});
            pendingController.abort();
        }
        pendingController = new AbortController();
        var controller = pendingController;
        var response;
        try {
            navigationLog('request-start', {url: requestedUrl.href});
            response = await fetch(url, {
                credentials: 'same-origin',
                signal: controller.signal,
                headers: {'Accept': 'text/html'}
            });
            navigationLog('request-response', {url: requestedUrl.href, status: response.status, ok: response.ok});
        } catch (error) {
            navigationLog('request-error', {url: requestedUrl.href, name: error.name, message: error.message});
            throw error;
        } finally {
            if (pendingController === controller) {
                pendingController = null;
            }
        }
        var responseUrl = new URL(response.url, window.location.href);
        if (!response.ok || responseUrl.origin !== window.location.origin) {
            throw new Error('Navigation request failed');
        }
        var html = await response.text();
        cacheSet(url, html);
        navigationLog('request-parsed', {url: requestedUrl.href, bytes: html.length});
        return parsePage(requestedUrl.href, html);
    }

    function copyPageView(nextView) {
        var fragment = document.createDocumentFragment();
        Array.prototype.forEach.call(nextView.childNodes, function(node) {
            fragment.appendChild(node.cloneNode(true));
        });
        pageView.replaceChildren(fragment);
    }

    function replaceMeta(nextDocument, selector) {
        var current = document.head.querySelector(selector);
        var next = nextDocument.head.querySelector(selector);
        if (current && next) {
            current.replaceWith(next.cloneNode(true));
        } else if (!current && next) {
            document.head.appendChild(next.cloneNode(true));
        } else if (current && !next) {
            current.remove();
        }
    }

    function syncPageChrome(nextDocument) {
        var nextHtml = nextDocument.documentElement;
        managedHtmlClasses.forEach(function(className) {
            document.documentElement.classList.toggle(className, nextHtml.classList.contains(className));
        });

        var currentBanner = document.getElementById('banner');
        var nextBanner = nextDocument.getElementById('banner');
        if (currentBanner && nextBanner) {
            currentBanner.replaceWith(nextBanner.cloneNode(true));
        } else if (currentBanner && !nextBanner) {
            currentBanner.remove();
        } else if (!currentBanner && nextBanner) {
            var content = document.getElementById('content');
            if (content) {
                content.parentNode.insertBefore(nextBanner.cloneNode(true), content);
            }
        }

        replaceMeta(nextDocument, 'meta[name="description"]');
        replaceMeta(nextDocument, 'meta[property="og:title"]');
        replaceMeta(nextDocument, 'meta[property="og:description"]');
        replaceMeta(nextDocument, 'meta[property="og:type"]');
        replaceMeta(nextDocument, 'meta[property="og:url"]');
        replaceMeta(nextDocument, 'meta[property="og:image"]');
        replaceMeta(nextDocument, 'meta[name="twitter:card"]');
        replaceMeta(nextDocument, 'meta[name="twitter:title"]');
        replaceMeta(nextDocument, 'meta[name="twitter:description"]');
        replaceMeta(nextDocument, 'meta[name="twitter:image"]');
        replaceMeta(nextDocument, 'link[rel="canonical"]');
        document.title = nextDocument.title || document.title;
    }

    function syncCommentButton(nextView) {
        var button = document.getElementById('fabtn_go_to_comment');
        if (!button) {
            return;
        }
        button.classList.toggle('d-none', !nextView.querySelector('#post_comment, #comments'));
    }

    function repairUrl(url, mode) {
        var target = new URL(url, window.location.href);
        if (target.href === window.location.href) {
            return;
        }
        var previousUrl = window.location.href;
        navigationLog('url-mismatch', {from: previousUrl, to: target.href, mode: mode});
        try {
            window.history.replaceState(Object.assign({}, window.history.state || {}, {
                argonNavigation: true,
                url: target.href,
                scrollY: 0
            }), '', target.href);
            navigationLog('url-repaired', {
                from: previousUrl,
                to: window.location.href,
                mode: mode,
                repaired: window.location.href === target.href
            });
        } catch (error) {
            navigationLog('url-repair-failed', {
                from: previousUrl,
                to: target.href,
                mode: mode,
                name: error.name,
                message: error.message
            });
        }
    }

    function scrollAfterNavigation(url, scrollY) {
        if (url.hash) {
            var target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
            if (target) {
                target.scrollIntoView();
                return;
            }
        }
        window.scrollTo(0, typeof(scrollY) === 'number' ? scrollY : 0);
    }

    function applyPage(page, state, mode) {
        repairUrl(page.url, mode);
        navigationLog('apply-start', {url: page.url, mode: mode});
        var update = function() {
            syncPageChrome(page.document);
            copyPageView(page.view);
            syncCommentButton(page.view);
            if (typeof(window.argonInitPage) === 'function') {
                window.argonInitPage(pageView);
            }
            document.documentElement.classList.add('argon-ready');
        };

        /*
         * The View Transition API creates a full-viewport pseudo-element
         * above the document while it animates. That layer wins hit-testing,
         * so a quick click on the next link can be delivered to <html>
         * instead of the link and leave the URL unchanged. Page navigation
         * must remain interactive, therefore replace the view synchronously.
         */
        update();

        scrollAfterNavigation(new URL(page.url, window.location.href), state && state.scrollY);
        navigationLog('apply-finished', {url: page.url, mode: mode});
        dispatch('argon:page-ready', {root: pageView, document: page.document, url: page.url, mode: mode});
    }

    async function navigate(url, mode, scrollY) {
        var serial = ++navigationSerial;
        navigationLog('navigation-start', {url: url, mode: mode, scrollY: scrollY});
        progressStart();
        document.documentElement.setAttribute('aria-busy', 'true');
        dispatch('argon:navigation-start', {url: url, mode: mode});
        try {
            var page = await loadPage(url);
            if (serial !== navigationSerial) {
                navigationLog('navigation-stale', {url: url, mode: mode, requestSerial: serial});
                return;
            }
            applyPage(page, {scrollY: scrollY}, mode);
        } catch (error) {
            navigationLog('navigation-error', {url: url, mode: mode, name: error.name, message: error.message});
            if (error.name !== 'AbortError') {
                window.location.assign(url);
            }
        } finally {
            if (serial === navigationSerial) {
                document.documentElement.removeAttribute('aria-busy');
                progressDone();
                dispatch('argon:navigation-end', {url: url, mode: mode});
                navigationLog('navigation-end', {url: url, mode: mode});
            }
        }
    }

    var historyScrollTimer = null;
    var historyScrollDelay = 120;

    function writeHistoryScroll() {
        var state = window.history.state;
        if (!state || !state.argonNavigation) {
            return;
        }

        var scrollY = window.scrollY;
        var href = window.location.href;
        if (state.url === href && state.scrollY === scrollY) {
            return;
        }

        try {
            window.history.replaceState(Object.assign({}, state, {
                url: href,
                scrollY: scrollY
            }), '', href);
        } catch (error) {
            navigationLog('history-scroll-failed', {
                name: error.name,
                message: error.message
            });
        }
    }

    function cancelHistoryScroll() {
        if (historyScrollTimer) {
            window.clearTimeout(historyScrollTimer);
            historyScrollTimer = null;
        }
    }

    function updateHistoryScroll(flush) {
        if (flush) {
            cancelHistoryScroll();
            writeHistoryScroll();
            return;
        }

        // Scrolling can emit one event per animation frame. Wait until the
        // burst ends so Chromium does not throttle a replaceState call every
        // frame (clicks flush this timer before changing the URL).
        if (historyScrollTimer) {
            window.clearTimeout(historyScrollTimer);
        }
        historyScrollTimer = window.setTimeout(function() {
            historyScrollTimer = null;
            writeHistoryScroll();
        }, historyScrollDelay);
    }

    function boot() {
        navigationLog('boot', {url: window.location.href, readyState: document.readyState});
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        var initialState = Object.assign({}, window.history.state || {}, {
            argonNavigation: true,
            url: window.location.href,
            scrollY: window.scrollY
        });
        window.history.replaceState(initialState, '', window.location.href);
        if (typeof(window.argonInitPage) === 'function') {
            window.argonInitPage(pageView);
        }
        document.documentElement.classList.add('argon-ready');
        dispatch('argon:page-ready', {root: pageView, document: document, url: window.location.href, mode: 'initial'});

        if (config.disable_pjax === true) {
            return;
        }

        document.addEventListener('click', function(event) {
            var link = event.target.closest ? event.target.closest('a[href]') : null;
            navigationLog('click-seen', {
                target: link ? link.href : null,
                defaultPrevented: event.defaultPrevented,
                button: event.button
            });
            if (!isNavigableLink(link, event)) {
                navigationLog('click-ignored', {target: link ? link.href : null});
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            var url = new URL(link.href, window.location.href);
            var previousUrl = window.location.href;
            updateHistoryScroll(true);
            // Commit the URL before the asynchronous fetch so the address bar
            // always follows the user's click, even while the page is loading.
            window.history.pushState({argonNavigation: true, url: url.href, scrollY: 0}, '', url.href);
            navigationLog('click-accepted', {
                from: previousUrl,
                to: url.href,
                urlAfterPush: window.location.href,
                historyChanged: previousUrl !== window.location.href
            });
            navigate(url.href, 'push', 0);
        }, true);

        window.addEventListener('popstate', function(event) {
            // A delayed write belongs to the entry we just left. Do not let
            // it overwrite the scroll position of the entry being restored.
            cancelHistoryScroll();
            navigationLog('popstate', {
                state: event.state,
                url: window.location.href
            });
            navigate(window.location.href, 'pop', event.state && event.state.argonNavigation ? event.state.scrollY : 0);
        });

        var scrollFrame = null;
        window.addEventListener('scroll', function() {
            if (scrollFrame) {
                return;
            }
            scrollFrame = window.requestAnimationFrame(function() {
                scrollFrame = null;
                updateHistoryScroll();
            });
        }, {passive: true});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, {once: true});
    } else {
        boot();
    }
})(window, document);
