function inject() {
    var s = document.createElement('script');
    s.src = "//cdn.lordmau5.com/inject.js";
    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    (document.head || document.documentElement).appendChild(s);
}

inject();
