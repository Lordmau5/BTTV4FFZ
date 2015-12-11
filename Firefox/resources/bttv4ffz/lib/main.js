var pageMod = require("sdk/page-mod");

pageMod.PageMod({
	include: "*.twitch.tv",
	contentScript: 'var s = document.createElement("script");' +
					's.src = "//cdn.lordmau5.com/inject.js";' +
					's.onload = function() {' +
						'this.parentNode.removeChild(this);' +
					'};' +
					'(document.head || document.documentElement).appendChild(s);'
});
