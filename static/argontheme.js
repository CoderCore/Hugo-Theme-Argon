if (typeof(argonConfig) == "undefined"){
	var argonConfig = {};
}
/* Cookies 操作 */
function setCookie(cname, cvalue, exdays) {
	var d = new Date();
	d.setTime(d.getTime() + (exdays*24*60*60*1000));
	var expires = "expires="+ d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
	var name = cname + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(';');
	for(var i = 0; i <ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

/* 多语言支持 */
var translation = {};
translation['en_US'] = {
	"确定": "OK",
	"清除": "Clear",
	"恢复博客默认": "Set To Default",
	"评论内容不能为空": "Comment content cannot be empty",
	"昵称不能为空": "Name cannot be empty",
	"邮箱或 QQ 号格式错误": "Incorrect email or QQ format",
	"邮箱格式错误": "Incorrect email format",
	"网站格式错误 (不是 http(s):// 开头)": "Website URL format error",
	"验证码未输入": "CAPTCHA cannot be empty",
	"验证码格式错误": "Incorrect CAPTCHA format",
	"评论格式错误": "Comment format error",
	"发送中": "Sending",
	"正在发送": "Sending",
	"评论正在发送中...": "Comment is sending...",
	"发送": "Send",
	"评论发送失败": "Comment failed",
	"发送成功": "Success",
	"您的评论已发送": "Your comment has been sent",
	"评论": "Comments",
	"未知原因": "Unknown Error",
	"评论内容不能为空": "Comment content cannot be empty",
	"编辑中": "Editing",
	"正在编辑": "Editing",
	"评论正在编辑中...": "Comment is editing",
	"编辑": "Edit",
	"评论编辑失败": "Comment editing failed",
	"已编辑": "Edited",
	"编辑成功": "Success",
	"您的评论已编辑": "Your comment has been edited",
	"评论 #": "Comment #",
	"的编辑记录": "- Edit History",
	"加载失败": "Failed to load",
	"展开": "Show",
	"没有更多了": "No more comments",
	"找不到该 Repo": "Can't find the repository",
	"获取 Repo 信息失败": "Failed to get repository information",
	"GitHub API 请求次数已达上限": "GitHub API rate limit reached",
	"点赞失败": "Vote failed",
	"Hitokoto 获取失败": "Failed to get Hitokoto",
	"复制成功": "Copied",
	"代码已复制到剪贴板": "Code has been copied to the clipboard",
	"复制失败": "Failed",
	"请手动复制代码": "Please copy the code manually",
	"刚刚": "Now",
	"分钟前": "minutes ago",
	"小时前": "hours ago",
	"昨天": "Yesterday",
	"前天": "The day before yesterday",
	"天前": "days ago",
	"隐藏行号": "Hide Line Numbers",
	"显示行号": "Show Line Numbers",
	"开启折行": "Enable Break Line",
	"关闭折行": "Disable Break Line",
	"复制": "Copy",
	"全屏": "Fullscreen",
	"退出全屏": "Exit Fullscreen",
	"加载中": "Loading...",
	"没有找到结果": "No results found",
	"搜索索引加载失败": "Failed to load the search index",
	"微信扫描二维码": "Scan with WeChat",
	"链接已复制": "Link copied",
	"链接已复制到剪贴板": "Link copied to clipboard",
	"请手动复制链接": "Please copy the link manually",
};
translation['ru_RU'] = {
	"确定": "ОК",
	"清除": "Очистить",
	"恢复博客默认": "Восстановить по умолчанию",
	"评论内容不能为空": "Содержимое комментария не может быть пустым",
	"昵称不能为空": "Имя не может быть пустым",
	"邮箱或 QQ 号格式错误": "Неверный формат электронной почты или QQ",
	"邮箱格式错误": "Неправильный формат электронной почты",
	"网站格式错误 (不是 http(s):// 开头)": "Сайт ошибка формата URL-адреса ",
	"验证码未输入": "Вы не решили капчу",
	"验证码格式错误": "Ошибка проверки капчи",
	"评论格式错误": "Неправильный формат комментария",
	"发送中": "Отправка",
	"正在发送": "Отправка",
	"评论正在发送中...": "Комментарий отправляется...",
	"发送": "Отправить",
	"评论发送失败": "Не удалось отправить комментарий",
	"发送成功": "Комментарий отправлен",
	"您的评论已发送": "Ваш комментарий был отправлен",
	"评论": "Комментарии",
	"未知原因": "Неизвестная ошибка",
	"评论内容不能为空": "Содержимое комментария не может быть пустым",
	"编辑中": "Редактируется",
	"正在编辑": "Редактируется",
	"评论正在编辑中...": "Комментарий редактируется",
	"编辑": "Редактировать",
	"评论编辑失败": "Не удалось отредактировать комментарий",
	"已编辑": "Изменено",
	"编辑成功": "Успешно",
	"您的评论已编辑": "Ваш комментарий был изменен",
	"评论 #": "Комментарий #",
	"的编辑记录": "- История изменений",
	"加载失败": "Ошибка загрузки",
	"展开": "Показать",
	"没有更多了": "Комментариев больше нет",
	"找不到该 Repo": "Невозможно найти репозиторий",
	"获取 Repo 信息失败": "Неудалось получить информацию репозитория",
	"点赞失败": "Ошибка голосования",
	"Hitokoto 获取失败": "Проблемы с вызовом Hitokoto",
	"复制成功": "Скопировано",
	"代码已复制到剪贴板": "Код скопирован в буфер обмена",
	"复制失败": "Неудалось",
	"请手动复制代码": "Скопируйте код вручную",
	"刚刚": "Сейчас",
	"分钟前": "минут назад",
	"小时前": "часов назад",
	"昨天": "Вчера",
	"前天": "Позавчера",
	"天前": "дней назад",
	"隐藏行号": "Скрыть номера строк",
	"显示行号": "Показать номера строк",
	"开启折行": "Включить перенос строк",
	"关闭折行": "Выключить перенос строк",
	"复制": "Скопировать",
	"全屏": "Полноэкранный режим",
	"退出全屏": "Выход из полноэкранного режима",
};
translation['zh_TW'] = {
	"确定": "確定",
	"清除": "清除",
	"恢复博客默认": "恢復博客默認",
	"评论内容不能为空": "評論內容不能為空",
	"昵称不能为空": "昵稱不能為空",
	"邮箱或 QQ 号格式错误": "郵箱或 QQ 號格式錯誤",
	"邮箱格式错误": "郵箱格式錯誤",
	"网站格式错误 (不是 http(s):// 开头)": "網站格式錯誤 (不是 http(s):// 開頭)",
	"验证码未输入": "驗證碼未輸入",
	"验证码格式错误": "驗證碼格式錯誤",
	"评论格式错误": "評論格式錯誤",
	"发送中": "發送中",
	"正在发送": "正在發送",
	"评论正在发送中...": "評論正在發送中...",
	"发送": "發送",
	"评论发送失败": "評論發送失敗",
	"发送成功": "發送成功",
	"您的评论已发送": "您的評論已發送",
	"评论": "評論",
	"未知原因": "未知原因",
	"评论内容不能为空": "評論內容不能為空",
	"编辑中": "編輯中",
	"正在编辑": "正在編輯",
	"评论正在编辑中...": "評論正在編輯中...",
	"编辑": "編輯",
	"评论编辑失败": "評論編輯失敗",
	"已编辑": "已編輯",
	"编辑成功": "編輯成功",
	"您的评论已编辑": "您的評論已編輯",
	"评论 #": "評論 #",
	"的编辑记录": "的編輯記錄",
	"加载失败": "加載失敗",
	"展开": "展開",
	"没有更多了": "沒有更多了",
	"找不到该 Repo": "找不到該 Repo",
	"获取 Repo 信息失败": "獲取 Repo 信息失敗",
	"点赞失败": "點贊失敗",
	"Hitokoto 获取失败": "Hitokoto 獲取失敗",
	"复制成功": "復制成功",
	"代码已复制到剪贴板": "代碼已復制到剪貼板",
	"复制失败": "復制失敗",
	"请手动复制代码": "請手動復制代碼",
	"刚刚": "剛剛",
	"分钟前": "分鐘前",
	"小时前": "小時前",
	"昨天": "昨天",
	"前天": "前天",
	"天前": "天前",
	"隐藏行号": "隱藏行號",
	"显示行号": "顯示行號",
	"开启折行": "開啟折行",
	"关闭折行": "關閉折行",
	"复制": "復制",
	"全屏": "全屏",
	"退出全屏": "退出全屏"
};
function __(text){
	let lang = String(argonConfig.language || '').replace('-', '_').toLowerCase();
	if (lang == "en" || lang == "en_us") lang = "en_US";
	else if (lang == "ru" || lang == "ru_ru") lang = "ru_RU";
	else if (lang == "zh_tw") lang = "zh_TW";
	if (typeof(translation[lang]) == "undefined"){
		return text;
	}
	if (typeof(translation[lang][text]) == "undefined"){
		return text;
	}
	return translation[lang][text];
}

/* 根据滚动高度改变顶栏透明度 */
!function(){
	let toolbar = document.getElementById("navbar-main");
	let $bannerContainer = $("#banner_container");
	let $content = $("#content");

	let startTransitionHeight;
	let endTransitionHeight;

	startTransitionHeight = $bannerContainer.offset().top - 75;
	endTransitionHeight = $content.offset().top - 75;

	$(window).resize(function(){
		startTransitionHeight = $bannerContainer.offset().top - 75;
		endTransitionHeight = $content.offset().top - 75;
	});

	function changeToolbarTransparency(){
		let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
		if (scrollTop < startTransitionHeight){
			toolbar.style.setProperty('background-color', 'rgba(var(--toolbar-color), 0)', 'important');
			toolbar.style.setProperty('backdrop-filter', 'none');
			toolbar.style.setProperty('box-shadow', 'none');
			toolbar.classList.add("navbar-ontop");
			return;
		}
		if (scrollTop > endTransitionHeight){
			toolbar.style.setProperty('background-color', 'rgba(var(--toolbar-color), 0.65)', 'important');
			toolbar.style.setProperty('backdrop-filter', 'blur(16px)');
			toolbar.style.setProperty('box-shadow', '');
			toolbar.classList.remove("navbar-ontop");
			return;
		}
		let transparency = (scrollTop - startTransitionHeight) / (endTransitionHeight - startTransitionHeight) * 0.65;
		toolbar.style.setProperty('background-color', 'rgba(var(--toolbar-color), ' + transparency + ')', 'important');
		toolbar.style.setProperty('backdrop-filter', 'blur(16px)');
		toolbar.style.setProperty('box-shadow', '');
		toolbar.classList.remove("navbar-ontop");
	}
	changeToolbarTransparency();
	document.addEventListener("scroll", changeToolbarTransparency, {passive: true});
}();

/* 左侧栏随页面滚动浮动 */
let argonLeftbarStickyObserver = null;
let argonLeftbarStickyBound = false;
function changeLeftbarStickyStatus(){
	let leftbarPart1 = document.getElementById('leftbar_part1');
	let leftbarPart2 = document.getElementById('leftbar_part2');
	if (!leftbarPart1 || !leftbarPart2){
		document.body.classList.remove('leftbar-can-headroom');
		return;
	}
	let part1Offset = $(leftbarPart1).offset();
	if (!part1Offset){
		leftbarPart2.classList.remove('sticky');
		document.body.classList.remove('leftbar-can-headroom');
		return;
	}
	let part1OffsetTop = part1Offset.top;
	let part1OuterHeight = $(leftbarPart1).outerHeight();
	let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
	if (part1OffsetTop + part1OuterHeight + 10 - scrollTop <= 90){
		// 滚动条在页面中间浮动状态
		leftbarPart2.classList.add('sticky');
	}else{
		// 滚动条在顶部不浮动状态
		leftbarPart2.classList.remove('sticky');
	}
	if (part1OffsetTop + part1OuterHeight + 10 - scrollTop <= 20){
		// 侧栏下部分是否可以随 Headroom 一起向上移动
		document.body.classList.add('leftbar-can-headroom');
	}else{
		document.body.classList.remove('leftbar-can-headroom');
	}
}
function leftbarStickyInit(){
	if (!argonLeftbarStickyBound){
		document.addEventListener("scroll", changeLeftbarStickyStatus, {passive: true});
		$(window).on("resize.argonLeftbarSticky", changeLeftbarStickyStatus);
		argonLeftbarStickyBound = true;
	}
	if (argonLeftbarStickyObserver){
		argonLeftbarStickyObserver.disconnect();
		argonLeftbarStickyObserver = null;
	}
	let leftbarPart1 = document.getElementById('leftbar_part1');
	if (leftbarPart1){
		argonLeftbarStickyObserver = new MutationObserver(changeLeftbarStickyStatus);
		argonLeftbarStickyObserver.observe(leftbarPart1, {attributes: true, childList: true, subtree: true});
	}
	changeLeftbarStickyStatus();
}
leftbarStickyInit();

/* Headroom */
if (argonConfig.headroom){
	var headroom = new Headroom(document.querySelector("body"),{
		"tolerance" : {
			up : 0,
			down : 0
		},
		"offset": 0,
			"classes": {
			"initial": "with-headroom",
			"pinned": "headroom---pinned",
			"unpinned": "headroom---unpinned",
			"top": "headroom---top",
			"notTop": "headroom---not-top",
			"bottom": "headroom---bottom",
			"notBottom": "headroom---not-bottom",
			"frozen": "headroom---frozen"
		}
	}).init();
}

/* 浮动按钮栏相关 （回顶等） */
!function(){
	let $fabtns = $('#float_action_buttons');
	let $backToTopBtn = $('#fabtn_back_to_top');
	let $toggleSidesBtn = $('#fabtn_toggle_sides');
	let $toggleDarkmode = $('#fabtn_toggle_darkmode');
	let $toggleAmoledMode = $('#blog_setting_toggle_darkmode_and_amoledarkmode');
	let $toggleBlogSettings = $('#fabtn_toggle_blog_settings_popup');
	let $goToComment = $('#fabtn_go_to_comment');

	let $readingProgressBar = $('#fabtn_reading_progress_bar');
	let $readingProgressDetails = $('#fabtn_reading_progress_details');

	let isScrolling = false;
	$backToTopBtn.on("click" , function(){
		if (!isScrolling){
			isScrolling = true;
			setTimeout(function(){
				isScrolling = false;
			} , 600);
			$("body,html").animate({
				scrollTop: 0
			}, 600);
		}
	});

	$toggleDarkmode.on("click" , function(){
		toggleDarkmode();
	});

	$toggleAmoledMode.on("click" , function(){
		toggleAmoledDarkMode();
	})

	let $commentTarget = $("#post_comment:not([hidden]), #comments:not([hidden])").first();
	if ($commentTarget.length > 0){
		$("#fabtn_go_to_comment").removeClass("d-none");
	}else{
		$("#fabtn_go_to_comment").addClass("d-none");
	}
	$goToComment.on("click" , function(){
		let $target = $("#post_comment:not([hidden]), #comments:not([hidden])").first();
		if ($target.length > 0){
			gotoHash("#" + $target.attr("id") , 600);
		}
		$("#post_comment_content").focus();
	});

	if (localStorage['Argon_fabs_Floating_Status'] == "left"){
		$fabtns.addClass("fabtns-float-left");
	}
	$toggleSidesBtn.on("click" , function(){
		$fabtns.addClass("fabtns-unloaded");
		setTimeout(function(){
			$fabtns.toggleClass("fabtns-float-left");
			if ($fabtns.hasClass("fabtns-float-left")){
				localStorage['Argon_fabs_Floating_Status'] = "left";
			}else{
				localStorage['Argon_fabs_Floating_Status'] = "right";
			}
			$fabtns.removeClass("fabtns-unloaded");
		} , 300);
	});
	// 博客设置
	$toggleBlogSettings.on("click" , function(){
		$("#float_action_buttons").toggleClass("blog_settings_opened");
	});
	$("#close_blog_settings").on("click" , function(){
		$("#float_action_buttons").removeClass("blog_settings_opened");
	});
	$("#blog_setting_darkmode_switch .custom-toggle-slider").on("click" , function(){
		toggleDarkmode();
	});
	// 字体
	$("#blog_setting_font_sans_serif").on("click" , function(){
		$("html").removeClass("use-serif");
		localStorage['Argon_Use_Serif'] = "false";
	});
	$("#blog_setting_font_serif").on("click" , function(){
		$("html").addClass("use-serif");
		localStorage['Argon_Use_Serif'] = "true";
	});
	if (localStorage['Argon_Use_Serif'] == "true"){
		$("html").addClass("use-serif");
	}else if (localStorage['Argon_Use_Serif'] == "false"){
		$("html").removeClass("use-serif");
	}
	// 阴影
	$("#blog_setting_shadow_small").on("click" , function(){
		$("html").removeClass("use-big-shadow");
		localStorage['Argon_Use_Big_Shadow'] = "false";
	});
	$("#blog_setting_shadow_big").on("click" , function(){
		$("html").addClass("use-big-shadow");
		localStorage['Argon_Use_Big_Shadow'] = "true";
	});
	if (localStorage['Argon_Use_Big_Shadow'] == "true"){
		$("html").addClass("use-big-shadow");
	}else if (localStorage['Argon_Use_Big_Shadow'] == "false"){
		$("html").removeClass("use-big-shadow");
	}
	// 滤镜
	function setBlogFilter(name){
		if (name == undefined || name == ""){
			name = "off";
		}
		if (!$("html").hasClass("filter-" + name)){
			$("html").removeClass("filter-sunset filter-darkness filter-grayscale");
			if (name != "off"){
				$("html").addClass("filter-" + name);
			}
		}
		$("#blog_setting_filters .blog-setting-filter-btn").removeClass("active");
		$("#blog_setting_filters .blog-setting-filter-btn[filter-name='" + name + "']").addClass("active");
		localStorage['Argon_Filter'] = name;
	}
	setBlogFilter(localStorage['Argon_Filter']);
	$(".blog-setting-filter-btn").on("click" , function(){
		setBlogFilter(this.getAttribute("filter-name"));
	});

	function changefabtnDisplayStatus(){
		// 阅读进度
		let readingProgress = $(window).scrollTop() / Math.max($(document).height() - $(window).height(), 0.01);
		$readingProgressDetails.html((readingProgress * 100).toFixed(0) + "%");
		$readingProgressBar.css("width" , (readingProgress * 100).toFixed(0) + "%");
		// 是否显示回顶
		if ($(window).scrollTop() >= 400 || readingProgress >= 0.5){
			$backToTopBtn.removeClass("fabtn-hidden");
		}else{
			$backToTopBtn.addClass("fabtn-hidden");
		}
	}
	changefabtnDisplayStatus();
	$(window).scroll(function(){
		changefabtnDisplayStatus();
	});
	$fabtns.removeClass("fabtns-unloaded");
}();

/* 卡片圆角大小调整：滑块只在用户打开设置面板时加载。 */
var argonOptionalScriptPromises = {};
function argonLoadOptionalScript(name, ready){
	if (ready && ready()){
		return Promise.resolve();
	}
	let urls = window.argonOptionalAssets || {};
	let src = urls[name];
	if (!src){
		return Promise.reject(new Error('Optional asset URL is unavailable'));
	}
	if (argonOptionalScriptPromises[src]){
		return argonOptionalScriptPromises[src];
	}
	let promise = new Promise(function(resolve, reject){
		let existing = document.querySelector("script[data-argon-optional-script='" + name + "']");
		if (existing){
			if (existing.getAttribute('data-argon-optional-loaded') == 'true' && (!ready || ready())){
				resolve();
				return;
			}
			if (existing.getAttribute('data-argon-optional-loaded') == 'true'){
				if (existing.parentNode) existing.parentNode.removeChild(existing);
				reject(new Error('Optional asset did not expose its expected global'));
				return;
			}
			existing.addEventListener('load', function(){
				if (!ready || ready()){
					existing.setAttribute('data-argon-optional-loaded', 'true');
					 resolve();
				}else{
					if (existing.parentNode) existing.parentNode.removeChild(existing);
					reject(new Error('Optional asset did not expose its expected global'));
				}
			}, {once: true});
			existing.addEventListener('error', function(){
				if (existing.parentNode) existing.parentNode.removeChild(existing);
				reject(new Error('Optional asset failed to load'));
			}, {once: true});
			return;
		}
		let script = document.createElement('script');
		script.src = src;
		script.async = true;
		script.setAttribute('data-argon-optional-script', name);
		script.addEventListener('load', function(){
			if (!ready || ready()){
				script.setAttribute('data-argon-optional-loaded', 'true');
				resolve();
			}else{
				if (script.parentNode) script.parentNode.removeChild(script);
				reject(new Error('Optional asset did not expose its expected global'));
			}
		}, {once: true});
		script.addEventListener('error', function(){
			if (script.parentNode) script.parentNode.removeChild(script);
			reject(new Error('Optional asset failed to load'));
		}, {once: true});
		document.head.appendChild(script);
	});
	argonOptionalScriptPromises[src] = promise.catch(function(error){
		delete argonOptionalScriptPromises[src];
		throw error;
	});
	return argonOptionalScriptPromises[src];
}

var argonOptionalStylePromises = {};
function argonLoadOptionalStyle(name){
	let urls = window.argonOptionalAssets || {};
	let src = urls[name];
	if (!src){
		return Promise.reject(new Error('Optional stylesheet URL is unavailable'));
	}
	if (argonOptionalStylePromises[src]){
		return argonOptionalStylePromises[src];
	}
	let existing = null;
	Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function(candidate){
		if (candidate.getAttribute('href') == src || candidate.href == new URL(src, window.location.href).href){
			existing = candidate;
			return true;
		}
		return false;
	});
	if (existing){
		if (existing.getAttribute('data-argon-optional-style-loaded') == 'true'){
			argonOptionalStylePromises[src] = Promise.resolve(existing);
			return argonOptionalStylePromises[src];
		}
		if (existing.getAttribute('data-argon-optional-style')){
			argonOptionalStylePromises[src] = new Promise(function(resolve, reject){
				existing.addEventListener('load', function(){
					existing.setAttribute('data-argon-optional-style-loaded', 'true');
					resolve(existing);
				}, {once: true});
				existing.addEventListener('error', function(){
					if (existing.parentNode) existing.parentNode.removeChild(existing);
					reject(new Error('Optional stylesheet failed to load'));
				}, {once: true});
			}).catch(function(error){
				delete argonOptionalStylePromises[src];
				throw error;
			});
			return argonOptionalStylePromises[src];
		}
		argonOptionalStylePromises[src] = Promise.resolve(existing);
		return argonOptionalStylePromises[src];
	}
	argonOptionalStylePromises[src] = new Promise(function(resolve, reject){
		let link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = src;
		link.setAttribute('data-argon-optional-style', name);
		link.addEventListener('load', function(){
			link.setAttribute('data-argon-optional-style-loaded', 'true');
			resolve(link);
		}, {once: true});
		link.addEventListener('error', function(){
			if (link.parentNode) link.parentNode.removeChild(link);
			reject(new Error('Optional stylesheet failed to load'));
		}, {once: true});
		document.head.appendChild(link);
	}).catch(function(error){
		delete argonOptionalStylePromises[src];
		throw error;
	});
	return argonOptionalStylePromises[src];
}

var argonCodeAssetsPromise = null;
function argonLoadCodeAssets(){
	if (typeof(window.hljs) != 'undefined' && typeof(window.hljs.lineNumbersBlock) == 'function' && typeof(window.ClipboardJS) == 'function'){
		return Promise.resolve();
	}
	if (argonCodeAssetsPromise){
		return argonCodeAssetsPromise;
	}
	let scripts = Promise.resolve();
	if (typeof(window.hljs) == 'undefined'){
		scripts = scripts.then(function(){
			return argonLoadOptionalScript('highlight', function(){ return typeof(window.hljs) != 'undefined'; });
		});
	}
	if (typeof(window.hljs) == 'undefined' || typeof(window.hljs.lineNumbersBlock) != 'function'){
		scripts = scripts.then(function(){
			return argonLoadOptionalScript('highlightLineNumbers', function(){ return typeof(window.hljs) != 'undefined' && typeof(window.hljs.lineNumbersBlock) == 'function'; });
		});
	}
	if (typeof(window.ClipboardJS) == 'undefined'){
		scripts = scripts.then(function(){
			return argonLoadOptionalScript('clipboard', function(){ return typeof(window.ClipboardJS) != 'undefined'; });
		});
	}
	argonCodeAssetsPromise = Promise.all([argonLoadOptionalStyle('highlightStyle'), scripts]);
	return argonCodeAssetsPromise;
}

var argonMathLoadPromise = null;
function argonHasMathContent(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	var content = root.matches && root.matches('article') ? root : root.querySelector('article #post_content, article');
	if (!content) return false;
	if (content.querySelector('.katex, .MathJax, mjx-container, [data-math]')) return true;
	var textNodes = content.querySelectorAll('p, li, td, th, blockquote, h1, h2, h3, h4, h5, h6');
	for (var index = 0; index < textNodes.length; index += 1){
		if (/(?:\$\$|\\\(|\\\[|\$[^$\r\n]+\$)/.test(textNodes[index].textContent || '')) return true;
	}
	return false;
}

function argonLoadMathAssets(){
	var config = window.argonMathConfig || {};
	var renderer = config.renderer;
	var urls = window.argonOptionalAssets || {};
	if (!config.enabled || !renderer){
		return Promise.reject(new Error('Math rendering is disabled'));
	}
	if (renderer == 'mathjax3' && typeof(window.MathJax) != 'undefined' && typeof(window.MathJax.typesetPromise) == 'function'){
		return Promise.resolve();
	}
	if (renderer == 'mathjax2' && typeof(window.MathJax) != 'undefined' && window.MathJax.Hub){
		return Promise.resolve();
	}
	if (renderer == 'katex' && typeof(window.renderMathInElement) == 'function'){
		return Promise.resolve();
	}
	if (argonMathLoadPromise){
		return argonMathLoadPromise;
	}
	if (renderer == 'mathjax3'){
		window.MathJax = {
			tex: {
				inlineMath: [['$', '$'], ['\\(', '\\)']],
				displayMath: [['$$', '$$'], ['\\[', '\\]']],
				processEscapes: true,
				packages: {'[+]': ['noerrors']}
			},
			options: {
				skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
				ignoreHtmlClass: 'tex2jax_ignore',
				processHtmlClass: 'tex2jax_process'
			},
			loader: {load: ['[tex]/noerrors']}
		};
		argonMathLoadPromise = argonLoadOptionalScript('mathjax3', function(){
			return typeof(window.MathJax) != 'undefined' && typeof(window.MathJax.typesetPromise) == 'function';
		});
	}else if (renderer == 'mathjax2'){
		window.MathJax = window.MathJax || {};
		window.MathJax.messageStyle = 'none';
		window.MathJax.tex2jax = {
			inlineMath: [['$', '$'], ['\\(', '\\)']],
			displayMath: [['$$', '$$'], ['\\[', '\\]']],
			processEscapes: true,
			skipTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
		};
		window.MathJax.menuSettings = {zoom: 'Hover', zscale: '200%'};
		window.MathJax['HTML-CSS'] = {showMathMenu: 'false'};
		argonMathLoadPromise = argonLoadOptionalScript('mathjax2', function(){
			return typeof(window.MathJax) != 'undefined' && !!window.MathJax.Hub;
		}).then(function(){
			if (window.MathJax.Hub && typeof(window.MathJax.Hub.Config) == 'function'){
				window.MathJax.Hub.Config({
					messageStyle: 'none',
					tex2jax: {
						inlineMath: [['$', '$'], ['\\(', '\\)']],
						displayMath: [['$$', '$$'], ['\\[', '\\]']],
						processEscapes: true,
						skipTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
					},
					menuSettings: {zoom: 'Hover', zscale: '200%'},
					'HTML-CSS': {showMathMenu: 'false'}
				});
			}
		});
	}else if (renderer == 'katex'){
		argonMathLoadPromise = Promise.all([
			argonLoadOptionalStyle('katexCss'),
			argonLoadOptionalScript('katex', function(){ return typeof(window.katex) != 'undefined'; })
		]).then(function(){
			return argonLoadOptionalScript('katexAutoRender', function(){ return typeof(window.renderMathInElement) == 'function'; });
		});
	}else{
		argonMathLoadPromise = Promise.reject(new Error('Unknown math renderer'));
	}
	return argonMathLoadPromise;
}

function initCardRadius(root){
	root = root && typeof(root.querySelector) == 'function' ? root : document;
	let slider = root.querySelector('#blog_setting_card_radius');
	if (!slider || slider.noUiSlider){
		return;
	}
	if (typeof window.noUiSlider == 'undefined'){
		let settingsButton = root.querySelector('#fabtn_toggle_blog_settings_popup');
		if (settingsButton && settingsButton.getAttribute('data-argon-nouislider-bound') != 'true'){
			settingsButton.setAttribute('data-argon-nouislider-bound', 'true');
			settingsButton.addEventListener('click', function(){
				argonLoadOptionalScript('nouislider', function(){ return typeof window.noUiSlider != 'undefined'; })
					.then(initCardRadius).catch(function(){});
			});
		}
		return;
	}
	document.documentElement.style.setProperty('--card-radius', localStorage["argon_card_radius"] == undefined ? $("meta[name='theme-card-radius']").attr("content") + "px" : localStorage["argon_card_radius"] + "px");
	noUiSlider.create(slider, {
		start: [localStorage["argon_card_radius"] == undefined ? $("meta[name='theme-card-radius']").attr("content") : localStorage["argon_card_radius"]],
		step: 0.5,
		connect: [true, false],
		range: {
			'min': [0],
			'max': [30]
		}
	});
	slider.noUiSlider.on('update', function (values){
			document.documentElement.style.setProperty('--card-radius', values[0] + "px");
	});
	slider.noUiSlider.on('set', function (values){
			localStorage["argon_card_radius"] = values[0];
		});
	$(document).off("click.argonCardRadius", "#blog_setting_card_radius_to_default").on("click.argonCardRadius", "#blog_setting_card_radius_to_default", function(){
		slider.noUiSlider.set($("meta[name='theme-card-radius']").attr("content"));
		document.documentElement.style.setProperty('--card-radius', $("meta[name='theme-card-radius']").attr("content") + "px");
		localStorage.removeItem("argon_card_radius");
	});
}
initCardRadius();
/* Hugo 不提供 WordPress password form；保留原生提交，避免调用已移除的 PJAX API。 */
/* URL 中 # 根据 ID 定位 */
function gotoHash(hash , durtion){
	if (hash.length == 0){
		return;
	}
	if ($(hash).length == 0){
		return;
	}
	if (durtion == null){
		durtion = 200;
	}
	$("body,html").animate({
		scrollTop: $(hash).offset().top - 80
	}, durtion);
}
function getHash(url){
	return url.substring(url.indexOf('#'));
}
!function(){
	$(window).on("hashchange" , function(){
		hash = window.location.hash;
		gotoHash(hash);
	});
	$(window).trigger("hashchange");
}();

var argonOutdateModulePromise = null;
function argonLoadOutdateModule(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	if (!root.querySelector('#primary #post_outdate_toast')){
		return;
	}
	if (typeof(window.argonOutdateToastInit) == 'function'){
		window.argonOutdateToastInit(root);
		return;
	}
	if (!argonOutdateModulePromise){
		argonOutdateModulePromise = argonLoadOptionalScript('outdateModule', function(){
			return typeof(window.argonOutdateToastInit) == 'function';
		}).catch(function(error){
			argonOutdateModulePromise = null;
			throw error;
		});
	}
	argonOutdateModulePromise.then(function(){
		if (root === document || (root && root.isConnected !== false && document.documentElement.contains(root))){
			window.argonOutdateToastInit(root);
		}
	}).catch(function(){});
}

var argonCommentImageModulePromise = null;
function argonLoadCommentImageModule(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	if (!root.querySelector('.comment-item-text .comment-image')){
		return;
	}
	if (typeof(window.argonCommentImageInit) == 'function'){
		window.argonCommentImageInit(root);
		return;
	}
	if (!argonCommentImageModulePromise){
		argonCommentImageModulePromise = argonLoadOptionalScript('commentImageModule', function(){
			return typeof(window.argonCommentImageInit) == 'function';
		}).catch(function(error){
			argonCommentImageModulePromise = null;
			throw error;
		});
	}
	argonCommentImageModulePromise.then(function(){
		if (root === document || (root && root.isConnected !== false && document.documentElement.contains(root))){
			window.argonCommentImageInit(root);
		}
	}).catch(function(){});
}

var argonCollapseModulePromise = null;
function argonLoadCollapseModule(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	if (!root.querySelector('.collapse-block')){
		return;
	}
	if (typeof(window.argonCollapseInit) == 'function'){
		window.argonCollapseInit(root);
		return;
	}
	if (!argonCollapseModulePromise){
		argonCollapseModulePromise = argonLoadOptionalScript('collapseModule', function(){
			return typeof(window.argonCollapseInit) == 'function';
		}).catch(function(error){
			argonCollapseModulePromise = null;
			throw error;
		});
	}
	argonCollapseModulePromise.then(function(){
		if (root === document || (root && root.isConnected !== false && document.documentElement.contains(root))){
			window.argonCollapseInit(root);
		}
	}).catch(function(){});
}

var argonPanguModulePromise = null;
function argonLoadPanguModule(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	if (argonConfig.pangu !== true || !root.querySelector('#post_content')){
		return;
	}
	if (typeof(window.argonPanguInit) == 'function'){
		window.argonPanguInit(root);
		return;
	}
	if (!argonPanguModulePromise){
		var vendorPromise = window.pangu && typeof(window.pangu.spacingElementById) == 'function' ? Promise.resolve() :
			argonLoadOptionalScript('panguVendor', function(){
				return window.pangu && typeof(window.pangu.spacingElementById) == 'function';
			});
		argonPanguModulePromise = vendorPromise.then(function(){
			return argonLoadOptionalScript('panguModule', function(){
				return typeof(window.argonPanguInit) == 'function';
			});
		}).catch(function(error){
			argonPanguModulePromise = null;
			throw error;
		});
	}
	argonPanguModulePromise.then(function(){
		if (root === document || (root && root.isConnected !== false && document.documentElement.contains(root))){
			window.argonPanguInit(root);
		}
	}).catch(function(){});
}

var argonClampModulePromise = null;
function argonLoadClampModule(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	if (!root.querySelector('.clamp')){
		return;
	}
	if (typeof(window.argonClampInit) == 'function'){
		window.argonClampInit(root);
		return;
	}
	if (!argonClampModulePromise){
		argonClampModulePromise = argonLoadOptionalScript('clampModule', function(){
			return typeof(window.argonClampInit) == 'function';
		}).catch(function(error){
			argonClampModulePromise = null;
			throw error;
		});
	}
	argonClampModulePromise.then(function(){
		if (root === document || (root && root.isConnected !== false && document.documentElement.contains(root))){
			window.argonClampInit(root);
		}
	}).catch(function(){});
}

var argonZoomifyModulePromise = null;
function argonLoadZoomifyModule(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	if (argonConfig.zoomify === false || !root.querySelector('#post_content img')){
		return;
	}
	if (!argonZoomifyModulePromise){
		var vendorPromise = typeof($.fn.zoomify) == 'function' ? Promise.resolve() :
			argonLoadOptionalScript('zoomifyVendor', function(){
				return typeof($.fn.zoomify) == 'function';
			});
		argonZoomifyModulePromise = vendorPromise.then(function(){
			return argonLoadOptionalScript('zoomifyModule', function(){
				return typeof(window.argonZoomifyInit) == 'function';
			});
		}).catch(function(error){
			argonZoomifyModulePromise = null;
			throw error;
		});
	}
	argonZoomifyModulePromise.then(function(){
		if (root === document || (root && root.isConnected !== false && document.documentElement.contains(root))){
			window.argonZoomifyInit(root);
		}
	}).catch(function(){});
}

var argonLazyloadModulePromise = null;
function argonLoadLazyloadModule(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	var hasLazyloadNodes = root.querySelector('article img.lazyload, .post-thumbnail.lazyload, .related-post-thumbnail.lazyload, .comment-item-text .comment-sticker.lazyload');
	if (argonConfig.lazyload === false || !hasLazyloadNodes){
		return;
	}
	if (!argonLazyloadModulePromise){
		var vendorPromise = typeof($.fn.lazyload) == 'function' ? Promise.resolve() :
			argonLoadOptionalScript('lazyloadVendor', function(){
				return typeof($.fn.lazyload) == 'function';
			});
		argonLazyloadModulePromise = vendorPromise.then(function(){
			return argonLoadOptionalScript('lazyloadModule', function(){
				return typeof(window.argonLazyloadInit) == 'function';
			});
		}).catch(function(error){
			argonLazyloadModulePromise = null;
			throw error;
		});
	}
	argonLazyloadModulePromise.then(function(){
		if (root === document || (root && root.isConnected !== false && document.documentElement.contains(root))){
			window.argonLazyloadInit(root);
		}
	}).catch(function(){});
}

var argonSearchModulePromise = null;
function argonLoadSearchModule(root){
	root = root && typeof(root.querySelector) == 'function' ? root : document;
	var input = root.querySelector('#local-search-input');
	if (!input){
		return;
	}
	var loadSearchModule = function(){
		if (typeof(window.argonSearchInit) == 'function'){
			window.argonSearchInit(root);
			return;
		}
		if (!argonSearchModulePromise){
			argonSearchModulePromise = argonLoadOptionalScript('searchModule', function(){
				return typeof(window.argonSearchInit) == 'function';
			}).catch(function(error){
				argonSearchModulePromise = null;
				throw error;
			});
		}
		argonSearchModulePromise.then(function(){
			if (root === document || (root && root.isConnected !== false && document.documentElement.contains(root))){
				window.argonSearchInit(root);
			}
		}).catch(function(){});
	};
	if (input.getAttribute('data-argon-search-trigger-bound') != 'true'){
		input.addEventListener('focus', loadSearchModule);
		input.addEventListener('click', loadSearchModule);
		input.setAttribute('data-argon-search-trigger-bound', 'true');
	}
	if (document.activeElement === input){
		loadSearchModule();
	}
}

/* Optional Zoomify module */
/* 页面生命周期：由 navigation.js 在首次加载和跨路径替换后统一调用。 */
function argonInitHeadIndex(root){
	root = root && typeof(root.querySelector) == 'function' ? root : document;
	let catalog = root.querySelector('#leftbar_catalog');
	let article = root.querySelector('#post_content');
	let tabs = root.querySelector('#leftbar_page_tabs');
	let catalogButton = root.querySelector('#leftbar_tab_catalog_btn');
	let overviewButton = root.querySelector('#leftbar_tab_overview_btn');
	let catalogPane = root.querySelector('#leftbar_tab_catalog');
	let overviewPane = root.querySelector('#leftbar_tab_overview');
	if (!catalog || !tabs || !catalogButton || !overviewButton || !catalogPane || !overviewPane){
		return;
	}

	let hasHeadings = !!(article && article.querySelector('h1,h2,h3,h4,h5,h6'));
	tabs.style.display = hasHeadings ? '' : 'none';
	catalogButton.classList.toggle('active', hasHeadings);
	catalogButton.classList.toggle('show', hasHeadings);
	overviewButton.classList.toggle('active', !hasHeadings);
	overviewButton.classList.toggle('show', !hasHeadings);
	catalogPane.classList.toggle('active', hasHeadings);
	catalogPane.classList.toggle('show', hasHeadings);
	overviewPane.classList.toggle('active', !hasHeadings);
	overviewPane.classList.toggle('show', !hasHeadings);

	let headIndex = $(document).data('headIndex');
	if (headIndex && headIndex.indexBox){
		headIndex.indexBox.off('.headindex').off('.argonHeadIndex');
	}
	catalog.replaceChildren();
	if (!headIndex && hasHeadings && typeof($.fn.headIndex) == 'function'){
		$(document).headIndex({
			articleWrapSelector: '#post_content',
			indexBoxSelector: '#leftbar_catalog',
			subItemBoxClass: 'index-subItem-box',
			itemClass: 'index-item',
			linkClass: 'index-link',
			offset: 80
		});
		return;
	}
	if (!headIndex){
		return;
	}

	headIndex.articleWrap = article ? $(article) : $();
	headIndex.headerList = headIndex.articleWrap.find(':header');
	headIndex.indexBox = $(catalog);
	headIndex.scrollBody = $(headIndex.settings.scrollSelector);
	headIndex.manual = false;
	headIndex.autoId = 1;
	headIndex.initHeader();
	if (hasHeadings){
		let manualValTimer = null;
		headIndex.indexBox.on('click.argonHeadIndex', function(event){
			let target = $(event.target);
			if (!target.hasClass(headIndex.settings.linkClass)){
				return;
			}
			event.preventDefault();
			let indexItem = target.parent('.' + headIndex.settings.itemClass);
			headIndex.manual = true;
			if (manualValTimer){
				clearTimeout(manualValTimer);
			}
			manualValTimer = setTimeout(function(){headIndex.manual = false;}, 300);
			headIndex.current(indexItem);
			headIndex.scrollTo(event.target.getAttribute('href'));
		});
		headIndex.updateCurrent();
	}
}

function argonInitShare(root){
	if (!root || typeof(root.querySelector) != 'function'){
		return;
	}
	let share = root.querySelector('#share');
	if (!share || share.getAttribute('data-initialized') == 'true' || typeof(socialShare) != 'function'){
		return;
	}
	socialShare('#share', {
		title: share.getAttribute('data-share-title') || document.title,
		description: share.getAttribute('data-share-description') || '',
		wechatQrcodeTitle: __('分享到微信'),
		wechatQrcodeHelper: __('微信扫描二维码'),
		source: share.getAttribute('data-share-source') || window.location.href
	});
	share.setAttribute('data-initialized', 'true');
}

var argonShareModulePromise = null;
function argonLoadShareModule(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	if (!root.querySelector('#share_container')){
		return;
	}
	if (window.argonShareModuleReady === true){
		return;
	}
	if (!argonShareModulePromise){
		var vendorPromise = typeof(window.socialShare) == 'function' ? Promise.resolve() :
			argonLoadOptionalScript('shareVendor', function(){
				return typeof(window.socialShare) == 'function';
			});
		argonShareModulePromise = vendorPromise.then(function(){
			return argonLoadOptionalScript('shareModule', function(){
				return window.argonShareModuleReady === true;
			});
		}).then(function(){
			argonInitShare(root);
		}).catch(function(error){
			argonShareModulePromise = null;
			throw error;
		});
	}
	argonShareModulePromise.catch(function(){});
}

function argonRenderMath(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	if (!argonHasMathContent(root)) return;
	function isCurrentRoot(){
		return root === document || (root && root.isConnected !== false && document.documentElement.contains(root));
	}
	var config = window.argonMathConfig || {};
	try{
		if (!isCurrentRoot()) return;
		if (config.renderer == 'mathjax3' && window.MathJax && typeof(window.MathJax.typesetPromise) == 'function'){
			window.MathJax.typesetPromise([root]).catch(function(){});
		}else if (config.renderer == 'mathjax2' && window.MathJax && window.MathJax.Hub && typeof(window.MathJax.Hub.Queue) == 'function'){
			window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, root]);
		}else if (config.renderer == 'katex' && typeof(renderMathInElement) == 'function'){
			renderMathInElement(root, {
				delimiters: [
					{left: '$$', right: '$$', display: true},
					{left: '\\[', right: '\\]', display: true},
					{left: '$', right: '$', display: false},
					{left: '\\(', right: '\\)', display: false}
				]
			});
		}else if (config.enabled){
			argonLoadMathAssets().then(function(){
				if (isCurrentRoot()) argonRenderMath(root);
			}).catch(function(){});
		}
	}catch (err){
		console.error('Argon math rendering failed', err);
	}
}

function argonInitPage(root){
	root = root || document;
	argonLoadBannerModule();
	argonLoadLazyloadModule(root);
	argonLoadZoomifyModule(root);
	argonLoadCodeModule(root);
	argonLoadShareModule(root);
	argonLoadPanguModule(root);
	argonLoadClampModule(root);
	leftbarStickyInit();
	argonLoadHitokotoModule(root);
	argonInitHeadIndex(root);
	argonInitShare(root);
	initCardRadius(root);
	initArgonThemeColorPicker(root);
	argonLoadSearchModule(document);
	argonLoadGithubModule(root);
	argonLoadOutdateModule(root);
	argonLoadCommentImageModule(root);
	argonLoadCollapseModule(root);
	scheduleHumanTimesOnPage(root);
	argonRenderMath(root);
	if (typeof(window.pjaxLoaded) == 'function'){
		try{
			window.pjaxLoaded();
		}catch (err){
			console.error(err);
		}
	}
}
window.argonInitPage = argonInitPage;


/* Tags Dialog pjax 加载后自动关闭 */
$(document).on("click" , "#blog_tags .tag" , function(){
	$("#blog_tags button.close").trigger("click");
});
$(document).on("click" , "#blog_categories .tag" , function(){
	$("#blog_categories button.close").trigger("click");
});

/* 侧栏 & 顶栏菜单手机适配 */
!function(){
	$(document).on("click" , "#fabtn_open_sidebar" , function(){
		$("html").addClass("leftbar-opened");
	});
	$(document).on("click" , "#sidebar_mask" , function(){
		$("html").removeClass("leftbar-opened");
	});
	$(document).on("click" , "#leftbar a[href]:not([no-pjax]):not([href^='#'])" , function(){
		$("html").removeClass("leftbar-opened");
	});
	$(document).on("click" , "#navbar_global.show .navbar-nav a[href]:not([no-pjax]):not([href^='#'])" , function(){
		$("#navbar_global .navbar-toggler").click();
	});
	$(document).on("click" , "#navbar_global.show #navbar_search_btn_mobile" , function(){
		$("#navbar_global .navbar-toggler").click();
	});
}();

var argonGithubModulePromise = null;
function argonLoadGithubModule(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	if (!root.querySelector('.github-info-card')){
		return;
	}
	if (typeof(window.argonGithubInfoCardInit) == 'function'){
		window.argonGithubInfoCardInit(root);
		return;
	}
	if (!argonGithubModulePromise){
		argonGithubModulePromise = argonLoadOptionalScript('githubModule', function(){
			return typeof(window.argonGithubInfoCardInit) == 'function';
		}).catch(function(error){
			argonGithubModulePromise = null;
			throw error;
		});
	}
	argonGithubModulePromise.then(function(){
		if (root === document || (root && root.isConnected !== false && document.documentElement.contains(root))){
			window.argonGithubInfoCardInit(root);
		}
	}).catch(function(){});
}

// 颜色计算
function rgb2hsl(R,G,B){
	let r = R / 255;
	let g = G / 255;
	let b = B / 255;

	let var_Min = Math.min(r, g, b);
	let var_Max = Math.max(r, g, b);
	let del_Max = var_Max - var_Min;

	let H, S, L = (var_Max + var_Min) / 2;

	if (del_Max == 0){
		H = 0;
		S = 0;
	}else{
		if (L < 0.5){
			S = del_Max / (var_Max + var_Min);
		}else{
			S = del_Max / (2 - var_Max - var_Min);
		}

		del_R = (((var_Max - r) / 6) + (del_Max / 2)) / del_Max;
		del_G = (((var_Max - g) / 6) + (del_Max / 2)) / del_Max;
		del_B = (((var_Max - b) / 6) + (del_Max / 2)) / del_Max;

		if (r == var_Max){
			H = del_B - del_G;
		}
		else if (g == var_Max){
			H = (1 / 3) + del_R - del_B;
		}
		else if (b == var_Max){
			H = (2 / 3) + del_G - del_R;
		}
		if (H < 0) H += 1;
		if (H > 1) H -= 1;
	}
	return {
		'h': H, // 0~1
		's': S,
		'l': L
	};
}
function Hue_2_RGB(v1,v2,vH){
	if (vH < 0) vH += 1;
	if (vH > 1) vH -= 1;
	if ((6 * vH) < 1) return (v1 + (v2 - v1) * 6 * vH);
	if ((2 * vH) < 1) return v2;
	if ((3 * vH) < 2) return (v1 + (v2 - v1) * ((2 / 3) - vH) * 6);
	return v1;
}
function hsl2rgb(h,s,l){
	let r, g, b, var_1, var_2;
	if (s == 0){
		r = l;
		g = l;
		b = l;
	}
	else{
		if (l < 0.5){
			var_2 = l * (1 + s);
		}
		else{
			var_2 = (l + s) - (s * l);
		}
		var_1 = 2 * l - var_2;
		r = Hue_2_RGB(var_1, var_2, h + (1 / 3));
		g = Hue_2_RGB(var_1, var_2, h);
		b = Hue_2_RGB(var_1, var_2, h - (1 / 3));
	}
	return {
		'R': Math.round(r * 255), // 0~255
		'G': Math.round(g * 255),
		'B': Math.round(b * 255),
		'r': r, // 0~1
		'g': g,
		'b': b
	};
}
function rgb2hex(r,g,b){
	let hex = new Array('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F');
	let rh, gh, bh;
	rh = "", gh ="", bh="";
	while (rh.length < 2){
		rh = hex[r%16] + rh;
		r = Math.floor(r / 16);
	}
	while (gh.length < 2){
		gh = hex[g%16] + gh;
		g = Math.floor(g / 16);
	}
	while (bh.length < 2){
		bh = hex[b%16] + bh;
		b = Math.floor(b / 16);
	}
	return "#" + rh + gh + bh;
}
function hex2rgb(hex){
	// hex: #XXXXXX
	let dec = {
		'0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15
	};
	return {
		'R': (dec[hex.substr(1,1)] * 16 + dec[hex.substr(2,1)]), // 0~255
		'G': (dec[hex.substr(3,1)] * 16 + dec[hex.substr(4,1)]),
		'B': (dec[hex.substr(5,1)] * 16 + dec[hex.substr(6,1)]),
		'r': (dec[hex.substr(1,1)] * 16 + dec[hex.substr(2,1)]) / 255, // 0~1
		'g': (dec[hex.substr(3,1)] * 16 + dec[hex.substr(4,1)]) / 255,
		'b': (dec[hex.substr(5,1)] * 16 + dec[hex.substr(6,1)]) / 255
	};
}
function rgb2gray(R,G,B){
	return Math.round(R * 0.299 + G * 0.587 + B * 0.114);
}
function hex2gray(hex){
	let rgb_array = hex2rgb(hex);
	return hex2gray(rgb_array['R'], rgb_array['G'], rgb_array['B']);
}
function rgb2str(rgb){
	return rgb['R'] + "," + rgb['G'] + "," + rgb['B'];
}
function hex2str(hex){
	return rgb2str(hex2rgb(hex));
}
// 颜色选择器 & 切换主题色。取色器只在首次打开设置弹窗时加载。
let argonPickrLoadPromise = null;
function argonLoadPickrAssets(){
	if (window.Pickr){
		return Promise.resolve();
	}
	if (argonPickrLoadPromise){
		return argonPickrLoadPromise;
	}
	let urls = window.argonPickrAssets || {};
	let cssPromise = new Promise(function(resolve, reject){
		let existing = document.querySelector("link[data-argon-pickr-style]");
		if (existing){
			resolve(existing);
			return;
		}
		if (!urls.css){
			resolve();
			return;
		}
		let link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = urls.css;
		link.setAttribute('data-argon-pickr-style', 'true');
		link.onload = function(){ resolve(link); };
		link.onerror = function(){ reject(new Error('Pickr stylesheet failed to load')); };
		document.head.appendChild(link);
	});
	let scriptPromise = new Promise(function(resolve, reject){
		if (!urls.js){
			reject(new Error('Pickr script URL is unavailable'));
			return;
		}
		let script = document.createElement('script');
		script.src = urls.js;
		script.onload = function(){ resolve(); };
		script.onerror = function(){ reject(new Error('Pickr script failed to load')); };
		document.head.appendChild(script);
	});
	argonPickrLoadPromise = Promise.all([cssPromise, scriptPromise]);
	return argonPickrLoadPromise;
}

function initArgonThemeColorPicker(root){
	root = root && typeof(root.querySelector) == 'function' ? root : document;
	// 颜色选择器 & 切换主题色
	let pickerElement = root.querySelector('#theme-color-picker');
	if ($("meta[name='argon-enable-custom-theme-color']").attr("content") == 'true' && pickerElement){
		if (pickerElement.getAttribute('data-argon-pickr-initialized') == 'true'){
			return;
		}
		if (typeof(window.Pickr) != 'function'){
			let settingsButton = root.querySelector('#fabtn_toggle_blog_settings_popup');
			if (settingsButton && settingsButton.getAttribute('data-argon-pickr-bound') != 'true'){
				settingsButton.setAttribute('data-argon-pickr-bound', 'true');
				settingsButton.addEventListener('click', function(){
					argonLoadPickrAssets().then(function(){ initArgonThemeColorPicker(root); }).catch(function(){});
				}, {once: true});
			}
			return;
		}
	let themeColorPicker = new Pickr({
		el: pickerElement,
		container: 'body',
		theme: 'monolith',
		closeOnScroll: false,
		appClass: 'theme-color-picker-box',
		useAsButton: false,
		padding: 8,
		inline: false,
		autoReposition: true,
		sliders: 'h',
		disabled: false,
		lockOpacity: true,
		outputPrecision: 0,
		comparison: false,
		default: localStorage["argon_custom_theme_color"] == undefined ? ($("meta[name='theme-color']").attr("content")) : localStorage["argon_custom_theme_color"],
		swatches: ['#5e72e4', '#fa7298', '#009688', '#607d8b', '#2196f3', '#3f51b5', '#ff9700', '#109d58', '#dc4437', '#673bb7', '#212121', '#795547'],
		defaultRepresentation: 'HEX',
		showAlways: false,
		closeWithKey: 'Escape',
		position: 'top-start',
		adjustableNumbers: false,
		components: {
			palette: true,
			preview: true,
			opacity: false,
			hue: true,
			interaction: {
				hex: true,
				rgba: true,
				hsla: false,
				hsva: false,
				cmyk: false,
				input: true,
				clear: false,
				cancel: true,
				save: true
			}
		},
		strings: {
			save: __('确定'),
			clear: __('清除'),
			cancel: __('恢复博客默认')
		}
	});
	themeColorPicker.on('change', instance => {
		updateThemeColor(pickrObjectToHEX(instance), true);
	})
	themeColorPicker.on('save', (color, instance) => {
		updateThemeColor(pickrObjectToHEX(instance._color), true);
		themeColorPicker.hide();
	})
	themeColorPicker.on('cancel', instance => {
		themeColorPicker.hide();
		themeColorPicker.setColor($("meta[name='theme-color-origin']").attr("content").toUpperCase());
		updateThemeColor($("meta[name='theme-color-origin']").attr("content").toUpperCase(), false);
		localStorage.removeItem("argon_custom_theme_color");
	});
	pickerElement.setAttribute('data-argon-pickr-initialized', 'true');
}
}
initArgonThemeColorPicker();
function pickrObjectToHEX(color){
	let HEXA = color.toHEXA();
	return ("#" + HEXA[0] + HEXA[1] + HEXA[2]).toUpperCase();
}
function updateThemeColor(color, save){
	let themecolor = color;
	let themecolor_rgbstr = hex2str(themecolor);
	let RGB = hex2rgb(themecolor);
	let HSL = rgb2hsl(RGB['R'], RGB['G'], RGB['B']);

	let RGB_dark0 = hsl2rgb(HSL['h'], HSL['s'], Math.max(HSL['l'] - 0.025, 0));
	let themecolor_dark0 = rgb2hex(RGB_dark0['R'],RGB_dark0['G'],RGB_dark0['B']);

	let RGB_dark = hsl2rgb(HSL['h'], HSL['s'], Math.max(HSL['l'] - 0.05, 0));
	let themecolor_dark = rgb2hex(RGB_dark['R'], RGB_dark['G'], RGB_dark['B']);

	let RGB_dark2 = hsl2rgb(HSL['h'], HSL['s'], Math.max(HSL['l'] - 0.1, 0));
	let themecolor_dark2 = rgb2hex(RGB_dark2['R'],RGB_dark2['G'],RGB_dark2['B']);

	let RGB_dark3 = hsl2rgb(HSL['h'], HSL['s'], Math.max(HSL['l'] - 0.15, 0));
	let themecolor_dark3 = rgb2hex(RGB_dark3['R'],RGB_dark3['G'],RGB_dark3['B']);

	let RGB_light = hsl2rgb(HSL['h'], HSL['s'], Math.min(HSL['l'] + 0.1, 1));
	let themecolor_light = rgb2hex(RGB_light['R'],RGB_light['G'],RGB_light['B']);

	document.documentElement.style.setProperty('--themecolor', themecolor);
	document.documentElement.style.setProperty('--themecolor-R', RGB['R']);
	document.documentElement.style.setProperty('--themecolor-G', RGB['G']);
	document.documentElement.style.setProperty('--themecolor-B', RGB['B']);
	document.documentElement.style.setProperty('--themecolor-H', Math.round(HSL['h'] * 360));
	document.documentElement.style.setProperty('--themecolor-S', Math.round(HSL['s'] * 100));
	document.documentElement.style.setProperty('--themecolor-L', Math.round(HSL['l'] * 100));
	document.documentElement.style.setProperty('--themecolor-dark0', themecolor_dark0);
	document.documentElement.style.setProperty('--themecolor-dark', themecolor_dark);
	document.documentElement.style.setProperty('--themecolor-dark2', themecolor_dark2);
	document.documentElement.style.setProperty('--themecolor-dark3', themecolor_dark3);
	document.documentElement.style.setProperty('--themecolor-light', themecolor_light);
	document.documentElement.style.setProperty('--themecolor-rgbstr', themecolor_rgbstr);

	if (rgb2gray(RGB['R'], RGB['G'], RGB['B']) < 50){
		$("html").addClass("themecolor-toodark");
	}else{
		$("html").removeClass("themecolor-toodark");
	}

	$("meta[name='theme-color']").attr("content", themecolor);
	$("meta[name='theme-color-rgb']").attr("content", themecolor_rgbstr);

	if (save){
		localStorage["argon_custom_theme_color"] = themecolor;
	}
}
if (localStorage["argon_custom_theme_color"] != undefined){
	updateThemeColor(localStorage["argon_custom_theme_color"], false);
}

var argonBannerModulePromise = null;
function argonLoadBannerModule(){
	var bannerTitle = document.querySelector('.banner-title[data-text]');
	if (!bannerTitle){
		return;
	}
	if (typeof(window.argonBannerInit) == 'function'){
		window.argonBannerInit(document);
		return;
	}
	if (!argonBannerModulePromise){
		argonBannerModulePromise = argonLoadOptionalScript('bannerModule', function(){
			return typeof(window.argonBannerInit) == 'function';
		}).catch(function(error){
			argonBannerModulePromise = null;
			throw error;
		});
	}
	argonBannerModulePromise.then(function(){
		if (document.documentElement.contains(bannerTitle)){
			window.argonBannerInit(document);
		}
	}).catch(function(){});
}

var argonHitokotoModulePromise = null;
function argonLoadHitokotoModule(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	if (!root.querySelector('.hitokoto')){
		return;
	}
	if (typeof(window.argonHitokotoInit) == 'function'){
		window.argonHitokotoInit(root);
		return;
	}
	if (!argonHitokotoModulePromise){
		argonHitokotoModulePromise = argonLoadOptionalScript('hitokotoModule', function(){
			return typeof(window.argonHitokotoInit) == 'function';
		}).catch(function(error){
			argonHitokotoModulePromise = null;
			throw error;
		});
	}
	argonHitokotoModulePromise.then(function(){
		if (root === document || (root && root.isConnected !== false && document.documentElement.contains(root))){
			window.argonHitokotoInit(root);
		}
	}).catch(function(){});
}

/* 代码高亮模块：只有当前页面包含代码块时才加载。 */
var argonCodeModulePromise = null;
function argonLoadCodeModule(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	if (typeof(argonEnableCodeHighlight) == 'undefined' || !argonEnableCodeHighlight || !root.querySelector('article pre > code, article pre.code')){
		return;
	}
	if (typeof(window.argonHighlightJsRender) == 'function'){
		window.argonHighlightJsRender(root);
		return;
	}
	if (!argonCodeModulePromise){
		argonCodeModulePromise = argonLoadOptionalScript('codeModule', function(){
			return typeof(window.argonHighlightJsRender) == 'function';
		}).catch(function(error){
			argonCodeModulePromise = null;
			throw error;
		});
	}
	argonCodeModulePromise.then(function(){
		if (root === document || (root && root.isConnected !== false && document.documentElement.contains(root))){
			window.argonHighlightJsRender(root);
		}
	}).catch(function(){});
}

/* 时间差计算 */
function addPreZero(num, n) {
	var len = num.toString().length;
	while(len < n) {
		num = "0" + num;
		len++;
	}
	return num;
}
function humanTimeDiff(time){
	let now = new Date();
	time = new Date(time);
	let delta = now - time;
	if (delta < 0){
		delta = 0;
	}
	if (delta < 1000 * 60){
		return __("刚刚");
	}
	if (delta < 1000 * 60 * 60){
		return parseInt(delta / (1000 * 60)) + " " + __("分钟前");
	}
	if (delta < 1000 * 60 * 60 * 24){
		return parseInt(delta / (1000 * 60 * 60)) + " " + __("小时前");
	}
	let yesterday = new Date(now - 1000 * 60 * 60 * 24);
	yesterday.setHours(0);
	yesterday.setMinutes(0);
	yesterday.setSeconds(0);
	yesterday.setMilliseconds(0);
	if (time > yesterday){
		return __("昨天") + " " + time.getHours() + ":" + addPreZero(time.getMinutes(), 2);
	}
	let theDayBeforeYesterday = new Date(now - 1000 * 60 * 60 * 24 * 2);
	theDayBeforeYesterday.setHours(0);
	theDayBeforeYesterday.setMinutes(0);
	theDayBeforeYesterday.setSeconds(0);
	theDayBeforeYesterday.setMilliseconds(0);
	if (time > theDayBeforeYesterday && argonConfig.language.indexOf("zh") == 0){
		return __("前天") + " " + time.getHours() + ":" + addPreZero(time.getMinutes(), 2);
	}
	if (delta < 1000 * 60 * 60 * 24 * 30){
		return parseInt(delta / (1000 * 60 * 60 * 24)) + " " + __("天前");
	}
	let theFirstDayOfThisYear = new Date(now);
	theFirstDayOfThisYear.setMonth(0);
	theFirstDayOfThisYear.setDate(1);
	theFirstDayOfThisYear.setHours(0);
	theFirstDayOfThisYear.setMinutes(0);
	theFirstDayOfThisYear.setSeconds(0);
	theFirstDayOfThisYear.setMilliseconds(0);
	if (time > theFirstDayOfThisYear){
		if (argonConfig.dateFormat == "YMD" || argonConfig.dateFormat == "MDY"){
			return (time.getMonth() + 1) + "-" + time.getDate();
		}else{
			return time.getDate() + "-" + (time.getMonth() + 1);
		}
	}
	if (argonConfig.dateFormat == "YMD"){
		return time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate();
	}else if (argonConfig.dateFormat == "MDY"){
		return time.getDate() + "-" + (time.getMonth() + 1) + "-" + time.getFullYear();
	}else if (argonConfig.dateFormat == "DMY"){
		return time.getDate() + "-" + (time.getMonth() + 1) + "-" + time.getFullYear();
	}
}
function calcHumanTimesOnPage(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	let times = root.matches && root.matches('.human-time') ? $(root) : $('.human-time', root);
	times.each(function(){
		let timestamp = parseInt(this.getAttribute("data-time"), 10);
		if (Number.isFinite(timestamp)){
			this.textContent = humanTimeDiff(timestamp * 1000);
		}
	});
}
let humanTimeTimer = null;
let humanTimeRoot = document;
function scheduleHumanTimesOnPage(root){
	root = root && typeof(root.querySelectorAll) == 'function' ? root : document;
	humanTimeRoot = root;
	if (humanTimeTimer != null){
		clearInterval(humanTimeTimer);
		humanTimeTimer = null;
	}
	calcHumanTimesOnPage(root);
	let hasHumanTime = !!(root.matches && root.matches('.human-time')) || !!root.querySelector('.human-time');
	if (hasHumanTime){
		humanTimeTimer = setInterval(function(){ calcHumanTimesOnPage(humanTimeRoot); }, 15000);
	}
}
scheduleHumanTimesOnPage();

/* Console */
!function(){
	console.log('%cTheme: %cArgon%c-Hexo%c By solstice23', 'color: rgba(255,255,255,.6); background: #5e72e4; font-size: 15px;border-radius:5px 0 0 5px;padding:10px 0 10px 20px;','color: rgba(255,255,255,1); background: #5e72e4; font-size: 15px;border-radius:0;padding:10px 0 10px 0px;', 'color: rgba(255,255,255,.6); background: #5e72e4; font-size: 15px;padding:10px 15px 10px 0px;','color: #fff; background: #92A1F4; font-size: 15px;border-radius:0 5px 5px 0;padding:10px 20px 10px 15px;');
	console.log('%cVersion%c' + $("meta[name='theme-version']").attr("content"), 'color:#fff; background: #5e72e4;font-size: 12px;border-radius:5px 0 0 5px;padding:3px 10px 3px 10px;','color:#fff; background: #92a1f4;font-size: 12px;border-radius:0 5px 5px 0;padding:3px 10px 3px 10px;');
	console.log('%chttps://github.com/solstice23/hexo-theme-argon', 'font-size: 12px;border-radius:5px;padding:3px 10px 3px 10px;border:1px solid #5e72e4;');
}();
