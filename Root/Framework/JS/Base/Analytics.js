function trackOutboundLink(title, url) {
	analytics.logEvent('outbound_link', {title: title, url: url});
}
