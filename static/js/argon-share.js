(function(window, document) {
    'use strict';

    function translate(text) {
        return typeof window.__ === 'function' ? window.__(text) : text;
    }

    function showCopyToast(success) {
        if (typeof window.iziToast === 'undefined') return;
        window.iziToast.show({
            title: success ? translate('链接已复制') : translate('复制失败'),
            message: success ? translate('链接已复制到剪贴板') : translate('请手动复制链接'),
            class: 'shadow',
            position: 'topRight',
            backgroundColor: success ? '#2dce89' : '#f5365c',
            titleColor: '#ffffff',
            messageColor: '#ffffff',
            iconColor: '#ffffff',
            progressBarColor: '#ffffff',
            icon: success ? 'fa fa-check' : 'fa fa-close',
            timeout: 5000
        });
    }

    if (typeof window.jQuery === 'function') {
        window.jQuery(document).on('click.argonShare', '#share_show', function() {
            window.jQuery(this).closest('#share_container').addClass('opened');
        });
        window.jQuery(document).on('click.argonShare', '#share_copy_link', function(event) {
            event.preventDefault();
            var input = document.createElement('input');
            document.body.appendChild(input);
            input.setAttribute('value', window.location.href);
            input.setAttribute('readonly', 'readonly');
            input.style.opacity = '0';
            input.style.pointerEvents = 'none';
            input.select();
            var success = false;
            try {
                success = document.execCommand('copy');
            } catch (err) {}
            document.body.removeChild(input);
            showCopyToast(success);
        });
    }

    window.argonShareModuleReady = true;
})(window, document);
