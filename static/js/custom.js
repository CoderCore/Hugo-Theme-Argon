/* 主题扩展入口：跨路径导航也会触发，避免依赖已移除的 PJAX 响应对象。 */
document.addEventListener('argon:page-ready', function(event) {
    if (typeof(window.argonCustomPageLoaded) == 'function') {
        window.argonCustomPageLoaded(event.detail || {});
    }
    if (window.argonCustomComments && typeof(window.argonCustomComments.init) == 'function') {
        window.argonCustomComments.init((event.detail && event.detail.root) || document);
    } else if (window.argonCustomComments && typeof(window.argonCustomComments.refreshPreviewCommentCounts) == 'function') {
        window.argonCustomComments.refreshPreviewCommentCounts((event.detail && event.detail.root) || document);
    }
});

(function(window) {
    'use strict';

    /*
     * 评论实现由 argon-comments.js 提供；这里保留可被站点覆盖的扩展对象。
     */
    window.argonCustomComments = window.argonCustomComments || {
        init: function() {},
        destroy: function() {}
    };
})(window);
