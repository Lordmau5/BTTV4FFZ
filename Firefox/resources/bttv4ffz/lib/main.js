var pageMod = require("sdk/page-mod");

pageMod.PageMod({
	include: "*.twitch.tv",
	contentScript: 'var ce = document["createElement"].bind(document);' +
					'var s = ce("script");' +
					//'s.src = "//cdn.lordmau5.com/inject.js";' +
					's.src = "//lordmau5.com/nocache/inject.js";' +
					's.onload = function() {' +
						'this.parentNode.removeChild(this);' +
					'};' +
					'(document.head || document.documentElement).appendChild(s);'
});

browser.webRequest.onHeadersReceived.addListener(function(info) {
    return {
        responseHeaders: info.responseHeaders.concat([{
            name: 'access-control-allow-origin',
            value: '*'
        }])
    };
}, {
    urls: [
        "*://cdn.betterttv.net/*"
    ]
}, ["blocking", "responseHeaders"]);
