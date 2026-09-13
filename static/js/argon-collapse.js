(function(window, document) {
    'use strict';

    if (window.argonCollapseModuleReady === true) {
        return;
    }

    var selector = '.collapse-block .collapse-block-title';

    function handleToggle(event) {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') {
            return;
        }
        if (event.type === 'keydown') {
            event.preventDefault();
        }

        var $title = window.jQuery(this);
        var $collapse = $title.closest('.collapse-block');
        if (!$collapse.length) {
            return;
        }

        $collapse.toggleClass('collapsed');
        var expanded = !$collapse.hasClass('collapsed');
        $title.attr('aria-expanded', expanded ? 'true' : 'false');
        var $body = $collapse.find('.collapse-block-body');
        if (expanded) {
            $body.stop(true, false).slideDown(200);
        } else {
            $body.stop(true, false).slideUp(200);
        }
        window.jQuery('html').trigger('scroll');
    }

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        if (!root.querySelector('.collapse-block')) {
            return;
        }
        if (window.jQuery && typeof window.jQuery.fn === 'object') {
            window.jQuery(document).off('click.argonCollapse keydown.argonCollapse', selector)
                .on('click.argonCollapse keydown.argonCollapse', selector, handleToggle);
            window.argonCollapseModuleReady = true;
        }
    }

    window.argonCollapseInit = init;
}(window, document));
