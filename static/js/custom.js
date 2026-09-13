/* 主题扩展入口：跨路径导航也会触发，避免依赖已移除的 PJAX 响应对象。 */
document.addEventListener('argon:page-ready', function(event) {
    if (typeof(window.argonCustomPageLoaded) == 'function') {
        window.argonCustomPageLoaded(event.detail || {});
    }
});

(function(window) {
    'use strict';

    /*
     * TODO: 自建评论系统接口占位。
     * 后续由自建 Worker/D1 系统定义评论列表、GitHub 登录、发表评论、回复、分页和管理接口。
     * 当前不加载或请求任何第三方评论服务。
     */
    window.argonCustomComments = window.argonCustomComments || {
        init: function() {},
        destroy: function() {}
    };
})(window);
