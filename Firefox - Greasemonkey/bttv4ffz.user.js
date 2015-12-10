// ==UserScript==
// @name         BetterTwitchTV for FrankerFaceZ
// @namespace    http://github.com/Lordmau5/BTTV4FFZ
// @version      1.0.8
// @description  Better Twitch TV emotes for FrankerFaceZ
// @author       Lordmau5
// @match        *://*.twitch.tv/*
// @grant        none
// @run-at       document-body
// ==/UserScript==

function inject() {
    var s = document.createElement('script');
    s.src = "//cdn.lordmau5.com/inject.js";
    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    (document.head || document.documentElement).appendChild(s);
}

inject();
