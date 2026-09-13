(function(window, document) {
    'use strict';

    function init(root) {
        root = root && typeof root.querySelectorAll === 'function' ? root : document;
        window.jQuery('.github-info-card', root).each(function() {
            (function($this) {
                function render(data) {
                    var description = $this.find('.github-info-card-description')[0];
                    var stars = $this.find('.github-info-card-stars')[0];
                    var forks = $this.find('.github-info-card-forks')[0];
                    if (description) {
                        description.replaceChildren();
                        description.appendChild(document.createTextNode(data.description || ''));
                        if (data.homepage && /^https?:\/\//i.test(data.homepage)) {
                            var separator = document.createTextNode(' ');
                            var homepage = document.createElement('a');
                            homepage.href = data.homepage;
                            homepage.target = '_blank';
                            homepage.rel = 'noopener';
                            homepage.textContent = data.homepage;
                            description.appendChild(separator);
                            description.appendChild(homepage);
                        }
                    }
                    if (stars) stars.textContent = data.stars == null ? '-' : data.stars;
                    if (forks) forks.textContent = data.forks == null ? '-' : data.forks;
                }

                if ($this.attr('data-getdata') == 'backend') {
                    render({description: $this.attr('data-description'), stars: $this.attr('data-stars'), forks: $this.attr('data-forks')});
                    return;
                }
                if ($this.attr('data-argon-github-initialized') == 'true') {
                    return;
                }
                $this.attr('data-argon-github-initialized', 'true');
                var loadData = function() {
                    var card = $this[0];
                    if (!card || !card.isConnected || !document.documentElement.contains(card)) return;
                    $('.github-info-card-description', $this).text(window.__('加载中'));
                    $('.github-info-card-stars', $this).html('-');
                    $('.github-info-card-forks', $this).html('-');
                    var author = $this.attr('data-author');
                    var project = $this.attr('data-project');
                    var cacheKey = 'argon-github-card:' + author + '/' + project;
                    var staleData = null;
                    try {
                        var cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
                        if (cached && cached.data) staleData = cached.data;
                        if (cached && cached.savedAt && Date.now() - cached.savedAt < 600000 && cached.data) {
                            render(cached.data);
                            return;
                        }
                    } catch (err) {}
                    window.jQuery.ajax({
                        url: 'https://api.github.com/repos/' + author + '/' + project,
                        type: 'GET',
                        dataType: 'json',
                        timeout: 5000,
                        headers: {'Accept': 'application/vnd.github+json'},
                        success: function(result) {
                            if (!card.isConnected || !document.documentElement.contains(card)) return;
                            var data = {description: result.description || '', homepage: result.homepage || '', stars: result.stargazers_count, forks: result.forks_count};
                            render(data);
                            try { sessionStorage.setItem(cacheKey, JSON.stringify({savedAt: Date.now(), data: data})); } catch (err) {}
                        },
                        error: function(xhr) {
                            if (!card.isConnected || !document.documentElement.contains(card)) return;
                            if (staleData) render(staleData);
                            else if (xhr.status == 404) render({description: window.__('找不到该 Repo')});
                            else if (xhr.status == 403) render({description: window.__('GitHub API 请求次数已达上限')});
                            else render({description: window.__('获取 Repo 信息失败')});
                        }
                    });
                };
                if ('requestIdleCallback' in window) window.requestIdleCallback(loadData, {timeout: 2500});
                else window.setTimeout(loadData, 1200);
            })(window.jQuery(this));
        });
    }

    window.argonGithubInfoCardInit = init;
})(window, document);
