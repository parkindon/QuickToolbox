// cookies.js
(function () {
    const STORAGE_KEY = 'qt-cookie-consent';
    const GA_ID = window.QT_GA_ID || ''; // set in _Layout

    const banner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('cookie-accept');
    const rejectBtn = document.getElementById('cookie-reject');

    function safeGet(key) {
        try {
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    function safeSet(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch {
            // ignore (e.g. private mode / blocked storage)
        }
    }

    function hideBanner() {
        if (banner) {
            banner.classList.add('hidden');
        }
    }

    function showBanner() {
        if (banner) {
            banner.classList.remove('hidden');
        }
    }

    // ---- Analytics loader (ONLY after consent) ----
    function enableAnalytics() {
        if (!GA_ID) return;               // no ID, nothing to load
        if (window.qtAnalyticsLoaded) return;
        window.qtAnalyticsLoaded = true;

        // gtag loader
        const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
        document.head.appendChild(gaScript);

        // basic config
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        window.gtag = gtag;

        gtag('js', new Date());
        gtag('config', GA_ID, {
            anonymize_ip: true // slightly better for privacy
        });
    }

    // ---- Initial state ----
    document.addEventListener('DOMContentLoaded', function () {
        if (!banner) {
            // No banner on this page – still honour consent for analytics
            const consent = safeGet(STORAGE_KEY);
            if (consent === 'accepted') {
                enableAnalytics();
            }
            return;
        }

        const consent = safeGet(STORAGE_KEY);

        if (consent === 'accepted') {
            hideBanner();
            enableAnalytics();
        } else if (consent === 'rejected') {
            hideBanner();
            // never load GA
        } else {
            showBanner();
        }

        // ---- Button events ----
        if (acceptBtn) {
            acceptBtn.addEventListener('click', function () {
                safeSet(STORAGE_KEY, 'accepted');
                hideBanner();
                enableAnalytics();
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener('click', function () {
                safeSet(STORAGE_KEY, 'rejected');
                hideBanner();
                // explicitly do NOT call enableAnalytics()
            });
        }
    });
})();
