// ==UserScript==
// @id          bttv4ffz
// @name        BetterTTV Emotes for FrankerFaceZ
// @namespace   BTTV4FFZ
//
// @version     1.1.2
// @updateURL   https://cdn.lordmau5.com/script/bttv4ffz_injector.user.js
//
// @description Ever wanted to have these slick Better Twitch TV emotes but you already have FrankerFaceZ installed? BetterTwitchTV for FrankerFaceZ takes care of that problem.
// @author      Lordmau5
// @homepage    https://lordmau5.com/bttv4ffz/
// @icon        https://cdn.lordmau5.com/script/icon32.png
// @icon64      https://cdn.lordmau5.com/script/icon64.png
// @icon128     https://cdn.lordmau5.com/script/icon128.png
//
// @include     http://twitch.tv/*
// @include     https://twitch.tv/*
// @include     http://*.twitch.tv/*
// @include     https://*.twitch.tv/*
//
// @exclude     http://api.twitch.tv/*
// @exclude     https://api.twitch.tv/*
//
// @grant       none
// @run-at      document-end
// ==/UserScript==

function bttv4ffz_init() {
    var script = document.createElement('script');

    script.id = 'bttv4ffz_script';
    script.type = 'text/javascript';
    script.src = 'https://cdn.lordmau5.com/inject.js';

    document.head.appendChild(s);
}

bttv4ffz_script();
