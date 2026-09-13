(function(window, document) {
    'use strict';

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        window.jQuery('.hitokoto', root).each(function() {
            var $this = window.jQuery(this);
            if ($this.attr('data-argon-hitokoto-initialized') == 'true') return;
            $this.attr('data-argon-hitokoto-initialized', 'true');
            var loadQuote = function() {
                var element = $this[0];
                if (!element || !element.isConnected || !document.documentElement.contains(element)) return;
                window.jQuery.ajax({
                    type: 'GET',
                    url: 'https://v1.hitokoto.cn',
                    timeout: 5000,
                    success: function(result) {
                        if (element.isConnected && document.documentElement.contains(element)) $this.text(result.hitokoto);
                    },
                    error: function() {
                        if (element.isConnected && document.documentElement.contains(element)) $this.text(window.__('Hitokoto 获取失败'));
                    }
                });
            };
            if ('requestIdleCallback' in window) window.requestIdleCallback(loadQuote, {timeout: 2500});
            else window.setTimeout(loadQuote, 1200);
        });
    }

    window.argonHitokotoInit = init;
})(window, document);
