(function(window, document) {
    'use strict';

    if (window.argonZoomifyModuleReady === true) {
        return;
    }

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        if (!window.jQuery || typeof window.jQuery.fn !== 'object' ||
            typeof window.jQuery.fn.zoomify !== 'function' ||
            !window.argonConfig || window.argonConfig.zoomify === false) {
            return;
        }
        window.jQuery('#post_content img', root).filter(function() {
            return window.jQuery(this).data('argon-zoomify-initialized') !== true;
        }).each(function() {
            window.jQuery(this).zoomify(window.argonConfig.zoomify);
            window.jQuery(this).data('argon-zoomify-initialized', true);
        });
        window.argonZoomifyModuleReady = true;
    }

    window.argonZoomifyInit = init;
}(window, document));
