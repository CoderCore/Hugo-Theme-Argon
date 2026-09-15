(function(window, document) {
    'use strict';

    var activeSections = [];
    var pageSize = 20;
    var emotionGroups = [
        {name: '颜文字', items: ['|´・ω・)ノ', 'ヾ(≧∇≦*)ゝ', '(☆ω☆)', '（╯‵□′）╯︵┴─┴', '￣﹃￣', '(/ω\\＼)', '∠( ᐛ 」∠)＿', '(๑•̀ㅁ•́ฅ)', '→_→', '୧(๑•̀⌄•́๑)૭', '٩(ˊᗜˋ*)و', '(ノ°ο°)ノ', '(´இ皿இ｀)', '⌇●﹏●⌇', '(ฅ´ω`ฅ)', '(╯°A°)╯︵○○○', 'φ(￣∇￣o)', 'ヾ(´･ ･｀｡)ノ"', '( ง ᵒ̌皿ᵒ̌)ง⁼³₌₃', '(ó﹏ò｡)', 'Σ(っ °Д °;)っ', '( ,,´･ω･)ﾉ"(´っω･｀｡)', '╮(╯▽╰)╭', 'o(*////▽////*)q', '＞﹏＜', '( ๑´•ω•) "(ㆆᴗㆆ)']},
        {name: 'Emoji', items: ['😂', '😀', '😅', '😊', '🙂', '🙃', '😌', '😍', '😘', '😜', '😝', '😏', '😒', '🙄', '😳', '😡', '😔', '😫', '😱', '😭', '💩', '👻', '🙌', '🖕', '👍', '👫', '👬', '👭', '🌚', '🌝', '🙈', '💊', '😶', '🙏', '🍦', '🍉', '😣']},
        {name: '小恐龙', stickers: 'dinosaur', count: 16},
        {name: '花!', stickers: 'flower', count: 14, description: 'Source: github.com/k4yt3x/flowerhd'}
    ];
    var stickerSources = Object.create(null);
    emotionGroups.forEach(function(group) {
        if (!group.stickers) return;
        var names = group.stickers === 'dinosaur' ? ['shy', 'daze', 'sweat', 'proud', 'powerless', 'pouting', 'eating', 'ok', 'doubt', 'depressed', 'close-eyes', 'sleeping', 'puzzled', 'agree', 'crazy', 'angry'] : ['flower', 'grass', 'leaf', 'star', 'sun', 'moon', 'water', 'heihei', 'lemon', 'birthday', 'sea', 'vegetable', 'tile', 'utf'];
        for (var index = 1; index <= group.count; index += 1) stickerSources[group.stickers + '-' + names[index - 1]] = '/stickers/' + group.stickers + '/' + index + '.jpg';
    });

    function isChinese() {
        return (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
    }

    function message(name, value) {
        var messages = isChinese() ? {
            loading: '正在加载评论…',
            empty: '暂无评论，来留下第一条吧。',
            failed: '评论加载失败，请稍后重试。',
            sending: '正在发表…',
            sent: '评论已发表。',
            sendFailed: '评论发表失败，请检查内容后重试。',
            reply: '回复',
            replying: '正在回复评论',
            cancelReply: '取消回复',
            anonymous: '访客',
            commentLogin: '使用 GitHub 登录',
            commentLogout: '退出登录',
            commentLoggedIn: '已登录 GitHub：%s',
            commentLoginRequired: '请先使用 GitHub 登录后再发表评论',
            commentGuestMode: '当前以访客身份发表评论',
            commentAuthFailed: 'GitHub 登录状态获取失败，请稍后重试',
            commentCount: '%s',
             commentLoginToVoteTitle: '需要登录',
             commentLoginToVote: '请先使用 GitHub 登录后再点赞',
             commentPolicyTitle: '评论权限',
            commentEdit: '编辑',
            commentDelete: '删除',
            commentConfirmDelete: '确认删除',
            commentCancelDelete: '取消',
            commentSave: '保存',
            commentCancel: '取消',
            commentEdited: '已编辑',
            commentDeleted: '评论已删除。',
            commentEditFailed: '评论编辑失败，请稍后重试。',
            commentDeleteFailed: '评论删除失败，请稍后重试。',
             commentVoteFailed: '点赞失败，请稍后重试。',
             commentDeletedLabel: '评论已删除',
             commentBlocked: '你的账号已被加入评论黑名单。',
             commentWhitelistRequired: '当前仅允许评论白名单中的 GitHub 用户操作。',
             commentPrivate: '悄悄话',
             commentPrivateHidden: '该评论为悄悄话',
             commentAnonymous: '匿名显示',
             commentHistory: '编辑记录',
             commentHistoryTitle: '评论 #%s 的编辑记录',
             commentHistoryEmpty: '暂无编辑记录。',
             commentPrivateParent: '悄悄话只能回复自己的私密评论。',
             commentExpand: '展开'
        } : {
            loading: 'Loading comments…',
            empty: 'No comments yet. Be the first to comment.',
            failed: 'Comments could not be loaded. Please try again later.',
            sending: 'Posting…',
            sent: 'Comment posted.',
            sendFailed: 'Comment could not be posted. Check the form and try again.',
            reply: 'Reply',
            replying: 'Replying to a comment',
            cancelReply: 'Cancel reply',
            anonymous: 'Visitor',
            commentLogin: 'Sign in with GitHub',
            commentLogout: 'Sign out',
            commentLoggedIn: 'Signed in with GitHub: %s',
            commentLoginRequired: 'Sign in with GitHub before posting a comment',
            commentGuestMode: 'Posting as a guest',
            commentAuthFailed: 'Could not load GitHub login state. Please try again.',
            commentCount: '%s',
             commentLoginToVoteTitle: 'Sign in required',
             commentLoginToVote: 'Sign in with GitHub before upvoting',
             commentPolicyTitle: 'Comment permissions',
            commentEdit: 'Edit',
            commentDelete: 'Delete',
            commentConfirmDelete: 'Confirm',
            commentCancelDelete: 'Cancel',
            commentSave: 'Save',
            commentCancel: 'Cancel',
            commentEdited: 'Edited',
            commentDeleted: 'Comment deleted.',
            commentEditFailed: 'Could not edit the comment. Please try again.',
            commentDeleteFailed: 'Could not delete the comment. Please try again.',
             commentVoteFailed: 'Could not upvote the comment. Please try again.',
             commentDeletedLabel: 'Comment deleted',
             commentBlocked: 'Your account is blocked from comment actions.',
             commentWhitelistRequired: 'Only GitHub users on the comment whitelist may perform comment actions.',
             commentPrivate: 'Private',
             commentPrivateHidden: 'This is a private comment',
             commentAnonymous: 'Post anonymously',
             commentHistory: 'Edit history',
             commentHistoryTitle: 'Edit history for comment #%s',
             commentHistoryEmpty: 'No edit history.',
             commentPrivateParent: 'Private comments can only be replied to by their owner.',
             commentExpand: 'Show more'
        };
        var replacement = value === undefined || value === null ? '' : value;
        return (messages[name] || name).replace('%s', replacement);
    }

    function setStatus(section, text, isError) {
        var status = section.querySelector('.argon-comments-status');
        if (!status) return;
        status.textContent = text || '';
        status.classList.toggle('text-danger', !!isError);
    }

    function showLoginRequiredToast(text, title) {
        if (typeof window.iziToast === 'undefined') return;
        window.iziToast.show({
            title: title || message('commentLoginToVoteTitle'),
            message: text,
            class: 'shadow',
            position: 'topRight',
            backgroundColor: '#f5365c',
            titleColor: '#ffffff',
            messageColor: '#ffffff',
            iconColor: '#ffffff',
            progressBarColor: '#ffffff',
            icon: 'fa fa-lock',
            timeout: 5000
        });
    }

    function clearReply(state) {
        if (!state) return;
        if (state.form && state.form.elements.parentId) state.form.elements.parentId.value = '';
        if (state.replyText) state.replyText.textContent = '';
        if (state.replyPreview) state.replyPreview.textContent = '';
        if (state.replyNotice) state.replyNotice.hidden = true;
    }

    function updateCommentActions(state) {
        var loggedIn = !!(state && state.user);
        var operations = state && state.section ? state.section.querySelectorAll('.comment-operations') : [];
        Array.prototype.forEach.call(operations, function(container) {
            container.hidden = !loggedIn;
        });
    }

    function updateCommentCount(postPath, total) {
        var count = Number(total);
        if (!Number.isFinite(count) || count < 0) count = 0;
        var nodes = document.querySelectorAll('[data-comment-count]');
        Array.prototype.forEach.call(nodes, function(node) {
            if (node.getAttribute('data-comment-count-id') !== postPath) return;
            var value = node.querySelector('[data-comment-count-value]');
            if (value) value.textContent = message('commentCount', count);
            node.hidden = false;
            node.setAttribute('aria-hidden', 'false');
        });
        if (typeof window.argonSyncMetaDividers === 'function') {
            window.argonSyncMetaDividers(document);
        }
    }

    function refreshPreviewCommentCounts(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        var nodes = Array.prototype.filter.call(root.querySelectorAll(
            '[data-comment-count][data-comment-count-id][data-comment-count-endpoint]'
        ), function(node) {
            return !!node.closest('[data-argon-article-preview]') &&
                node.getAttribute('data-comment-count-loaded') !== 'true' &&
                node.getAttribute('data-comment-count-loading') !== 'true';
        });
        var groups = Object.create(null);
        nodes.forEach(function(node) {
            var endpoint = (node.getAttribute('data-comment-count-endpoint') || '').trim();
            var postPath = node.getAttribute('data-comment-count-id') || '';
            if (!endpoint || !postPath) return;
            if (!groups[endpoint]) groups[endpoint] = {nodes: [], ids: []};
            groups[endpoint].nodes.push(node);
            if (groups[endpoint].ids.indexOf(postPath) < 0) groups[endpoint].ids.push(postPath);
            node.setAttribute('data-comment-count-loading', 'true');
        });

        var requests = Object.keys(groups).map(function(endpoint) {
            var group = groups[endpoint];
            var chunks = [];
            for (var start = 0; start < group.ids.length; start += 100) {
                chunks.push(group.ids.slice(start, start + 100));
            }
            return Promise.all(chunks.map(function(chunk) {
                var requestUrl = new URL(endpoint.replace(/\/+$/, '') + '/counts', window.location.href);
                requestUrl.search = '';
                requestUrl.hash = '';
                chunk.forEach(function(postPath) { requestUrl.searchParams.append('post', postPath); });
                return fetch(requestUrl.href, {
                    headers: {Accept: 'application/json'},
                    credentials: 'omit'
                }).then(parseResponse);
            })).then(function(results) {
                var values = Object.create(null);
                results.forEach(function(data) {
                    if (!data || !data.counts || typeof data.counts !== 'object') return;
                    Object.keys(data.counts).forEach(function(postPath) {
                        values[postPath] = data.counts[postPath];
                    });
                });
                group.nodes.forEach(function(node) {
                    var postPath = node.getAttribute('data-comment-count-id') || '';
                    if (!Object.prototype.hasOwnProperty.call(values, postPath)) return;
                    var count = Number(values[postPath]);
                    if (!Number.isFinite(count) || count < 0) count = 0;
                    var value = node.querySelector('[data-comment-count-value]');
                    if (value) value.textContent = message('commentCount', count);
                    node.hidden = false;
                    node.setAttribute('aria-hidden', 'false');
                    node.setAttribute('data-comment-count-loaded', 'true');
                });
            }).catch(function(error) {
                console.warn('Argon preview comment counts failed', error);
            }).finally(function() {
                group.nodes.forEach(function(node) {
                    node.removeAttribute('data-comment-count-loading');
                });
            });
        });

        return Promise.all(requests).then(function() {
            if (typeof window.argonSyncMetaDividers === 'function') {
                window.argonSyncMetaDividers(root);
            }
        });
    }

    function requestUrl(endpoint, postPath, page) {
        var separator = endpoint.indexOf('?') === -1 ? '?' : '&';
        return endpoint + separator + 'post=' + encodeURIComponent(postPath) +
            '&page=' + encodeURIComponent(page) + '&limit=' + pageSize;
    }

    function commentItemUrl(endpoint, id) {
        return endpoint.replace(/\/+$/, '') + '/' + encodeURIComponent(id);
    }

    function commentVoteUrl(endpoint, id) {
        return commentItemUrl(endpoint, id) + '/upvote';
    }

    function authUrl(endpoint, configured, path) {
        if (configured) {
            var base = new URL(configured.replace(/\/?$/, '/'), window.location.href);
            return new URL(path.replace(/^\//, ''), base).href;
        }
        return new URL(endpoint, window.location.href).origin + '/api/auth' + path;
    }

    function returnUrl() {
        var url = new URL(window.location.href);
        url.searchParams.delete('argon_auth');
        return url.href;
    }

    function parseResponse(response) {
        return response.json().catch(function() { return {}; }).then(function(data) {
            if (!response.ok) {
                var error = new Error(data.error || 'request_failed');
                error.status = response.status;
                throw error;
            }
            return data;
        });
    }

    function parseCommentDate(value) {
        if (typeof value !== 'string') return new Date(value);
        var normalized = value.trim();
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) {
            normalized = normalized.replace(' ', 'T') + 'Z';
        }
        return new Date(normalized);
    }

    function formatTime(value, timeZone) {
        var date = parseCommentDate(value);
        if (Number.isNaN(date.getTime())) return value || '';
        var options = {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        };
        if (timeZone) options.timeZone = timeZone;
        try {
            return date.toLocaleString(isChinese() ? 'zh-CN' : 'en-US', options);
        } catch (error) {
            delete options.timeZone;
            return date.toLocaleString(isChinese() ? 'zh-CN' : 'en-US', options);
        }
    }

    function commentDepth(comment, byId) {
        var depth = 0;
        var parentId = comment.parentId;
        while (parentId && depth < 4) {
            var parent = byId[parentId];
            if (!parent) break;
            depth += 1;
            parentId = parent.parentId;
        }
        return depth;
    }

    function safeUrl(value) {
        try {
            var url = new URL(value, window.location.href);
            if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
                return url.href;
            }
        } catch (error) {}
        return '';
    }

    function commentAvatarColor(value) {
        var colors = ['#e25f50', '#f25e90', '#bc67cb', '#9672cf', '#7984ce', '#5c96fa', '#7bdeeb', '#45d0e2', '#48b7ad', '#52bc89', '#9ace5f', '#d4e34a', '#f9d715', '#fac400', '#ffaa00', '#ff8b61', '#c2c2c2', '#8ea3af', '#a1877d', '#a3a3a3', '#b0b6e3', '#b49cde', '#c2c2c2', '#7bdeeb', '#bcaaa4', '#aed77f'];
        var hash = 0;
        var source = String(value || '');
        for (var index = 0; index < source.length; index += 1) {
            hash = (hash * 233 + source.charCodeAt(index)) % 16;
        }
        return colors[hash];
    }

    function createUserAgentIcon(kind) {
        var value = String(kind || '').toLowerCase();

        // 优先使用原 Argon 的完整 SVG，保留原始 viewBox、路径、颜色和内联偏移。
        var originalMarkup = window.ArgonUserAgentIcons && window.ArgonUserAgentIcons[value];
        if (originalMarkup) {
            try {
                var parsed = new DOMParser().parseFromString(originalMarkup, 'image/svg+xml').documentElement;
                if (parsed && parsed.nodeName.toLowerCase() === 'svg') {
                    var originalSvg = document.importNode(parsed, true);
                    originalSvg.setAttribute('class', 'comment-useragent-icon');
                    originalSvg.setAttribute('aria-hidden', 'true');
                    originalSvg.setAttribute('focusable', 'false');
                    return originalSvg;
                }
            } catch (error) {}
        }

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'comment-useragent-icon');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');

        function shape(name, attributes) {
            var node = document.createElementNS('http://www.w3.org/2000/svg', name);
            Object.keys(attributes).forEach(function(attribute) { node.setAttribute(attribute, attributes[attribute]); });
            svg.appendChild(node);
        }

        if (value.indexOf('windows') !== -1) {
            shape('path', {d: 'M2 4.5 11 3.2v8.4H2V4.5Zm10.2-1.5L22 1.7v9.9h-9.8V3ZM2 12.4h9v8.4L2 19.5v-7.1Zm10.2 0H22v9.9l-9.8-1.4v-8.5Z', fill: '#00adef'});
        } else if (value.indexOf('mac') !== -1 || value.indexOf('ios') !== -1 || value.indexOf('apple') !== -1) {
            shape('path', {d: 'M16.8 12.6c0-2 1.6-3 1.7-3.1-.9-1.3-2.3-1.5-2.8-1.5-1.2-.1-2.3.7-2.9.7-.6 0-1.5-.7-2.5-.7-1.3 0-2.6.8-3.3 2-.1.2-1.3 2.2-.3 4.5.5 1.1 1.1 2.2 1.9 3.2.8.9 1.7 1.9 2.8 1.8 1.1 0 1.5-.7 2.8-.7 1.3 0 1.7.7 2.8.7 1.2 0 1.9-.9 2.7-1.9.9-1.1 1.2-2.1 1.2-2.2-.1 0-2.1-.8-2.1-2.8ZM15 6.7c.6-.7 1-1.6.9-2.5-.9 0-1.9.6-2.5 1.3-.5.6-1 1.5-.9 2.4.9.1 1.8-.5 2.5-1.2Z', fill: '#888'});
        } else if (value.indexOf('chrome') !== -1) {
            shape('circle', {cx: '12', cy: '12', r: '10', fill: '#f1f1f1'});
            shape('path', {d: 'M12 12 6.7 2.8A10 10 0 0 1 22 12h-10Z', fill: '#db4437'});
            shape('path', {d: 'M12 12h10a10 10 0 0 1-14.7 8.8L12 12Z', fill: '#0f9d58'});
            shape('circle', {cx: '12', cy: '12', r: '4.4', fill: '#4285f4'});
        } else if (value.indexOf('edge') !== -1) {
            shape('path', {d: 'M21.3 16.8a8.9 8.9 0 0 1-5.6 2c-4.3 0-7.8-2.9-7.8-6.5 0-1.4.6-2.7 1.6-3.7-3.1.8-5.3 3.6-5.3 6.9 0 4 3.4 7.3 7.7 7.3 4.2 0 7.9-2.5 9.4-6Z', fill: '#0c9'});
            shape('path', {d: 'M21.8 14.2c-.1-5.2-4.3-9.4-9.5-9.4-4.4 0-8.1 3-9.2 7.1a7.7 7.7 0 0 1 5.6-2.4c3.4 0 5.5 2 6.1 4.7h7Z', fill: '#1683d8'});
        } else {
            shape('circle', {cx: '12', cy: '12', r: '9.5', fill: '#8898aa'});
            shape('circle', {cx: '12', cy: '12', r: '4', fill: '#fff', opacity: '.9'});
        }
        return svg;
    }

    function appendUserAgent(container, comment) {
        if (!container || !comment || !comment.userAgent) return;
        var label = document.createElement('span');
        label.className = 'comment-useragent';
        label.title = comment.userAgent;
        var parts = [comment.userAgentPlatform, comment.userAgentBrowser].filter(Boolean);
        if (!parts.length) {
            label.textContent = comment.userAgent;
            container.appendChild(label);
            return;
        }
        parts.forEach(function(part, index) {
            if (index) label.appendChild(document.createTextNode(' '));
            label.append(createUserAgentIcon(part), document.createTextNode(' ' + part));
        });
        container.appendChild(label);
    }

    function renderInline(container, source) {
        var index = 0;
        var textStart = 0;
        var patterns = [
            {regex: /^`([^`]+)`/, tag: 'code'},
            {regex: /^:([a-z][a-z0-9-]+):/, sticker: true},
            {regex: /^!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/, image: true},
            {regex: /^\[([^\]]+)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/, link: true},
            {regex: /^\*\*([\s\S]+?)\*\*/, tag: 'strong'},
            {regex: /^__([\s\S]+?)__/, tag: 'strong'},
            {regex: /^~~([\s\S]+?)~~/, tag: 'del'},
            {regex: /^\*([^*\n]+)\*/, tag: 'em'},
            {regex: /^_([^_\n]+)_/, tag: 'em'}
        ];

        function flushText(end) {
            if (end > textStart) container.appendChild(document.createTextNode(source.slice(textStart, end)));
        }

        while (index < source.length) {
            var matched = false;
            for (var patternIndex = 0; patternIndex < patterns.length; patternIndex += 1) {
                var pattern = patterns[patternIndex];
                var match = source.slice(index).match(pattern.regex);
                if (!match) continue;
                flushText(index);
                if (pattern.sticker) {
                    var stickerUrl = stickerSources[match[1]];
                    if (stickerUrl) {
                        var sticker = document.createElement('img');
                        sticker.className = 'comment-sticker';
                        sticker.src = stickerUrl;
                        sticker.alt = ':' + match[1] + ':';
                        sticker.loading = 'lazy';
                        sticker.draggable = false;
                        container.appendChild(sticker);
                    } else {
                        container.appendChild(document.createTextNode(match[0]));
                    }
                } else if (pattern.image) {
                    var imageUrl = safeUrl(match[2]);
                    if (/^https?:/i.test(imageUrl)) {
                        var imageLink = document.createElement('a');
                        imageLink.className = 'comment-image';
                        imageLink.href = imageUrl;
                        imageLink.target = '_blank';
                        imageLink.rel = 'nofollow noopener noreferrer';
                        imageLink.title = match[3] || match[1] || '查看图片';
                        var imageIcon = document.createElement('i');
                        imageIcon.className = 'fa fa-image';
                        imageIcon.setAttribute('aria-hidden', 'true');
                        imageLink.append(imageIcon, document.createTextNode(' 查看图片'));
                        var preview = document.createElement('img');
                        preview.className = 'comment-image-preview';
                        preview.alt = match[1] || '';
                        preview.setAttribute('data-src', imageUrl);
                        preview.loading = 'lazy';
                        preview.draggable = false;
                        var previewMask = document.createElement('i');
                        previewMask.className = 'comment-image-preview-mask';
                        previewMask.setAttribute('aria-hidden', 'true');
                        imageLink.append(preview, previewMask);
                        container.appendChild(imageLink);
                    } else {
                        container.appendChild(document.createTextNode(match[0]));
                    }
                } else if (pattern.link) {
                    var linkUrl = safeUrl(match[2]);
                    if (linkUrl) {
                        var link = document.createElement('a');
                        link.href = linkUrl;
                        link.target = '_blank';
                        link.rel = 'nofollow noopener noreferrer';
                        link.textContent = match[1];
                        if (match[3]) link.title = match[3];
                        container.appendChild(link);
                    } else {
                        container.appendChild(document.createTextNode(match[1]));
                    }
                } else if (pattern.tag === 'code') {
                    var code = document.createElement('code');
                    code.textContent = match[1];
                    container.appendChild(code);
                } else {
                    var inline = document.createElement(pattern.tag);
                    renderInline(inline, match[1]);
                    container.appendChild(inline);
                }
                index += match[0].length;
                textStart = index;
                matched = true;
                break;
            }
            if (!matched) index += 1;
        }
        flushText(source.length);
    }

    function renderMarkdown(container, source) {
        var lines = String(source || '').replace(/\r\n?/g, '\n').split('\n');
        var index = 0;
        container.replaceChildren();

        function isBlockStart(line) {
            return /^( {0,3})(#{1,6})\s+/.test(line) ||
                /^( {0,3})([-*+] |\d+[.] |>|```|~~~)/.test(line) ||
                /^( {0,3})([-*_])(?:\s*\2){2,}\s*$/.test(line);
        }

        function renderLines(target, blockLines) {
            var blockIndex = 0;
            while (blockIndex < blockLines.length) {
                var line = blockLines[blockIndex];
                if (!line.trim()) {
                    blockIndex += 1;
                    continue;
                }

                var fence = line.match(/^ {0,3}(```|~~~)\s*([\w-]*)\s*$/);
                if (fence) {
                    var codeLines = [];
                    blockIndex += 1;
                    while (blockIndex < blockLines.length && !new RegExp('^ {0,3}' + fence[1] + '\\s*$').test(blockLines[blockIndex])) {
                        codeLines.push(blockLines[blockIndex]);
                        blockIndex += 1;
                    }
                    if (blockIndex < blockLines.length) blockIndex += 1;
                    var pre = document.createElement('pre');
                    var code = document.createElement('code');
                    if (fence[2]) code.className = 'language-' + fence[2];
                    code.textContent = codeLines.join('\n');
                    pre.appendChild(code);
                    target.appendChild(pre);
                    continue;
                }

                var heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
                if (heading) {
                    var headingElement = document.createElement('h' + heading[1].length);
                    renderInline(headingElement, heading[2]);
                    target.appendChild(headingElement);
                    blockIndex += 1;
                    continue;
                }

                if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
                    target.appendChild(document.createElement('hr'));
                    blockIndex += 1;
                    continue;
                }

                if (/^ {0,3}>/.test(line)) {
                    var quoteLines = [];
                    while (blockIndex < blockLines.length && /^ {0,3}>/.test(blockLines[blockIndex])) {
                        quoteLines.push(blockLines[blockIndex].replace(/^ {0,3}> ?/, ''));
                        blockIndex += 1;
                    }
                    var quote = document.createElement('blockquote');
                    renderLines(quote, quoteLines);
                    target.appendChild(quote);
                    continue;
                }

                var unordered = line.match(/^ {0,3}[-*+]\s+(.+)$/);
                var ordered = line.match(/^ {0,3}\d+[.]\s+(.+)$/);
                if (unordered || ordered) {
                    var list = document.createElement(unordered ? 'ul' : 'ol');
                    var listPattern = unordered ? /^ {0,3}[-*+]\s+(.+)$/ : /^ {0,3}\d+[.]\s+(.+)$/;
                    while (blockIndex < blockLines.length) {
                        var listMatch = blockLines[blockIndex].match(listPattern);
                        if (!listMatch) break;
                        var listItem = document.createElement('li');
                        renderInline(listItem, listMatch[1]);
                        list.appendChild(listItem);
                        blockIndex += 1;
                    }
                    target.appendChild(list);
                    continue;
                }

                var paragraphLines = [line];
                blockIndex += 1;
                while (blockIndex < blockLines.length && blockLines[blockIndex].trim() && !isBlockStart(blockLines[blockIndex])) {
                    paragraphLines.push(blockLines[blockIndex]);
                    blockIndex += 1;
                }
                var paragraph = document.createElement('p');
                paragraphLines.forEach(function(paragraphLine, lineIndex) {
                    if (lineIndex) paragraph.appendChild(document.createElement('br'));
                    renderInline(paragraph, paragraphLine);
                });
                target.appendChild(paragraph);
            }
        }

        renderLines(container, lines);
    }

    function renderCommentContent(container, comment) {
        container.replaceChildren();
        if (comment && comment.useMarkdown !== false) {
            renderMarkdown(container, comment.content || '');
            return;
        }
        var plain = String(comment && comment.content || '').replace(/\r\n?/g, '\n').split('\n');
        plain.forEach(function(line, index) {
            if (index) container.appendChild(document.createElement('br'));
            var cursor = 0;
            line.replace(/:([a-z][a-z0-9-]+):/g, function(full, code, offset) {
                if (!stickerSources[code]) return full;
                if (offset > cursor) container.appendChild(document.createTextNode(line.slice(cursor, offset)));
                var sticker = document.createElement('img');
                sticker.className = 'comment-sticker'; sticker.src = stickerSources[code]; sticker.alt = full; sticker.loading = 'lazy'; sticker.draggable = false;
                container.appendChild(sticker); cursor = offset + full.length; return full;
            });
            if (cursor < line.length) container.appendChild(document.createTextNode(line.slice(cursor)));
        });
    }

    function emotionItems(group) {
        if (group.items) return group.items.map(function(text) { return {text: text}; });
        var names = group.stickers === 'dinosaur' ? ['shy', 'daze', 'sweat', 'proud', 'powerless', 'pouting', 'eating', 'ok', 'doubt', 'depressed', 'close-eyes', 'sleeping', 'puzzled', 'agree', 'crazy', 'angry'] : ['flower', 'grass', 'leaf', 'star', 'sun', 'moon', 'water', 'heihei', 'lemon', 'birthday', 'sea', 'vegetable', 'tile', 'utf'];
        return names.slice(0, group.count).map(function(name) { return {code: group.stickers + '-' + name, src: stickerSources[group.stickers + '-' + name]}; });
    }

    function buildEmotionKeyboard(state) {
        var keyboard = state.emotionKeyboard;
        if (!keyboard || keyboard.dataset.ready === 'true') return;
        var content = document.createElement('div');
        content.className = 'emotion-keyboard-content';
        var bar = document.createElement('div');
        bar.className = 'emotion-keyboard-bar';
        emotionGroups.forEach(function(group, groupIndex) {
            var panel = document.createElement('div');
            panel.className = 'emotion-group';
            panel.dataset.index = String(groupIndex);
            if (groupIndex) panel.hidden = true;
            emotionItems(group).forEach(function(item) {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'emotion-item' + (item.code ? ' emotion-item-sticker' : '');
                if (item.code) {
                    button.dataset.code = item.code;
                    button.title = ':' + item.code + ':';
                    var image = document.createElement('img');
                    image.src = item.src;
                    image.alt = ':' + item.code + ':';
                    image.loading = 'lazy';
                    image.draggable = false;
                    button.appendChild(image);
                } else {
                    button.dataset.text = item.text;
                    button.textContent = item.text;
                }
                panel.appendChild(button);
            });
            if (group.description) {
                var description = document.createElement('div');
                description.className = 'emotion-group-description';
                description.textContent = group.description;
                panel.appendChild(description);
            }
            content.appendChild(panel);
            var tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'emotion-group-name' + (groupIndex ? '' : ' active');
            tab.textContent = group.name;
            tab.dataset.index = String(groupIndex);
            tab.addEventListener('click', function() {
                Array.prototype.forEach.call(content.querySelectorAll('.emotion-group'), function(node) { node.hidden = node.dataset.index !== tab.dataset.index; });
                Array.prototype.forEach.call(bar.querySelectorAll('.emotion-group-name'), function(node) { node.classList.toggle('active', node === tab); });
            });
            bar.appendChild(tab);
        });
        keyboard.replaceChildren(content, bar);
        keyboard.dataset.ready = 'true';
        keyboard.addEventListener('click', function(event) {
            var item = event.target.closest('.emotion-item');
            if (!item) return;
            var insertion = item.dataset.code ? ':' + item.dataset.code + ':' : item.dataset.text || '';
            insertAtCursor(state.form.elements.content, insertion);
            state.form.elements.content.focus();
            toggleEmotionKeyboard(state, false);
        });
    }

    function insertAtCursor(textarea, value) {
        if (!textarea) return;
        var start = Number.isInteger(textarea.selectionStart) ? textarea.selectionStart : textarea.value.length;
        var end = Number.isInteger(textarea.selectionEnd) ? textarea.selectionEnd : start;
        textarea.value = textarea.value.slice(0, start) + value + textarea.value.slice(end);
        textarea.selectionStart = textarea.selectionEnd = start + value.length;
        textarea.dispatchEvent(new Event('input', {bubbles: true}));
    }

    function toggleEmotionKeyboard(state, open) {
        if (!state.emotionKeyboard || !state.emotionToggle) return;
        var next = open === undefined ? state.emotionKeyboard.hidden : !!open;
        state.emotionKeyboard.hidden = !next;
        state.emotionToggle.classList.toggle('comment-emotion-keyboard-open', next);
        state.emotionToggle.setAttribute('aria-expanded', next ? 'true' : 'false');
        if (next) {
            positionEmotionKeyboard(state);
            window.requestAnimationFrame(function() { positionEmotionKeyboard(state); });
        } else {
            state.emotionKeyboard.classList.remove('emotion-keyboard-above');
        }
    }

    function positionEmotionKeyboard(state) {
        if (!state || !state.emotionKeyboard || !state.emotionToggle || state.emotionKeyboard.hidden) return;
        var buttonRect = state.emotionToggle.getBoundingClientRect();
        var keyboardHeight = Math.min(state.emotionKeyboard.offsetHeight || 300, Math.max(160, window.innerHeight - 32));
        var roomBelow = window.innerHeight - buttonRect.bottom;
        var roomAbove = buttonRect.top;
        var openAbove = roomBelow < keyboardHeight + 16 && roomAbove > roomBelow;
        state.emotionKeyboard.classList.toggle('emotion-keyboard-above', openAbove);
    }

    function showHistory(state, comment) {
        if (!comment || !comment.canHistory) return;
        fetch(commentItemUrl(state.endpoint, comment.id) + '/history', {headers: {Accept: 'application/json'}, credentials: 'include'})
            .then(parseResponse).then(function(data) {
                var modal = document.createElement('div');
                modal.className = 'argon-comment-history-modal';
                var dialog = document.createElement('div');
                dialog.className = 'argon-comment-history-dialog card shadow-sm';
                var title = document.createElement('h3');
                title.textContent = message('commentHistoryTitle', comment.id);
                var close = document.createElement('button');
                close.type = 'button'; close.className = 'btn btn-sm btn-outline-primary'; close.textContent = message('commentCancel');
                close.addEventListener('click', function() { modal.remove(); });
                dialog.appendChild(title); dialog.appendChild(close);
                (data.versions || []).forEach(function(version, index) {
                    var entry = document.createElement('article');
                    entry.className = 'comment-edit-history-item';
                    var heading = document.createElement('strong');
                    heading.textContent = version.current ? '当前版本' : ('版本 ' + (index + 1));
                    var time = document.createElement('time');
                    time.textContent = formatTime(version.editedAt, state.timeZone);
                    var body = document.createElement('div');
                    renderCommentContent(body, {content: version.content, useMarkdown: version.useMarkdown});
                    entry.append(heading, time, body); dialog.appendChild(entry);
                });
                if (!data.versions || !data.versions.length) { var empty = document.createElement('p'); empty.textContent = message('commentHistoryEmpty'); dialog.appendChild(empty); }
                modal.appendChild(dialog); document.body.appendChild(modal);
                modal.addEventListener('click', function(event) { if (event.target === modal) modal.remove(); });
            }).catch(function(error) { setStatus(state.section, message('commentEditFailed'), true); console.error('Argon comment history failed', error); });
    }

    function makeComment(comment, depth, parent, state, onReply) {
        var item = document.createElement('li');
        item.className = 'comment-item';
        item.id = 'comment-' + comment.id;
        item.style.setProperty('--comment-depth', depth);
        if (comment.deleted) item.classList.add('comment-item-deleted');

        var leftWrapper = document.createElement('div');
        leftWrapper.className = 'comment-item-left-wrapper';
        if (comment.deleted) {
            leftWrapper.classList.add('comment-item-left-wrapper-deleted');
        } else {
            var avatarContainer = document.createElement('div');
            avatarContainer.className = 'comment-item-avatar';
            var avatar = document.createElement('div');
            avatar.className = 'avatar avatar-40 photo text-avatar';
            avatar.style.backgroundColor = commentAvatarColor(comment.authorName);
            var fallbackInitial = (comment.authorName || message('anonymous')).trim().charAt(0).toUpperCase();
            avatar.textContent = fallbackInitial;
            avatarContainer.appendChild(avatar);
            if (comment.avatarUrl) {
                try {
                    var avatarUrl = new URL(comment.avatarUrl, window.location.href);
                    if (avatarUrl.protocol === 'http:' || avatarUrl.protocol === 'https:') {
                        var avatarImage = document.createElement('img');
                        avatarImage.className = 'avatar avatar-40 photo';
                        avatarImage.src = avatarUrl.href;
                        avatarImage.alt = '';
                        avatarImage.loading = 'lazy';
                        avatarImage.referrerPolicy = 'no-referrer';
                        avatarImage.addEventListener('error', function() {
                            avatarContainer.replaceChildren(avatar);
                        });
                        avatarContainer.replaceChildren(avatarImage);
                    }
                } catch (error) {
                    console.warn('Invalid comment avatar URL', error);
                }
            }
            leftWrapper.appendChild(avatarContainer);
            var canUpvote = !!state.user && state.commentAllowed;
            var upvote = document.createElement('button');
            upvote.type = 'button';
            upvote.className = 'comment-upvote btn btn-icon btn-outline-primary btn-sm';
            upvote.dataset.id = comment.id;
            upvote.setAttribute('aria-label', 'Upvote');
            upvote.setAttribute('aria-pressed', comment.upvoted ? 'true' : 'false');
            if (comment.upvoted) {
                upvote.classList.add('upvoted');
            }
            var upvoteIcon = document.createElement('span');
            upvoteIcon.className = 'btn-inner--icon';
            var caret = document.createElement('i');
            caret.className = 'fa fa-caret-up';
            caret.setAttribute('aria-hidden', 'true');
            upvoteIcon.appendChild(caret);
            var upvoteText = document.createElement('span');
            upvoteText.className = 'btn-inner--text';
            var upvoteNumber = document.createElement('span');
            upvoteNumber.className = 'comment-upvote-num';
            upvoteNumber.textContent = String(Number(comment.upvotes) || 0);
            upvoteText.appendChild(upvoteNumber);
            upvote.appendChild(upvoteIcon);
            upvote.appendChild(upvoteText);
            upvote.addEventListener('click', function() {
                if (!canUpvote) {
                    var notice = !state.user ? message('commentLoginToVote') : (state.commentBlocked ? message('commentBlocked') : message('commentWhitelistRequired'));
                    showLoginRequiredToast(notice, state.user ? message('commentPolicyTitle') : '');
                    return;
                }
                if (upvote.classList.contains('comment-upvoting')) return;
                upvote.classList.add('comment-upvoting');
                fetch(commentVoteUrl(state.endpoint, comment.id), {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-Token': state.csrfToken
                    },
                    credentials: 'include'
                }).then(parseResponse).then(function(data) {
                    upvoteNumber.textContent = String(Number(data.upvotes) || 0);
                    upvote.classList.remove('comment-upvoting');
                    upvote.classList.toggle('upvoted', data.upvoted === true);
                    upvote.setAttribute('aria-pressed', data.upvoted === true ? 'true' : 'false');
                }).catch(function(error) {
                    upvote.classList.remove('comment-upvoting');
                    if (error.status === 401 && error.message === 'auth_required') {
                        showLoginRequiredToast(message('commentLoginToVote'), message('commentLoginToVoteTitle'));
                        return;
                    }
                    setStatus(state.section, error.status === 429 ? message('sendFailed') : message('commentVoteFailed'), true);
                    console.error('Argon comment upvote failed', error);
                });
            });
            leftWrapper.appendChild(upvote);
        }

        var inner = document.createElement('div');
        inner.className = 'comment-item-inner';
        var title = document.createElement('div');
        title.className = 'comment-item-title';
        if (comment.deleted) {
            var deletedLabel = document.createElement('span');
            deletedLabel.className = 'comment-deleted-label';
            deletedLabel.textContent = message('commentDeletedLabel');
            title.appendChild(deletedLabel);
        } else {
            var name = document.createElement('div');
            name.className = 'comment-name';
            var author = document.createElement('div');
            author.className = 'comment-author';
            var authorText = comment.authorName || message('anonymous');
            if (comment.profileUrl) {
                try {
                    var profileUrl = new URL(comment.profileUrl, window.location.href);
                    if (profileUrl.protocol === 'http:' || profileUrl.protocol === 'https:') {
                        var authorLink = document.createElement('a');
                        authorLink.href = profileUrl.href;
                        authorLink.target = '_blank';
                        authorLink.rel = 'nofollow noopener noreferrer';
                        authorLink.textContent = authorText;
                        author.appendChild(authorLink);
                    }
                } catch (error) {
                    console.warn('Invalid comment profile URL', error);
                }
            }
            if (!author.childNodes.length) author.textContent = authorText;
            name.appendChild(author);
            if (comment.isAdminAuthor) {
                var adminBadge = document.createElement('span');
                adminBadge.className = 'badge badge-primary badge-admin';
                adminBadge.textContent = isChinese() ? '博主' : 'Admin';
                name.appendChild(adminBadge);
            }
            if (parent) {
                var parentInfo = document.createElement('div');
                parentInfo.className = 'comment-parent-info';
                var parentIcon = document.createElement('i');
                parentIcon.className = 'fa fa-reply';
                parentIcon.setAttribute('aria-hidden', 'true');
                parentInfo.appendChild(parentIcon);
                parentInfo.appendChild(document.createTextNode(' ' + parent.authorName));
                name.appendChild(parentInfo);
            }
            title.appendChild(name);
            if (comment.pinned) {
                var pinnedBadge = document.createElement('span');
                pinnedBadge.className = 'badge badge-danger badge-pinned';
                var pinIcon = document.createElement('i');
                pinIcon.className = 'fa fa-thumb-tack';
                pinIcon.setAttribute('aria-hidden', 'true');
                pinnedBadge.append(pinIcon, document.createTextNode(' 置顶'));
                name.appendChild(pinnedBadge);
            }
            if (comment.private) {
                var privateBadge = document.createElement('span');
                privateBadge.className = 'badge badge-private-comment';
                privateBadge.textContent = message('commentPrivate');
                name.appendChild(privateBadge);
            }
            if (comment.anonymous) {
                var anonymousBadge = document.createElement('span');
                anonymousBadge.className = 'badge badge-anonymous-comment';
                anonymousBadge.textContent = message('commentAnonymous');
                name.appendChild(anonymousBadge);
            }
            appendUserAgent(name, comment);
        }
        var info = document.createElement('div');
        info.className = 'comment-info text-muted';
        var time = document.createElement('time');
        time.className = 'comment-time';
        var displayTime = comment.updatedAt || comment.createdAt;
        time.dateTime = displayTime || '';
        time.textContent = formatTime(displayTime, state.timeZone);
        info.appendChild(time);
        if (comment.updatedAt) {
            var edited = document.createElement('span');
            edited.className = 'comment-edited text-muted';
            edited.textContent = ' · ' + message('commentEdited');
            info.appendChild(edited);
        }
        title.appendChild(info);

        var text = document.createElement('div');
        text.className = 'comment-item-text';
        if (comment.deleted) {
            text.classList.add('comment-item-deleted');
            text.hidden = true;
        } else {
            if (comment.privateHidden) text.classList.add('comment-private-hidden');
            renderCommentContent(text, comment);
        }

        var operations = document.createElement('div');
        operations.className = 'comment-operations';
        operations.hidden = !state.user || !state.commentAllowed;
        if (state.user && state.commentAllowed && comment.canReply) {
            var reply = document.createElement('button');
            reply.type = 'button';
            reply.className = 'btn btn-sm btn-outline-primary';
            reply.textContent = message('reply');
            reply.addEventListener('click', function() { onReply(comment); });
            operations.appendChild(reply);
        }

        if (!comment.deleted && comment.canEdit && state.user && state.commentAllowed) {
            var edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'btn btn-sm btn-outline-primary';
            edit.textContent = message('commentEdit');
            edit.addEventListener('click', function() {
                beginEdit(comment, item, text, operations, state);
            });
            operations.appendChild(edit);
        }
        if (!comment.deleted && comment.canDelete && state.user && state.commentAllowed) {
            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'btn btn-sm btn-outline-primary comment-delete';
            remove.textContent = message('commentDelete');
            remove.addEventListener('click', function() {
                deleteComment(comment, item, state);
            });
            operations.appendChild(remove);
        }
        if (!comment.deleted && comment.canHistory && state.user) {
            var history = document.createElement('button');
            history.type = 'button';
            history.className = 'btn btn-sm btn-outline-primary comment-history';
            history.textContent = message('commentHistory');
            history.addEventListener('click', function() { showHistory(state, comment); });
            operations.appendChild(history);
        }

        inner.appendChild(title);
        if (!comment.deleted) inner.appendChild(text);
        inner.appendChild(operations);
        item.appendChild(leftWrapper);
        item.appendChild(inner);
        return item;
    }

    function beginEdit(comment, item, text, operations, state) {
        if (item.classList.contains('comment-item-editing')) return;
        item.classList.add('comment-item-editing');
        var form = document.createElement('form');
        form.className = 'comment-edit-form';
        var textarea = document.createElement('textarea');
        textarea.className = 'form-control form-control-alternative';
        textarea.maxLength = 5000;
        textarea.required = true;
        textarea.value = comment.content || '';
        var markdownToggle = null;
        if (state.allowMarkdown) {
            var markdownLabel = document.createElement('label');
            markdownLabel.className = 'custom-control custom-checkbox comment-post-checkbox';
            markdownToggle = document.createElement('input');
            markdownToggle.type = 'checkbox';
            markdownToggle.checked = comment.useMarkdown !== false;
            markdownToggle.className = 'custom-control-input';
            markdownToggle.name = 'useMarkdown';
            var markdownText = document.createElement('span');
            markdownText.className = 'custom-control-label';
            markdownText.textContent = 'Markdown';
            markdownLabel.append(markdownToggle, markdownText);
            form.appendChild(markdownLabel);
        }
        var controls = document.createElement('div');
        controls.className = 'comment-edit-actions';
        var save = document.createElement('button');
        save.type = 'submit';
        save.className = 'btn btn-primary btn-sm';
        save.textContent = message('commentSave');
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'btn btn-outline-primary btn-sm';
        cancel.textContent = message('commentCancel');
        controls.appendChild(save);
        controls.appendChild(cancel);
        form.appendChild(textarea);
        form.appendChild(controls);
        text.hidden = true;
        operations.hidden = true;
        text.parentNode.insertBefore(form, text);
        textarea.focus();

        cancel.addEventListener('click', function() {
            form.remove();
            text.hidden = false;
            operations.hidden = false;
            item.classList.remove('comment-item-editing');
        });
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            var content = textarea.value.trim();
            if (!content) {
                textarea.focus();
                return;
            }
            save.disabled = true;
            cancel.disabled = true;
            fetch(commentItemUrl(state.endpoint, comment.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': state.csrfToken
                },
                credentials: 'include',
                    body: JSON.stringify({content: content, useMarkdown: markdownToggle ? markdownToggle.checked : comment.useMarkdown !== false})
            }).then(parseResponse).then(function() {
                return state.load(state.page);
            }).catch(function(error) {
                setStatus(state.section, error.status === 429 ? message('sendFailed') : message('commentEditFailed'), true);
                console.error('Argon comment edit failed', error);
                save.disabled = false;
                cancel.disabled = false;
            });
        });
    }

    function deleteComment(comment, item, state) {
        var button = item.querySelector('.comment-delete');
        if (!button) return;
        if (button.dataset.confirming !== 'true') {
            button.dataset.confirming = 'true';
            button.className = 'btn btn-danger btn-sm py-0 px-2 comment-delete comment-delete-confirm';
            button.textContent = message('commentConfirmDelete');
            var cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'btn btn-link btn-sm p-0 comment-delete-cancel';
            cancel.textContent = message('commentCancelDelete');
            cancel.addEventListener('click', function() {
                button.dataset.confirming = 'false';
                button.className = 'btn btn-sm btn-outline-primary comment-delete';
                button.textContent = message('commentDelete');
                cancel.remove();
            });
            button.parentNode.appendChild(cancel);
            return;
        }
        button.disabled = true;
        fetch(commentItemUrl(state.endpoint, comment.id), {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                'X-CSRF-Token': state.csrfToken
            },
            credentials: 'include'
        }).then(parseResponse).then(function() {
            setStatus(state.section, message('commentDeleted'), false);
            return state.load(state.page);
        }).catch(function(error) {
            if (button) button.disabled = false;
            setStatus(state.section, error.status === 429 ? message('sendFailed') : message('commentDeleteFailed'), true);
            console.error('Argon comment delete failed', error);
        });
    }

    function foldLongComments(section) {
        Array.prototype.forEach.call(section.querySelectorAll('.comment-item-inner'), function(inner) {
            if (inner.classList.contains('comment-unfolded') || inner.classList.contains('comment-folded')) return;
            if (inner.scrollHeight <= 800) return;
            inner.classList.add('comment-folded');
            var toggle = document.createElement('div');
            toggle.className = 'show-full-comment';
            var button = document.createElement('button');
            button.type = 'button';
            var icon = document.createElement('i');
            icon.className = 'fa fa-angle-down';
            icon.setAttribute('aria-hidden', 'true');
            button.append(icon, document.createTextNode(' ' + message('commentExpand')));
            toggle.appendChild(button);
            button.addEventListener('click', function() {
                inner.classList.remove('comment-folded');
                inner.classList.add('comment-unfolded');
                toggle.remove();
            });
            inner.appendChild(toggle);
        });
    }

    function render(section, data, state) {
        var list = section.querySelector('.argon-comments-list');
        var pagination = section.querySelector('.argon-comments-pagination');
        var pageLabel = section.querySelector('.argon-comments-page');
        var previous = section.querySelector('[data-comments-prev]');
        var next = section.querySelector('[data-comments-next]');
        if (!list || !pagination) return;

        list.replaceChildren();
        var comments = Array.isArray(data.comments) ? data.comments : [];
        updateCommentCount(state.postPath, data.total);
        var byId = Object.create(null);
        var childrenByParent = Object.create(null);
        var roots = [];
        var rendered = Object.create(null);
        comments.forEach(function(comment) { byId[comment.id] = comment; });
        comments.forEach(function(comment) {
            if (comment.parentId && byId[comment.parentId]) {
                (childrenByParent[comment.parentId] || (childrenByParent[comment.parentId] = [])).push(comment);
            } else {
                roots.push(comment);
            }
        });

        function appendComment(comment, depth, parent, parentList) {
            if (!comment || rendered[comment.id]) return;
            rendered[comment.id] = true;
            var item = makeComment(comment, depth, parent, state, function(replyParent) {
                state.form.elements.parentId.value = replyParent.id;
                state.replyNotice.hidden = false;
                state.replyText.textContent = message('replying') + ': ' + replyParent.authorName;
                state.replyPreview.textContent = replyParent.content || '';
                state.form.elements.content.focus();
            });
            parentList.appendChild(item);
            var children = childrenByParent[comment.id] || [];
            if (children.length) {
                var childList = document.createElement('ol');
                childList.className = 'children';
                item.appendChild(childList);
                children.forEach(function(child) {
                    appendComment(child, Math.min(depth + 1, 4), comment, childList);
                });
            }
        }

        roots.forEach(function(comment) {
            appendComment(comment, commentDepth(comment, byId), null, list);
        });
        comments.forEach(function(comment) {
            if (!rendered[comment.id]) {
                appendComment(comment, commentDepth(comment, byId), byId[comment.parentId] || null, list);
            }
        });

        var fold = function() { if (section.isConnected) foldLongComments(section); };
        if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(fold); else window.setTimeout(fold, 0);
        window.setTimeout(fold, 500);

        setStatus(section, comments.length ? '' : message('empty'), false);
        if (typeof window.argonRenderMath === 'function') {
            window.argonRenderMath(section);
        }
        var pages = Number(data.pages) || 0;
        pagination.hidden = pages <= 1;
        if (pages > 1) {
            pageLabel.textContent = (data.page || 1) + ' / ' + pages;
            previous.disabled = (data.page || 1) <= 1;
            next.disabled = (data.page || 1) >= pages;
        }
    }

    function setAuthStatus(state, text, isError) {
        if (!state.authStatus) return;
        state.authStatus.textContent = text || '';
        state.authStatus.classList.toggle('text-danger', !!isError);
    }

    function updateAuthUi(state, user, policy) {
        state.user = user || null;
        state.commentPolicyMode = policy && policy.mode === 'whitelist' ? 'whitelist' : 'blacklist';
        state.commentAllowed = policy && typeof policy.allowed === 'boolean' ? policy.allowed : (!!state.user || state.allowGuests);
        state.commentBlocked = !!(policy && policy.blocked);
        var loggedIn = !!state.user;
        if (state.login) state.login.hidden = loggedIn;
        if (state.logout) state.logout.hidden = !loggedIn;
        if (state.form) state.form.hidden = !state.commentAllowed;
        if (!loggedIn) clearReply(state);
        updateCommentActions(state);
        if (loggedIn && !state.commentAllowed) {
            setAuthStatus(state, state.commentBlocked ? message('commentBlocked') : message('commentWhitelistRequired'), true);
        } else if (loggedIn) {
            setAuthStatus(state, message('commentLoggedIn', state.user.login), false);
        } else if (state.commentPolicyMode === 'whitelist') {
            setAuthStatus(state, message('commentWhitelistRequired'), false);
        } else if (state.allowGuests) {
            setAuthStatus(state, message('commentGuestMode'), false);
        } else {
            setAuthStatus(state, message('commentLoginRequired'), false);
        }
    }

    function loadAuth(state) {
        return fetch(authUrl(state.endpoint, state.authEndpoint, '/me'), {
            headers: {Accept: 'application/json'},
            credentials: 'include'
        }).then(parseResponse).then(function(data) {
            state.csrfToken = data.csrfToken || '';
            updateAuthUi(state, data.user, data.commentPolicy);
            if (state.authResult === 'success') setAuthStatus(state, message('commentLoggedIn', data.user && data.user.login), false);
            return data.user || null;
        }).catch(function(error) {
            updateAuthUi(state, null, null);
            setAuthStatus(state, message('commentAuthFailed'), true);
            console.error('Argon comment auth state failed', error);
            return null;
        });
    }

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        refreshPreviewCommentCounts(root);
        var sections = root.querySelectorAll('.argon-comments[data-comments-endpoint]');
        Array.prototype.forEach.call(sections, function(section) {
            if (section.getAttribute('data-comments-initialized') === 'true') return;
            var endpoint = (section.getAttribute('data-comments-endpoint') || '').trim();
            var postPath = section.getAttribute('data-comments-post-path') || window.location.pathname;
            var form = section.querySelector('.argon-comments-form');
            var list = section.querySelector('.argon-comments-list');
            if (!endpoint || !form || !list) {
                setStatus(section, message('failed'), true);
                return;
            }
            var state = {
                section: section,
                form: form,
                endpoint: endpoint,
                authEndpoint: (section.getAttribute('data-comments-auth-endpoint') || '').trim(),
                postPath: postPath,
                allowGuests: section.getAttribute('data-comments-allow-guests') === 'true',
                allowMarkdown: section.getAttribute('data-comments-allow-markdown') !== 'false',
                allowPrivate: section.getAttribute('data-comments-allow-private') === 'true',
                allowAnonymous: section.getAttribute('data-comments-allow-anonymous') !== 'false',
                user: null,
                commentAllowed: false,
                commentBlocked: false,
                csrfToken: '',
                timeZone: (section.getAttribute('data-comments-time-zone') || 'UTC').trim(),
                authStatus: section.querySelector('[data-comments-auth-status]'),
                login: section.querySelector('[data-comments-login]'),
                logout: section.querySelector('[data-comments-logout]'),
                authResult: new URL(window.location.href).searchParams.get('argon_auth') || '',
                replyNotice: section.querySelector('[data-comments-reply-info]'),
                replyText: section.querySelector('[data-comments-reply-text]'),
                replyPreview: section.querySelector('[data-comments-reply-preview]'),
                cancelReply: section.querySelector('[data-comments-cancel]'),
                emotionToggle: section.querySelector('[data-comments-emotion-toggle]'),
                emotionKeyboard: section.querySelector('[data-comments-emotion-keyboard]'),
                emotionOutsideHandler: null,
                emotionViewportHandler: null,
                page: 1,
                requestSerial: 0
            };
            section.__argonCommentsState = state;
            var markdownOption = section.querySelector('[data-comment-option-markdown]');
            var anonymousOption = section.querySelector('[data-comment-option-anonymous]');
            var privateOption = section.querySelector('[data-comment-option-private]');
            if (markdownOption) markdownOption.hidden = !state.allowMarkdown;
            if (anonymousOption) anonymousOption.hidden = !state.allowAnonymous;
            if (privateOption) privateOption.hidden = !state.allowPrivate;
            buildEmotionKeyboard(state);
            if (state.emotionToggle) {
                state.emotionToggle.addEventListener('click', function() { toggleEmotionKeyboard(state); });
                state.emotionToggle.setAttribute('aria-expanded', 'false');
            }
            state.emotionOutsideHandler = function(event) {
                if (state.emotionKeyboard && state.emotionToggle && !state.emotionKeyboard.contains(event.target) && !state.emotionToggle.contains(event.target)) toggleEmotionKeyboard(state, false);
            };
            state.emotionViewportHandler = function() { positionEmotionKeyboard(state); };
            document.addEventListener('click', state.emotionOutsideHandler);
            window.addEventListener('resize', state.emotionViewportHandler);
            document.addEventListener('scroll', state.emotionViewportHandler, true);
            state.load = function(page) { return load(page); };
            if (state.authResult) {
                var cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete('argon_auth');
                window.history.replaceState({}, document.title, cleanUrl.href);
            }
            state.login.addEventListener('click', function() {
                window.location.href = authUrl(endpoint, state.authEndpoint, '/github/start') +
                    '?returnTo=' + encodeURIComponent(returnUrl());
            });
            state.logout.addEventListener('click', function() {
                state.logout.disabled = true;
                fetch(authUrl(endpoint, state.authEndpoint, '/logout'), {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-Token': state.csrfToken
                    },
                    credentials: 'include'
                }).then(parseResponse).then(function() {
                    updateAuthUi(state, null, {mode: state.commentPolicyMode, allowed: state.commentPolicyMode !== 'whitelist' && state.allowGuests, blocked: false});
                    return load(state.page);
                }).catch(function(error) {
                    setAuthStatus(state, message('commentAuthFailed'), true);
                    console.error('Argon comment logout failed', error);
                }).finally(function() {
                    state.logout.disabled = false;
                });
            });
            state.cancelReply.addEventListener('click', function() {
                clearReply(state);
            });

            function load(page) {
                var serial = ++state.requestSerial;
                state.page = page;
                setStatus(section, message('loading'), false);
                return fetch(requestUrl(endpoint, postPath, page), {
                    headers: {Accept: 'application/json'},
                    credentials: 'include'
                }).then(parseResponse).then(function(data) {
                    if (serial !== state.requestSerial || !section.isConnected) return;
                    render(section, data, state);
                }).catch(function(error) {
                    if (serial !== state.requestSerial || !section.isConnected) return;
                    setStatus(section, message('failed'), true);
                    console.error('Argon comments load failed', error);
                });
            }

            form.addEventListener('submit', function(event) {
                event.preventDefault();
                if (!state.commentAllowed) {
                    setAuthStatus(state, state.commentBlocked ? message('commentBlocked') : (state.user ? message('commentWhitelistRequired') : message('commentLoginRequired')), true);
                    return;
                }
                var submit = form.querySelector('[type="submit"]');
            var payload = {
                    postPath: postPath,
                    content: form.elements.content.value,
                    parentId: form.elements.parentId.value || null,
                    useMarkdown: !form.querySelector('[name="useMarkdown"]') || form.querySelector('[name="useMarkdown"]').checked,
                    anonymousDisplay: !!(form.querySelector('[name="anonymousDisplay"]') && form.querySelector('[name="anonymousDisplay"]').checked),
                    private: !!(form.querySelector('[name="private"]') && form.querySelector('[name="private"]').checked),
                    // Reserved for the future mail provider integration.
                    mailNotice: false
                };
                if (submit) submit.disabled = true;
                setStatus(section, message('sending'), false);
                fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-Token': state.csrfToken
                    },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                }).then(parseResponse).then(function() {
                    form.elements.content.value = '';
                    form.elements.parentId.value = '';
                    state.replyText.textContent = '';
                    state.replyPreview.textContent = '';
                    state.replyNotice.hidden = true;
                    setStatus(section, message('sent'), false);
                    return load(1);
                }).catch(function(error) {
                    if (error.status === 401 && error.message === 'auth_required') {
                        updateAuthUi(state, null, null);
                        setAuthStatus(state, message('commentLoginRequired'), true);
                        return;
                    }
                    if (error.status === 403 && error.message === 'user_blocked') {
                        state.commentAllowed = false;
                        state.commentBlocked = true;
                        updateAuthUi(state, state.user, {allowed: false, blocked: true});
                        setAuthStatus(state, message('commentBlocked'), true);
                        return;
                    }
                    if (error.status === 403 && error.message === 'whitelist_required') {
                        state.commentAllowed = false;
                        updateAuthUi(state, state.user, {allowed: false, blocked: false});
                        setAuthStatus(state, message('commentWhitelistRequired'), true);
                        return;
                    }
                    if (error.status === 403 && error.message === 'private_parent_forbidden') {
                        setStatus(section, message('commentPrivateParent'), true);
                        return;
                    }
                    setStatus(section, message('sendFailed'), true);
                    console.error('Argon comment submit failed', error);
                }).finally(function() {
                    if (submit) submit.disabled = false;
                });
            });
            section.querySelector('[data-comments-prev]').addEventListener('click', function() {
                if (state.page > 1) load(state.page - 1);
            });
            section.querySelector('[data-comments-next]').addEventListener('click', function() {
                load(state.page + 1);
            });
            section.setAttribute('data-comments-initialized', 'true');
            activeSections.push(section);
            loadAuth(state).then(function() { return load(1); });
        });
    }

    function destroy(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        activeSections = activeSections.filter(function(section) {
            if (root === document || root.contains(section)) {
                var state = section.__argonCommentsState;
                if (state && state.emotionOutsideHandler) document.removeEventListener('click', state.emotionOutsideHandler);
                if (state && state.emotionViewportHandler) {
                    window.removeEventListener('resize', state.emotionViewportHandler);
                    document.removeEventListener('scroll', state.emotionViewportHandler, true);
                }
                delete section.__argonCommentsState;
                section.removeAttribute('data-comments-initialized');
                return false;
            }
            return true;
        });
    }

    window.argonCustomComments = window.argonCustomComments || {};
    window.argonCustomComments.init = init;
    window.argonCustomComments.destroy = destroy;
    window.argonCustomComments.refreshPreviewCommentCounts = refreshPreviewCommentCounts;
    refreshPreviewCommentCounts(document);
})(window, document);
