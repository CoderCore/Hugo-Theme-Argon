(function(window, document) {
    'use strict';

    var searchIndexPromises = {};

    function loadSearchIndex(path) {
        if (searchIndexPromises[path]) {
            return searchIndexPromises[path];
        }
        searchIndexPromises[path] = window.fetch(path, {
            credentials: 'same-origin',
            headers: {Accept: 'application/json'}
        }).then(function(response) {
            if (!response.ok) {
                throw new Error('Search index request failed');
            }
            return response.json();
        }).then(function(data) {
            return Array.isArray(data) ? data : [];
        }).catch(function(error) {
            delete searchIndexPromises[path];
            throw error;
        });
        return searchIndexPromises[path];
    }

    function translate(text) {
        return typeof window.__ === 'function' ? window.__(text) : text;
    }

    function searchInput(input, result, path) {
        loadSearchIndex(path).then(function(response) {
            var data = response.map(function(item) {
                var title = String(item.title || 'Untitled').trim();
                var content = String(item.content || '').trim().replace(/<[^>]+>/g, '');
                return {
                    title: title,
                    content: content,
                    titleSearch: title.toLowerCase(),
                    contentSearch: content.toLowerCase(),
                    url: item.url
                };
            });
            input.setAttribute('data-argon-search-initialized', 'true');
            input.addEventListener('input', function() {
                var list = document.createElement('ul');
                list.className = 'search-result-list';
                var value = input.value.trim();
                var keywords = value.toLowerCase().split(/[\s\-]+/);
                result.replaceChildren();
                if (!value) {
                    return;
                }
                data.forEach(function(item) {
                    var isMatch = true;
                    var firstOccurrence = -1;
                    keywords.forEach(function(keyword) {
                        var titleIndex = item.titleSearch.indexOf(keyword);
                        var contentIndex = item.contentSearch.indexOf(keyword);
                        if (titleIndex < 0 && contentIndex < 0) {
                            isMatch = false;
                        } else if (contentIndex >= 0 && (firstOccurrence < 0 || contentIndex < firstOccurrence)) {
                            firstOccurrence = contentIndex;
                        }
                    });
                    if (!isMatch) {
                        return;
                    }
                    var listItem = document.createElement('li');
                    var link = document.createElement('a');
                    link.href = item.url || '#';
                    link.className = 'search-result-title';
                    link.textContent = item.title;
                    listItem.appendChild(link);
                    if (firstOccurrence >= 0) {
                        var start = Math.max(firstOccurrence - 20, 0);
                        var end = firstOccurrence + 80;
                        if (start === 0) {
                            end = 100;
                        }
                        end = Math.min(end, item.content.length);
                        var paragraph = document.createElement('p');
                        paragraph.className = 'search-result';
                        paragraph.textContent = item.content.substring(start, end) +
                            (end < item.content.length ? '...' : '');
                        listItem.appendChild(paragraph);
                    }
                    list.appendChild(listItem);
                });
                if (list.children.length) {
                    result.appendChild(list);
                } else {
                    var empty = document.createElement('p');
                    empty.className = 'search-no-results';
                    empty.textContent = translate('没有找到结果');
                    result.appendChild(empty);
                }
            });
            input.dispatchEvent(new Event('input'));
        }).catch(function() {
            input.removeAttribute('data-argon-search-loading');
            result.replaceChildren();
            var error = document.createElement('p');
            error.className = 'search-no-results';
            error.textContent = translate('搜索索引加载失败');
            result.appendChild(error);
        });
    }

    function init(root) {
        root = root && typeof root.querySelector === 'function' ? root : document;
        var input = root.querySelector('#local-search-input');
        if (!input || input.getAttribute('data-argon-search-initialized') === 'true' ||
            input.getAttribute('data-argon-search-loading') === 'true') {
            return;
        }
        var path = (input.getAttribute('data-config-root') || '') +
            (input.getAttribute('data-search.path') || '/search.json');
        var result = root.querySelector('#search-results') || root.querySelector('#local-search-result');
        if (!result) {
            return;
        }
        if (input.getAttribute('data-argon-search-initialized') !== 'true' &&
            input.getAttribute('data-argon-search-loading') !== 'true') {
            input.setAttribute('data-argon-search-loading', 'true');
            searchInput(input, result, path);
        }
        input.setAttribute('data-argon-search-bound', 'true');
    }

    document.addEventListener('click', function(event) {
        if (event.target.closest && event.target.closest('.search-result-title')) {
            var close = document.querySelector('#argon_search_modal button[data-dismiss="modal"]');
            if (close) {
                close.click();
            }
        }
    });

    window.argonSearchInit = init;
}(window, document));
