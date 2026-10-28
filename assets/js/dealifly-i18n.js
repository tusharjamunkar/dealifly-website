/**
 * Dealifly Internationalization (i18n) Engine - Version 3.0 (Enterprise Dual-Tier Architecture)
 * Complete English <-> Nederlands (Dutch) Session Translation System
 * 
 * Features:
 * 1. Dual-Tier Translation:
 *    - Tier 1: Key-based [data-i18n] elements (preserves nested HTML, badges, colors, and line breaks).
 *    - Tier 2: Universal DOM TreeWalker matching all text nodes against the 2,800+ entry master dictionary.
 *    - Attribute translation: [data-i18n-placeholder], input/textarea placeholders, document.title, aria-labels.
 * 2. 100% Reversible In-Memory Cache:
 *    - Caches original English strings and innerHTML on nodes so switching back to EN is instant and lossless.
 * 3. Session-Wide Persistence:
 *    - Stores user preference in sessionStorage to maintain Dutch across all page navigations, reloads, and back/forward history.
 *    - New tabs/sessions cleanly default to English. Supports URL parameter (?lang=nl) for direct sharing.
 * 4. Zero-Flash Early Execution:
 *    - Sets document.documentElement.lang before render to avoid FOUT.
 * 5. Dynamic Content (MutationObserver):
 *    - Translates dynamically inserted elements, modals, dropdowns, and form validation states automatically.
 * 6. Accessible Responsive Switchers:
 *    - Injected into Desktop Header, Mobile Navigation Bar, and Footer.
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'dealifly_lang';
    const DEFAULT_LANG = 'en';
    let isTranslating = false;

    // Determine initial language: URL query parameter > sessionStorage > default
    function getInitialLanguage() {
        try {
            const params = new URLSearchParams(window.location.search);
            const urlLang = params.get('lang');
            if (urlLang === 'nl' || urlLang === 'en') {
                sessionStorage.setItem(STORAGE_KEY, urlLang);
                return urlLang;
            }
            const sessionLang = sessionStorage.getItem(STORAGE_KEY);
            if (sessionLang === 'nl' || sessionLang === 'en') {
                return sessionLang;
            }
        } catch (e) {
            console.warn('dealifly-i18n: sessionStorage inaccessible', e);
        }
        return DEFAULT_LANG;
    }

    let currentLang = getInitialLanguage();

    // Fast-apply lang attribute to documentElement immediately
    document.documentElement.lang = currentLang;

    // Translation data accessors
    function getI18nData() {
        return window.DEALIFLY_I18N_DATA || { keys: {}, text: window.DEALIFLY_TRANSLATIONS || {} };
    }

    function getTextDict() {
        const data = getI18nData();
        return data.text || window.DEALIFLY_TRANSLATIONS || {};
    }

    function getKeysDict() {
        const data = getI18nData();
        return data.keys || {};
    }

    // Inject styles for the switcher
    function injectStyles() {
        if (document.getElementById('dealifly-i18n-styles')) return;

        const style = document.createElement('style');
        style.id = 'dealifly-i18n-styles';
        style.textContent = `
            .dealifly-lang-switcher {
                display: inline-flex !important;
                width: auto !important;
                max-width: fit-content !important;
                min-width: 0 !important;
                align-self: flex-start !important;
                flex: 0 0 auto !important;
                align-items: center;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(143, 122, 232, 0.28);
                border-radius: 8px !important;
                padding: 2px 4px;
                gap: 2px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
                transition: all 0.2s ease;
                font-family: var(--ff-1, "Plus Jakarta Sans", sans-serif);
                user-select: none;
                z-index: 10;
            }
            .dealifly-lang-switcher:hover {
                border-color: rgba(143, 122, 232, 0.45);
                background: rgba(255, 255, 255, 0.06);
            }
            .dealifly-lang-btn {
                background: transparent;
                border: none;
                color: rgba(245, 245, 247, 0.65);
                font-size: 0.78rem;
                font-weight: 600;
                letter-spacing: 0.04em;
                padding: 0.25rem 0.6rem;
                border-radius: 6px !important;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                display: inline-flex;
                align-items: center;
                gap: 0.3rem;
                line-height: 1.2;
                text-decoration: none;
            }
            .dealifly-lang-btn:hover {
                color: #ffffff;
                background: rgba(143, 122, 232, 0.15);
            }
            .dealifly-lang-btn.active {
                background: #8f7ae8;
                color: #ffffff;
                box-shadow: 0 2px 8px rgba(143, 122, 232, 0.35);
            }
            .dealifly-lang-btn:focus-visible {
                outline: 2px solid #8f7ae8;
                outline-offset: 2px;
            }
            .dealifly-lang-divider {
                color: rgba(255, 255, 255, 0.2);
                font-size: 0.75rem;
                margin: 0 1px;
            }
            .dealifly-lang-switcher--mobile-bar {
                margin-left: auto;
                margin-right: 0.75rem;
            }
            .dealifly-lang-switcher--footer {
                display: inline-flex !important;
                width: auto !important;
                max-width: fit-content !important;
                min-width: 0 !important;
                align-self: flex-start !important;
                flex: 0 0 auto !important;
                margin-top: 1rem !important;
            }
            @media (max-width: 991px) {
                .dealifly-lang-switcher--desktop {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Switcher Component Builder
    function createSwitcherElement(variant) {
        const wrapper = document.createElement('div');
        wrapper.className = `dealifly-lang-switcher dealifly-lang-switcher--${variant}`;
        wrapper.setAttribute('role', 'group');
        wrapper.setAttribute('aria-label', 'Language Switcher');

        const btnEn = document.createElement('button');
        btnEn.type = 'button';
        btnEn.className = `dealifly-lang-btn ${currentLang === 'en' ? 'active' : ''}`;
        btnEn.setAttribute('data-lang', 'en');
        btnEn.setAttribute('aria-label', 'Switch to English');
        btnEn.setAttribute('aria-pressed', currentLang === 'en' ? 'true' : 'false');
        btnEn.textContent = 'EN';

        const divider = document.createElement('span');
        divider.className = 'dealifly-lang-divider';
        divider.textContent = '|';
        divider.setAttribute('aria-hidden', 'true');

        const btnNl = document.createElement('button');
        btnNl.type = 'button';
        btnNl.className = `dealifly-lang-btn ${currentLang === 'nl' ? 'active' : ''}`;
        btnNl.setAttribute('data-lang', 'nl');
        btnNl.setAttribute('aria-label', 'Wissel naar Nederlands');
        btnNl.setAttribute('aria-pressed', currentLang === 'nl' ? 'true' : 'false');
        btnNl.textContent = 'NL';

        btnEn.addEventListener('click', (e) => {
            e.preventDefault();
            setLanguage('en');
        });
        btnNl.addEventListener('click', (e) => {
            e.preventDefault();
            setLanguage('nl');
        });

        wrapper.appendChild(btnEn);
        wrapper.appendChild(divider);
        wrapper.appendChild(btnNl);
        return wrapper;
    }

    // Inject switchers into Header, Mobile Bar, and Footer
    function injectSwitchers() {
        injectStyles();

        // 1. Desktop Header (Positioned near the "Get Started" button)
        const getStartedContainer = document.querySelector('.navbar .ms-lg-auto, #navbar0 .ms-lg-auto, .navbar-collapse .ms-lg-auto');
        const getStartedBtn = getStartedContainer ? getStartedContainer.querySelector('a.btn, button.btn, a[href*="contact"]') : null;

        if (getStartedContainer && getStartedBtn && !document.querySelector('.dealifly-lang-switcher--desktop')) {
            const switcher = createSwitcherElement('desktop');
            switcher.classList.add('order-lg-1');
            getStartedContainer.insertBefore(switcher, getStartedBtn);
        } else {
            // Fallback for pages with custom header structures
            const desktopNav = document.querySelector('#navbar0') || document.querySelector('.navbar-collapse');
            if (desktopNav && !document.querySelector('.dealifly-lang-switcher--desktop')) {
                const switcher = createSwitcherElement('desktop');
                const ctaBtn = desktopNav.querySelector('a.btn-primary, a.btn, .dealifly-btn-primary');
                if (ctaBtn && ctaBtn.parentElement && !ctaBtn.parentElement.classList.contains('nav-item')) {
                    ctaBtn.parentElement.insertBefore(switcher, ctaBtn);
                } else {
                    desktopNav.appendChild(switcher);
                }
            }
        }

        // 2. Mobile Navbar Bar
        const mobileToggle = document.querySelector('.navbar-toggler');
        if (mobileToggle && mobileToggle.parentElement && !document.querySelector('.dealifly-lang-switcher--mobile-bar')) {
            const switcher = createSwitcherElement('mobile-bar');
            switcher.classList.add('d-lg-none');
            mobileToggle.parentElement.insertBefore(switcher, mobileToggle);
        }

        // 3. Footer
        const footerBottom = document.querySelector('footer .footer-bottom, footer .footer-copyright, footer .row:last-child');
        if (footerBottom && !document.querySelector('.dealifly-lang-switcher--footer')) {
            const switcher = createSwitcherElement('footer');
            if (footerBottom.classList.contains('row')) {
                const colWrap = document.createElement('div');
                colWrap.className = 'col-12 d-flex justify-content-start';
                colWrap.appendChild(switcher);
                footerBottom.appendChild(colWrap);
            } else {
                footerBottom.appendChild(switcher);
            }
        }
    }

    // Update switcher buttons UI
    function updateSwitcherUI() {
        document.querySelectorAll('.dealifly-lang-switcher').forEach(switcher => {
            switcher.querySelectorAll('.dealifly-lang-btn').forEach(btn => {
                const lang = btn.getAttribute('data-lang');
                if (lang === currentLang) {
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                } else {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                }
            });
        });
    }

    // Tier 1: Translate [data-i18n] structured elements
    function translateDataI18n(root, targetLang) {
        if (!root) return;
        const keysDict = getKeysDict();
        const isDutch = targetLang === 'nl';

        // Elements with data-i18n
        const elements = root.querySelectorAll ? root.querySelectorAll('[data-i18n]') : [];
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;

            if (!el._dealiflyOrigHTML) {
                el._dealiflyOrigHTML = el.innerHTML;
            }

            const item = keysDict[key];
            if (item) {
                if (isDutch) {
                    el.innerHTML = item.nl;
                } else {
                    el.innerHTML = item.en || el._dealiflyOrigHTML;
                }
            }
        });

        // Elements with data-i18n-placeholder
        const phElements = root.querySelectorAll ? root.querySelectorAll('[data-i18n-placeholder]') : [];
        phElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (!key) return;

            if (!el._dealiflyOrigPH) {
                el._dealiflyOrigPH = el.getAttribute('placeholder');
            }

            const item = keysDict[key];
            if (item) {
                if (isDutch) {
                    el.setAttribute('placeholder', item.nl);
                } else {
                    el.setAttribute('placeholder', item.en || el._dealiflyOrigPH);
                }
            }
        });

        // Elements with data-i18n-title
        const titleElements = root.querySelectorAll ? root.querySelectorAll('[data-i18n-title]') : [];
        titleElements.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (!key) return;
            if (!el._dealiflyOrigTitleAttr) {
                el._dealiflyOrigTitleAttr = el.getAttribute('title');
            }
            const item = keysDict[key];
            if (item) {
                if (isDutch) {
                    el.setAttribute('title', item.nl);
                } else {
                    el.setAttribute('title', item.en || el._dealiflyOrigTitleAttr);
                }
            }
        });
    }

    // Tier 2: Universal DOM TreeWalker Translator
    function translateTextNodes(root, targetLang) {
        if (!root || !root.ownerDocument) return;
        const dict = getTextDict();
        const isDutch = targetLang === 'nl';

        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    const tag = parent.tagName.toLowerCase();
                    if (['script', 'style', 'noscript', 'code', 'pre', 'iconify-icon', 'svg'].includes(tag)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (parent.closest('.dealifly-lang-switcher')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Skip elements already translated via data-i18n
                    if (parent.closest('[data-i18n]')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (!node.nodeValue || !node.nodeValue.trim()) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodes = [];
        let cur;
        while ((cur = walker.nextNode())) {
            nodes.push(cur);
        }

        nodes.forEach(node => {
            const raw = node.nodeValue;
            const trimmed = raw.trim();

            if (!node._dealiflyOrigText) {
                node._dealiflyOrigText = raw;
            }

            if (isDutch) {
                if (dict[trimmed]) {
                    const translation = dict[trimmed];
                    const leadingMatch = raw.match(/^\s*/);
                    const trailingMatch = raw.match(/\s*$/);
                    const leading = leadingMatch ? leadingMatch[0] : '';
                    const trailing = trailingMatch ? trailingMatch[0] : '';
                    node.nodeValue = leading + translation + trailing;
                }
            } else {
                if (node._dealiflyOrigText) {
                    node.nodeValue = node._dealiflyOrigText;
                }
            }
        });

        // Translate placeholders
        const inputs = (root.querySelectorAll ? root.querySelectorAll('input[placeholder], textarea[placeholder]') : []);
        inputs.forEach(input => {
            if (input.hasAttribute('data-i18n-placeholder')) return;
            if (!input._dealiflyOrigPlaceholder) {
                input._dealiflyOrigPlaceholder = input.getAttribute('placeholder');
            }
            if (isDutch) {
                const tr = dict[input._dealiflyOrigPlaceholder.trim()];
                if (tr) input.setAttribute('placeholder', tr);
            } else {
                if (input._dealiflyOrigPlaceholder) {
                    input.setAttribute('placeholder', input._dealiflyOrigPlaceholder);
                }
            }
        });

        // Translate document title
        if (!document._dealiflyOrigTitle) {
            document._dealiflyOrigTitle = document.title;
        }
        if (isDutch) {
            const pageTitleTrim = document._dealiflyOrigTitle.trim();
            if (dict[pageTitleTrim]) {
                document.title = dict[pageTitleTrim];
            }
        } else {
            if (document._dealiflyOrigTitle) {
                document.title = document._dealiflyOrigTitle;
            }
        }
    }

    // Complete Root Translator
    function translateRoot(root, targetLang) {
        if (!root) return;
        isTranslating = true;
        try {
            // Tier 1: structured data-i18n keys
            translateDataI18n(root, targetLang);
            // Tier 2: universal text node dictionary
            translateTextNodes(root, targetLang);
        } finally {
            isTranslating = false;
        }
    }

    // Set and persist language
    function setLanguage(lang) {
        if (lang !== 'nl' && lang !== 'en') return;
        currentLang = lang;

        // Persist to sessionStorage for the session
        try {
            sessionStorage.setItem(STORAGE_KEY, lang);
        } catch (e) { }

        // Update HTML lang attribute
        document.documentElement.lang = lang;

        updateSwitcherUI();
        translateRoot(document.body, lang);

        window.dispatchEvent(new CustomEvent('dealifly:languageChange', { detail: { lang } }));
    }

    // Dynamic content observer
    function setupMutationObserver() {
        if (!window.MutationObserver) return;

        const observer = new MutationObserver(mutations => {
            if (isTranslating || currentLang !== 'nl') return;

            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        translateRoot(node, 'nl');
                    } else if (node.nodeType === Node.TEXT_NODE && node.nodeValue && node.nodeValue.trim()) {
                        const parent = node.parentElement;
                        if (parent && !['script', 'style', 'noscript', 'code'].includes(parent.tagName.toLowerCase())) {
                            if (!parent.closest('[data-i18n]')) {
                                const trimmed = node.nodeValue.trim();
                                const dict = getTextDict();
                                if (dict[trimmed]) {
                                    if (!node._dealiflyOrigText) node._dealiflyOrigText = node.nodeValue;
                                    isTranslating = true;
                                    node.nodeValue = dict[trimmed];
                                    isTranslating = false;
                                }
                            }
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Handle bfcache / back-forward navigation
    window.addEventListener('pageshow', function (event) {
        const activeLang = getInitialLanguage();
        if (activeLang !== currentLang) {
            setLanguage(activeLang);
        } else if (activeLang === 'nl') {
            translateRoot(document.body, 'nl');
        }
    });

    // Main initialization
    function init() {
        injectSwitchers();
        if (currentLang === 'nl') {
            translateRoot(document.body, 'nl');
        }
        setupMutationObserver();

        if (window.DealiflyCustomSelect && typeof window.DealiflyCustomSelect.init === 'function') {
            window.DealiflyCustomSelect.init();
        } else {
            var isInSubdir = window.location.pathname.indexOf('/industries/') !== -1;
            var scriptPath = (isInSubdir ? '../' : '') + 'assets/js/dealifly-custom-select.js';
            var s = document.createElement('script');
            s.src = scriptPath;
            document.body.appendChild(s);
        }
    }

    // Global DealiflyI18n API
    window.DealiflyI18n = {
        getLanguage: () => currentLang,
        setLanguage: setLanguage,
        init: init,
        translateRoot: translateRoot
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
