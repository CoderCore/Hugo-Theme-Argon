(function(window, document) {
    'use strict';

    if (window.argonCommentImageModuleReady === true) {
        return;
    }

    var intervalId = 0;
    var activeImage = null;
    var selector = '.comment-item-text .comment-image';

    function clearActiveImage() {
        if (intervalId) {
            window.clearInterval(intervalId);
            intervalId = 0;
        }
        if (activeImage) {
            window.jQuery(activeImage).removeClass('comment-image-preview-zoomed');
            activeImage = null;
        }
    }

    function handleClick() {
        var $image = window.jQuery(this);
        var $preview = window.jQuery('.comment-image-preview', this);
        $preview.attr('data-easing', 'cubic-bezier(0.4, 0, 0, 1)');
        $preview.attr('data-duration', '500');

        if (!$image.hasClass('comment-image-preview-zoomed')) {
            activeImage = this;
            $image.addClass('comment-image-preview-zoomed');
            if (!$image.hasClass('loaded')) {
                $preview.attr('src', $image.attr('data-src'));
            }
            if (typeof window.jQuery.fn.zoomify === 'function') {
                $preview.zoomify('zoomIn');
            }
            if (!$image.hasClass('loaded')) {
                intervalId = window.setInterval(function() {
                    if (activeImage && activeImage.width !== 0) {
                        window.jQuery('html').trigger('scroll');
                        window.jQuery(activeImage).addClass('loaded');
                        window.clearInterval(intervalId);
                        intervalId = 0;
                        activeImage = null;
                    }
                }, 50);
            }
            return;
        }

        clearActiveImage();
        if (typeof window.jQuery.fn.zoomify === 'function') {
            $preview.zoomify('zoomOut');
        }
    }

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        if (!root.querySelector(selector)) {
            return;
        }
        if (window.jQuery && typeof window.jQuery.fn === 'object') {
            window.jQuery(document).off('click.argonCommentImage', selector)
                .on('click.argonCommentImage', selector, handleClick);
            document.addEventListener('argon:navigation-start', clearActiveImage);
            window.argonCommentImageModuleReady = true;
        }
    }

    window.argonCommentImageInit = init;
}(window, document));
