(function(window, document) {
    'use strict';

    if (window.argonBannerModuleReady === true) {
        return;
    }

    function typeEffect(element, text, now, interval) {
        element.classList.add('typing-effect');
        if (now > text.length) {
            window.setTimeout(function() {
                element.classList.remove('typing-effect');
            }, 1000 - ((interval * now) % 1000) - 50);
            return;
        }
        element.innerText = text.substring(0, now);
        window.setTimeout(function() {
            typeEffect(element, text, now + 1, interval);
        }, interval);
    }

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        var bannerTitle = root.querySelector('.banner-title[data-text]');
        if (!bannerTitle) {
            return;
        }
        var bannerInner = bannerTitle.querySelector('.banner-title-inner');
        if (!bannerInner || bannerTitle.getAttribute('data-argon-typing-initialized') === 'true') {
            return;
        }
        bannerTitle.setAttribute('data-argon-typing-initialized', 'true');
        typeEffect(
            bannerInner,
            bannerTitle.getAttribute('data-text') || '',
            0,
            parseInt(bannerTitle.getAttribute('data-interval') || '100', 10)
        );
        window.argonBannerModuleReady = true;
    }

    window.argonBannerInit = init;
}(window, document));
