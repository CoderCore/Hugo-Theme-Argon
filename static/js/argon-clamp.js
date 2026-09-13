(function(window, document) {
    'use strict';

    if (window.argonClampModuleReady === true) {
        return;
    }

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        if (!window.jQuery || typeof window.jQuery.fn !== 'object' ||
            typeof window.$clamp !== 'function') {
            return;
        }
        window.jQuery('.clamp', root).each(function(index, dom) {
            if (dom.getAttribute('data-argon-clamp-initialized') === 'true') {
                return;
            }
            window.$clamp(dom, {clamp: dom.getAttribute('clamp-line')});
            dom.setAttribute('data-argon-clamp-initialized', 'true');
        });
        window.argonClampModuleReady = true;
    }

    window.argonClampInit = init;
}(window, document));
