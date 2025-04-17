function openOptionsPage() {
	if (browser.runtime.openOptionsPage) {
		browser.runtime.openOptionsPage();
	} else {
		window.open(browser.runtime.getURL("/options.html"));
	}
}

export default defineBackground({
	main() {
    browser?.browserAction?.onClicked?.addListener(openOptionsPage);
    browser?.action?.onClicked?.addListener(openOptionsPage);
		browser.runtime.onMessage.addListener((message) => {
			if (message.action === "openOptionsPage") {
				openOptionsPage();
			}
		});
	},
});
