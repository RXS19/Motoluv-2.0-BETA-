export const GA_MEASUREMENT_ID = 'G-7VN3KV4YPL';

let isInitialized = false;

/**
 * Dynamically loads gtag.js and initializes Google Analytics 4
 * Configured with send_page_view: false to avoid automatic duplicate page views in SPA.
 */
export const initGA = () => {
  if (typeof window === 'undefined' || isInitialized) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
  });

  isInitialized = true;
};

/**
 * Manually tracks page view in GA4 on route change
 * @param {string} path - pathname + search (e.g. '/motos?page=1')
 */
export const trackPageView = (path) => {
  if (typeof window === 'undefined') return;

  if (!isInitialized) {
    initGA();
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  }
};
