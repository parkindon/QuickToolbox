(function () {
    const CONSENT_KEY = 'qt-cookie-consent';

    function getStoredConsent() {
        try {
            return localStorage.getItem(CONSENT_KEY);
        } catch (e) {
            console.warn('Cookie consent: localStorage not available', e);
            return null;
        }
    }

    function setStoredConsent(value) {
        try {
            localStorage.setItem(CONSENT_KEY, value);
        } catch (e) {
            console.warn('Cookie consent: unable to store value', e);
        }
    }

    // Simple helper you can use from other scripts
    window.qtHasCookieConsent = function () {
        return getStoredConsent() === 'accepted';
    };

    document.addEventListener('DOMContentLoaded', function () {
        const banner = document.getElementById('cookie-banner');
        const acceptBtn = document.getElementById('cookie-accept');
        const rejectBtn = document.getElementById('cookie-reject');

        if (!banner || !acceptBtn || !rejectBtn) {
            console.warn('Cookie consent: banner or buttons not found in DOM');
            return;
        }

        const existing = getStoredConsent();

        // If they've already accepted or rejected, hide the banner
        if (existing === 'accepted' || existing === 'rejected') {
            banner.classList.add('hidden');
        } else {
            banner.classList.remove('hidden');
        }

        acceptBtn.addEventListener('click', function () {
            setStoredConsent('accepted');
            banner.classList.add('hidden');
            // TODO: initialise analytics/ads here if you add them later
            // e.g. loadGoogleAnalytics();
        });

        rejectBtn.addEventListener('click', function () {
            setStoredConsent('rejected');
            banner.classList.add('hidden');
            // Optional: disable analytics / avoid loading ad scripts
        });
    });
})();
