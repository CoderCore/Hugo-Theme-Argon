$(document).on('pjax:complete', function(e, xhr, options) {
    // 从 PJAX 响应文本中直接提取 banner-size 类
    var bannerSizeMatch = xhr.responseText.match(/banner-size-\w+/);
    var bannerSizeClass = bannerSizeMatch ? bannerSizeMatch[0] : null;

    // 定义需要管理的类映射
    var classMappings = {
        'banner-size-fullscreen': 'banner-is-fullscreen',
        'banner-size-hidden': 'banner-is-hidden'
    };

    // 首先，从当前的 <html> 标签中移除所有需要管理的类
    var managedClasses = Object.values(classMappings);
    $('html').removeClass(managedClasses.join(' '));

    // 根据提取的 banner size 类更新 banner 元素的类
    var banner = $('#banner');
    if (bannerSizeClass) {
        // 移除所有 banner-size 类
        banner.removeClass('banner-size-fullscreen banner-size-full banner-size-mini banner-size-hidden');
        // 添加新的 banner-size 类
        banner.addClass(bannerSizeClass);
    }

    // 根据 banner size 类添加相应的 html 类
    if (bannerSizeClass && classMappings[bannerSizeClass]) {
        var htmlClass = classMappings[bannerSizeClass];
        $('html').addClass(htmlClass);
    }
});
