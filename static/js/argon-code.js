(function(window, document) {
    'use strict';

    var codeOfBlocks = {};

    function randomString(len) {
        len = len || 32;
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var result = '';
        for (var i = 0; i < len; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    function getCodeFromBlock(block) {
        if (codeOfBlocks[block.id] !== undefined) {
            return codeOfBlocks[block.id];
        }
        var lines = $('.hljs-ln-code', block);
        var result = '';
        for (var i = 0; i < lines.length; i++) {
            if (i > 0) result += '\n';
            result += lines[i].innerText;
        }
        codeOfBlocks[block.id] = result;
        return result;
    }

    function translate(text) {
        return typeof window.__ === 'function' ? window.__(text) : text;
    }

    function showCopyToast(success) {
        if (typeof window.iziToast === 'undefined') return;
        window.iziToast.show({
            title: translate(success ? '复制成功' : '复制失败'),
            message: translate(success ? '代码已复制到剪贴板' : '请手动复制代码'),
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

    function render(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        if (typeof window.argonEnableCodeHighlight === 'undefined' || !window.argonEnableCodeHighlight) {
            return;
        }
        if (!root.querySelector('article pre > code, article pre.code')) {
            return;
        }
        if (typeof window.hljs === 'undefined' || typeof window.hljs.lineNumbersBlock !== 'function' || typeof window.ClipboardJS === 'undefined') {
            if (typeof window.argonLoadCodeAssets === 'function') {
                window.argonLoadCodeAssets().then(function() {
                    render(root);
                }).catch(function() {});
            }
            return;
        }
        $('article pre.code', root).each(function(index, block) {
            if ($(block).hasClass('no-hljs')) return;
            if ($(block).children('code').length === 0) {
                $(block).html('<code>' + $(block).html() + '</code>');
            }
        });
        $('article pre > code', root).each(function(index, block) {
            if ($(block).hasClass('no-hljs')) return;
            if ($(block).parent().attr('data-argon-highlighted') === 'true') return;
            $(block).parent().attr('id', randomString());
            window.hljs.highlightBlock(block);
            window.hljs.lineNumbersBlock(block, {singleLine: true});
            $(block).parent().addClass('hljs-codeblock');
            $(block).attr('hljs-codeblock-inner', '');
            $(block).parent().attr('data-argon-highlighted', 'true');
            var copyBtnID = 'copy_btn_' + randomString();
            $(block).parent().append('<div class="hljs-control hljs-title">\n' +
                '\t\t\t\t<div class="hljs-control-btn hljs-control-toggle-linenumber" tooltip-hide-linenumber="' + translate('隐藏行号') + '" tooltip-show-linenumber="' + translate('显示行号') + '">\n' +
                '\t\t\t\t\t<i class="fa fa-list"></i>\n' +
                '\t\t\t\t</div>\n' +
                '\t\t\t\t<div class="hljs-control-btn hljs-control-toggle-break-line" tooltip-enable-breakline="' + translate('开启折行') + '" tooltip-disable-breakline="' + translate('关闭折行') + '">\n' +
                '\t\t\t\t\t<i class="fa fa-align-left"></i>\n' +
                '\t\t\t\t</div>\n' +
                '\t\t\t\t<div class="hljs-control-btn hljs-control-copy" id="' + copyBtnID + '" tooltip="' + translate('复制') + '">\n' +
                '\t\t\t\t\t<i class="fa fa-clipboard"></i>\n' +
                '\t\t\t\t</div>\n' +
                '\t\t\t\t<div class="hljs-control-btn hljs-control-fullscreen" tooltip-fullscreen="' + translate('全屏') + '" tooltip-exit-fullscreen="' + translate('退出全屏') + '">\n' +
                '\t\t\t\t\t<i class="fa fa-arrows-alt"></i>\n' +
                '\t\t\t\t</div>\n' +
                '\t\t\t</div>');
            var clipboard = new window.ClipboardJS('#' + copyBtnID, {
                text: function() {
                    return getCodeFromBlock($(block).parent()[0]);
                }
            });
            clipboard.on('success', function() {
                showCopyToast(true);
            });
            clipboard.on('error', function() {
                showCopyToast(false);
            });
        });
    }

    window.argonHighlightJsRender = render;

    $(document).on('click.argonCode', '.hljs-control-fullscreen', function() {
        var block = $(this).parent().parent();
        block.toggleClass('hljs-codeblock-fullscreen');
        if (block.hasClass('hljs-codeblock-fullscreen')) {
            $('html').addClass('noscroll codeblock-fullscreen');
        } else {
            $('html').removeClass('noscroll codeblock-fullscreen');
        }
    });
    $(document).on('click.argonCode', '.hljs-control-toggle-break-line', function() {
        $(this).parent().parent().toggleClass('hljs-break-line');
    });
    $(document).on('click.argonCode', '.hljs-control-toggle-linenumber', function() {
        $(this).parent().parent().toggleClass('hljs-hide-linenumber');
    });
})(window, document);
