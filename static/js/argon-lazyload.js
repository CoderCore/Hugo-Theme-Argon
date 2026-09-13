(function(window, document) {
    'use strict';

    if (window.argonLazyloadModuleReady === true) {
        return;
    }

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        if (!window.jQuery || typeof window.jQuery.fn !== 'object' ||
            typeof window.jQuery.fn.lazyload !== 'function' ||
            !window.argonConfig || window.argonConfig.lazyload === false) {
            return;
        }
        if (window.argonConfig.lazyload.effect === 'none') {
            delete window.argonConfig.lazyload.effect;
        }
        var imageSelector = 'article img.lazyload:not(.lazyload-loaded), ' +
            '.post-thumbnail.lazyload:not(.lazyload-loaded), ' +
            '.related-post-thumbnail.lazyload:not(.lazyload-loaded)';
        var $images = window.jQuery(imageSelector, root).filter(function() {
            return window.jQuery(this).data('argon-lazyload-initialized') !== true;
        });
        if ($images.length > 0) {
            $images.data('argon-lazyload-initialized', true);
            $images.lazyload(Object.assign(window.argonConfig.lazyload, {
                load: function() { window.jQuery(this).addClass('lazyload-loaded'); }
            }));
        }
        var $stickers = window.jQuery('.comment-item-text .comment-sticker.lazyload', root)
            .filter(function() {
                return window.jQuery(this).data('argon-lazyload-initialized') !== true;
            });
        if ($stickers.length > 0) {
            $stickers.data('argon-lazyload-initialized', true);
            $stickers.lazyload(Object.assign(window.argonConfig.lazyload, {
                load: function() { window.jQuery(this).removeClass('lazyload'); }
            }));
        }
        window.argonLazyloadModuleReady = true;
    }

    window.argonLazyloadInit = init;
}(window, document));
