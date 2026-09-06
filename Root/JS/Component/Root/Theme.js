var THEME_STORAGE_KEY = 'cutie-dark-mode';
var isDarkMode = false;
var currentTheme = 'system';
var themeMediaQuery = null;

function normalizeTheme(theme) {
	if(theme === 'true')
		return 'dark';
	if(theme === 'false')
		return 'light';
	return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system';
}

function getSystemTheme() {
	return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getResolvedTheme(theme) {
	theme = normalizeTheme(theme);
	return theme === 'system' ? getSystemTheme() : theme;
}

function isDarkThemeResolved() {
	return document.documentElement.classList.contains('dark-mode');
}

function updateThemeControls(theme, resolvedTheme) {
	var options = document.querySelectorAll('#account_theme_selector .theme-option');
	var i;

	document.documentElement.setAttribute('data-theme-preference', theme);
	document.documentElement.setAttribute('data-theme-resolved', resolvedTheme);

	for(i = 0; i < options.length; i++) {
		var selected = options[i].getAttribute('data-theme') === theme;
		options[i].classList.toggle('theme-option-active', selected);
		options[i].setAttribute('aria-checked', selected ? 'true' : 'false');
	}
}

function applyTheme(theme, animate, persist) {
	theme = normalizeTheme(theme);
	var resolvedTheme = getResolvedTheme(theme);
	var metaThemeColor = document.querySelector('meta[name="theme-color"]');

	if(animate)
		document.documentElement.style.transition = 'background-color 0.3s, color 0.3s';

	if(resolvedTheme === 'dark')
		document.documentElement.classList.add('dark-mode');
	else
		document.documentElement.classList.remove('dark-mode');

	document.documentElement.style.colorScheme = resolvedTheme;
	currentTheme = theme;
	isDarkMode = resolvedTheme === 'dark';
	updateThemeControls(theme, resolvedTheme);

	if(typeof syncAppModeBackground == 'function')
		syncAppModeBackground();
	else if(metaThemeColor)
		metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#1a1a2e' : '#efefef');

	if(persist !== false) {
		try {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		}
		catch(e) {}
	}
}

function initTheme() {
	var saved = null;
	var options = document.querySelectorAll('#account_theme_selector .theme-option');
	var i;

	try {
		saved = localStorage.getItem(THEME_STORAGE_KEY);
	}
	catch(e) {}
	applyTheme(normalizeTheme(saved), false, false);

	if(window.matchMedia) {
		themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		var handleSystemThemeChange = function() {
			if(currentTheme === 'system')
				applyTheme('system', true, false);
		};
		if(themeMediaQuery.addEventListener)
			themeMediaQuery.addEventListener('change', handleSystemThemeChange);
		else if(themeMediaQuery.addListener)
			themeMediaQuery.addListener(handleSystemThemeChange);
	}

	for(i = 0; i < options.length; i++) {
		options[i].addEventListener('click', function() {
			applyTheme(this.getAttribute('data-theme'), true, true);
		});
	}
}
