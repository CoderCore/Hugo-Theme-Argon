(function(window, document) {
    'use strict';

    var activeSections = [];
    var pageSize = 20;

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
            commentDeletedLabel: '评论已删除'
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
            commentDeletedLabel: 'Comment deleted'
        };
        return (messages[name] || name).replace('%s', value || '');
    }

    function setStatus(section, text, isError) {
        var status = section.querySelector('.argon-comments-status');
        if (!status) return;
        status.textContent = text || '';
        status.classList.toggle('text-danger', !!isError);
    }

    function requestUrl(endpoint, postPath, page) {
        var separator = endpoint.indexOf('?') === -1 ? '?' : '&';
        return endpoint + separator + 'post=' + encodeURIComponent(postPath) +
            '&page=' + encodeURIComponent(page) + '&limit=' + pageSize;
    }

    function commentItemUrl(endpoint, id) {
        return endpoint.replace(/\/+$/, '') + '/' + encodeURIComponent(id);
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

    function renderInline(container, source) {
        var index = 0;
        var textStart = 0;
        var patterns = [
            {regex: /^`([^`]+)`/, tag: 'code'},
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
                if (pattern.image) {
                    var imageUrl = safeUrl(match[2]);
                    if (imageUrl) {
                        var image = document.createElement('img');
                        image.className = 'comment-markdown-image';
                        image.src = imageUrl;
                        image.alt = match[1] || '';
                        if (match[3]) image.title = match[3];
                        container.appendChild(image);
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

    function makeComment(comment, depth, parent, state, onReply) {
        var item = document.createElement('li');
        item.className = 'comment-item';
        item.id = 'comment-' + comment.id;
        item.style.setProperty('--comment-depth', depth);
        if (comment.deleted) item.classList.add('comment-item-deleted');

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
            var avatar = document.createElement('span');
            avatar.className = 'comment-item-avatar text-avatar';
            var fallbackInitial = (comment.authorName || message('anonymous')).trim().charAt(0).toUpperCase();
            avatar.textContent = fallbackInitial;
            if (comment.avatarUrl) {
                try {
                    var avatarUrl = new URL(comment.avatarUrl, window.location.href);
                    if (avatarUrl.protocol === 'http:' || avatarUrl.protocol === 'https:') {
                        var avatarImage = document.createElement('img');
                        avatarImage.className = 'avatar rounded-circle';
                        avatarImage.src = avatarUrl.href;
                        avatarImage.alt = '';
                        avatarImage.loading = 'lazy';
                        avatarImage.referrerPolicy = 'no-referrer';
                        avatarImage.addEventListener('error', function() {
                            avatar.replaceChildren();
                            avatar.textContent = fallbackInitial;
                            avatar.classList.add('text-avatar');
                        });
                        avatar.replaceChildren(avatarImage);
                    }
                } catch (error) {
                    console.warn('Invalid comment avatar URL', error);
                }
            }
            title.appendChild(avatar);
            var name = document.createElement('span');
            name.className = 'comment-name';
            name.textContent = comment.authorName || message('anonymous');
            title.appendChild(name);
            if (parent) {
                var parentInfo = document.createElement('span');
                parentInfo.className = 'comment-parent-info';
                var parentIcon = document.createElement('i');
                parentIcon.className = 'fa fa-reply';
                parentIcon.setAttribute('aria-hidden', 'true');
                parentInfo.appendChild(parentIcon);
                parentInfo.appendChild(document.createTextNode(' ' + parent.authorName));
                title.appendChild(parentInfo);
            }
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
            renderMarkdown(text, comment.content || '');
        }

        var operations = document.createElement('div');
        operations.className = 'comment-operations';
        var reply = document.createElement('button');
        reply.type = 'button';
        reply.className = 'btn btn-link btn-sm p-0';
        reply.textContent = message('reply');
        reply.addEventListener('click', function() { onReply(comment); });
        if (!comment.deleted) operations.appendChild(reply);

        if (!comment.deleted && comment.canEdit && state.user) {
            var edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'btn btn-link btn-sm p-0';
            edit.textContent = message('commentEdit');
            edit.addEventListener('click', function() {
                beginEdit(comment, item, text, operations, state);
            });
            operations.appendChild(edit);
        }
        if (!comment.deleted && comment.canDelete && state.user) {
            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'btn btn-link btn-sm p-0 comment-delete';
            remove.textContent = message('commentDelete');
            remove.addEventListener('click', function() {
                deleteComment(comment, item, state);
            });
            operations.appendChild(remove);
        }

        inner.appendChild(title);
        if (!comment.deleted) inner.appendChild(text);
        inner.appendChild(operations);
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
                body: JSON.stringify({content: content})
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
                button.className = 'btn btn-link btn-sm p-0 comment-delete';
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

    function render(section, data, state) {
        var list = section.querySelector('.argon-comments-list');
        var pagination = section.querySelector('.argon-comments-pagination');
        var pageLabel = section.querySelector('.argon-comments-page');
        var previous = section.querySelector('[data-comments-prev]');
        var next = section.querySelector('[data-comments-next]');
        if (!list || !pagination) return;

        list.replaceChildren();
        var comments = Array.isArray(data.comments) ? data.comments : [];
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

    function updateAuthUi(state, user) {
        state.user = user || null;
        var loggedIn = !!state.user;
        if (state.login) state.login.hidden = loggedIn;
        if (state.logout) state.logout.hidden = !loggedIn;
        if (state.form) state.form.hidden = !state.allowGuests && !loggedIn;
        if (state.authorName) {
            state.authorName.readOnly = loggedIn;
            if (loggedIn) {
                state.authorName.value = state.user.displayName || state.user.login;
            } else if (state.authorName.dataset.commentsAuthValue) {
                state.authorName.value = state.authorName.dataset.commentsAuthValue;
            }
        }
        if (loggedIn) {
            setAuthStatus(state, message('commentLoggedIn', state.user.login), false);
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
            updateAuthUi(state, data.user);
            if (state.authResult === 'success') setAuthStatus(state, message('commentLoggedIn', data.user && data.user.login), false);
            return data.user || null;
        }).catch(function(error) {
            updateAuthUi(state, null);
            setAuthStatus(state, message('commentAuthFailed'), true);
            console.error('Argon comment auth state failed', error);
            return null;
        });
    }

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
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
                allowGuests: section.getAttribute('data-comments-allow-guests') === 'true',
                user: null,
                csrfToken: '',
                timeZone: (section.getAttribute('data-comments-time-zone') || 'UTC').trim(),
                authStatus: section.querySelector('[data-comments-auth-status]'),
                login: section.querySelector('[data-comments-login]'),
                logout: section.querySelector('[data-comments-logout]'),
                authorName: form.elements.authorName,
                authResult: new URL(window.location.href).searchParams.get('argon_auth') || '',
                replyNotice: section.querySelector('[data-comments-reply-info]'),
                replyText: section.querySelector('[data-comments-reply-text]'),
                replyPreview: section.querySelector('[data-comments-reply-preview]'),
                cancelReply: section.querySelector('[data-comments-cancel]'),
                page: 1,
                requestSerial: 0
            };
            state.load = function(page) { return load(page); };
            if (state.authorName && !state.authorName.dataset.commentsAuthValue) {
                state.authorName.dataset.commentsAuthValue = state.authorName.value || '';
            }
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
                    updateAuthUi(state, null);
                    return load(state.page);
                }).catch(function(error) {
                    setAuthStatus(state, message('commentAuthFailed'), true);
                    console.error('Argon comment logout failed', error);
                }).finally(function() {
                    state.logout.disabled = false;
                });
            });
            state.cancelReply.addEventListener('click', function() {
                form.elements.parentId.value = '';
                state.replyText.textContent = '';
                state.replyPreview.textContent = '';
                state.replyNotice.hidden = true;
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
                if (!state.allowGuests && !state.user) {
                    setAuthStatus(state, message('commentLoginRequired'), true);
                    return;
                }
                var submit = form.querySelector('[type="submit"]');
                var payload = {
                    postPath: postPath,
                    authorName: state.user ? (state.user.displayName || state.user.login) : form.elements.authorName.value,
                    content: form.elements.content.value,
                    parentId: form.elements.parentId.value || null
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
                        updateAuthUi(state, null);
                        setAuthStatus(state, message('commentLoginRequired'), true);
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
                section.removeAttribute('data-comments-initialized');
                return false;
            }
            return true;
        });
    }

    window.argonCustomComments = window.argonCustomComments || {};
    window.argonCustomComments.init = init;
    window.argonCustomComments.destroy = destroy;
})(window, document);
