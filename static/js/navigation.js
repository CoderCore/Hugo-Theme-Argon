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

    function isReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function sameDocumentHash(url) {
        return url.origin === window.location.origin &&
            url.pathname === window.location.pathname &&
            url.search === window.location.search;
    }

    function isNavigableLink(link, event) {
        if (!link || !link.href || event.defaultPrevented || event.button !== 0 ||
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
            return parsePage(url, cachedHtml);
        }

        var requestedUrl = new URL(url, window.location.href);

        if (pendingController) {
            pendingController.abort();
        }
        pendingController = new AbortController();
        var controller = pendingController;
        var response;
        try {
            response = await fetch(url, {
                credentials: 'same-origin',
                signal: controller.signal,
                headers: {'Accept': 'text/html'}
            });
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
        responseUrl.hash = requestedUrl.hash;
        return parsePage(responseUrl.href, html);
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
        var update = function() {
            syncPageChrome(page.document);
            copyPageView(page.view);
            syncCommentButton(page.view);
            if (typeof(window.argonInitPage) === 'function') {
                window.argonInitPage(pageView);
            }
            document.documentElement.classList.add('argon-ready');
        };

        var transition;
        if (document.startViewTransition && !isReducedMotion()) {
            transition = document.startViewTransition(update);
        } else {
            update();
        }

        if (transition) {
            transition.finished.catch(function(){});
        }

        if (mode === 'push') {
            window.history.pushState({argonNavigation: true, url: page.url, scrollY: 0}, '', page.url);
        }
        scrollAfterNavigation(new URL(page.url, window.location.href), state && state.scrollY);
        dispatch('argon:page-ready', {root: pageView, document: page.document, url: page.url, mode: mode});
    }

    async function navigate(url, mode, scrollY) {
        var serial = ++navigationSerial;
        progressStart();
        document.documentElement.setAttribute('aria-busy', 'true');
        dispatch('argon:navigation-start', {url: url, mode: mode});
        try {
            var page = await loadPage(url);
            if (serial !== navigationSerial) {
                return;
            }
            applyPage(page, {scrollY: scrollY}, mode);
        } catch (error) {
            if (error.name !== 'AbortError') {
                window.location.assign(url);
            }
        } finally {
            if (serial === navigationSerial) {
                document.documentElement.removeAttribute('aria-busy');
                progressDone();
                dispatch('argon:navigation-end', {url: url, mode: mode});
            }
        }
    }

    function updateHistoryScroll() {
        if (!window.history.state || !window.history.state.argonNavigation) {
            return;
        }
        window.history.replaceState(Object.assign({}, window.history.state, {scrollY: window.scrollY}), '', window.location.href);
    }

    function boot() {
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
            if (!isNavigableLink(link, event)) {
                return;
            }
            event.preventDefault();
            var url = new URL(link.href, window.location.href);
            updateHistoryScroll();
            navigate(url.href, 'push', 0);
        }, true);

        window.addEventListener('popstate', function(event) {
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
