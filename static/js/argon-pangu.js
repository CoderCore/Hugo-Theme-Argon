(function(window, document) {
    'use strict';

    if (window.argonPanguModuleReady === true) {
        return;
    }

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        var article = root.querySelector('#post_content');
        if (window.argonConfig && window.argonConfig.pangu === true && article &&
            article.getAttribute('data-argon-pangu-initialized') !== 'true' &&
            window.pangu && typeof window.pangu.spacingElementById === 'function') {
            window.pangu.spacingElementById('post_content');
            article.setAttribute('data-argon-pangu-initialized', 'true');
            window.argonPanguModuleReady = true;
        }
    }

    window.argonPanguInit = init;
}(window, document));
