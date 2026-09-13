(function(window, document) {
    'use strict';

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        var toast = window.jQuery('#primary #post_outdate_toast', root);
        if (toast.length === 0 || typeof window.iziToast === 'undefined') return;
        window.iziToast.show({
            title: '',
            message: toast.data('text'),
            class: 'shadow-sm',
            position: 'topRight',
            backgroundColor: 'var(--themecolor)',
            titleColor: '#ffffff',
            messageColor: '#ffffff',
            iconColor: '#ffffff',
            progressBarColor: '#ffffff',
            icon: 'fa fa-info',
            close: false,
            timeout: 8000
        });
        toast.remove();
    }

    window.argonOutdateToastInit = init;
})(window, document);
