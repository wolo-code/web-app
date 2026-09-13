function mailLinkAddress(link) {
	return (link.getAttribute('data-u') || '') + '@' + (link.getAttribute('data-d') || '');
}

function mailLinkHref(link) {
	var address = mailLinkAddress(link);
	var subject = link.getAttribute('data-s');
	return 'mailto:' + address + (subject ? '?subject=' + encodeURIComponent(subject) : '');
}

function revealMailLink(link) {
	if(!link || !link.getAttribute('data-u') || !link.getAttribute('data-d') || link.classList.contains('mail-link-ready'))
		return link;
	link.textContent = mailLinkAddress(link);
	link.setAttribute('href', mailLinkHref(link));
	link.classList.add('mail-link-ready');
	return link;
}

function bindMailLinks(root) {
	var scope = root || document;
	var links = scope.querySelectorAll ? scope.querySelectorAll('a.mail-link[data-u][data-d]') : [];
	for(var i = 0; i < links.length; i++)
		revealMailLink(links[i]);
}

function watchMailLinkContent() {
	var content = document.getElementById('content');
	if(!content || content.dataset.mailWatch || typeof MutationObserver !== 'function')
		return;
	content.dataset.mailWatch = 'true';
	new MutationObserver(function() {
		bindMailLinks(content);
	}).observe(content, { childList: true });
}

function initMailLinks() {
	bindMailLinks(document);
	watchMailLinkContent();
}

document.addEventListener('click', function(event) {
	var target = event.target;
	var link = target && target.closest ? target.closest('a.mail-link[data-u][data-d]') : null;
	if(!link)
		return;
	revealMailLink(link);
}, true);

if(document.readyState === 'loading')
	document.addEventListener('DOMContentLoaded', initMailLinks);
else
	initMailLinks();
