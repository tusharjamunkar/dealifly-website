/**
 * Dealifly Internationalization (i18n) Engine - Version 2.0 (Session-Wide Architecture)
 * Supports bidirectional English <-> Nederlands (Dutch) switching
 * 
 * Features:
 * 1. Session-Based Persistence:
 *    - Uses sessionStorage to isolate language preference to the current tab/session.
 *    - Persists across all internal page navigations, page refreshes, and browser back/forward (bfcache/pageshow).
 *    - Supports shareable URL parameter (?lang=nl).
 *    - New tabs/sessions start in clean default English.
 * 2. Zero-Flash Initialization:
 *    - Sets <html lang="nl"> and translates immediately as DOM nodes load.
 * 3. Dynamic Content Support:
 *    - MutationObserver monitors dynamically rendered elements, modals, popups, and form validations.
 *    - Safe translation locking prevents infinite loops or double-translations.
 * 4. Reversible In-Memory Cache:
 *    - Caches original English strings on text nodes so switching back to EN is 100% faithful and instant.
 * 5. High-Accessibility Switcher UI:
 *    - Injected into desktop header, mobile navigation bar, and footer.
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

    // Translation dictionary accessor
    function getTranslations() {
        return window.DEALIFLY_TRANSLATIONS || {};
    }

    // Inject styles for the switcher
    function injectStyles() {
        if (document.getElementById('dealifly-i18n-styles')) return;

        const style = document.createElement('style');
        style.id = 'dealifly-i18n-styles';
        style.textContent = `
            .dealifly-lang-switcher {
                display: inline-flex;
                align-items: center;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(143, 122, 232, 0.25);
                border-radius: 999px;
                padding: 2px 4px;
                gap: 2px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
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
                border-radius: 999px;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                display: inline-flex;
                align-items: center;
                gap: 0.3rem;
                line-height: 1.2;
                text-decoration: none;
            }
            .dealifly-lang-btn:hover {
                color: #FFFFFF;
            }
            .dealifly-lang-btn.active {
                background: linear-gradient(135deg, rgba(118, 87, 217, 0.35) 0%, rgba(91, 62, 198, 0.45) 100%);
                color: #FFFFFF;
                border: 1px solid rgba(183, 165, 245, 0.4);
                box-shadow: 0 2px 8px rgba(118, 87, 217, 0.3);
            }
            .dealifly-lang-globe {
                font-size: 0.85rem;
                opacity: 0.9;
                display: inline-block;
            }
            .dealifly-lang-divider {
                color: rgba(255, 255, 255, 0.18);
                font-size: 0.75rem;
                margin: 0 1px;
            }
            .dealifly-lang-switcher--mobile-bar {
                margin-left: auto;
                margin-right: 0.75rem;
            }
            .dealifly-lang-switcher--footer {
                margin-top: 0.5rem;
            }
            @media (max-width: 991.98px) {
                .dealifly-lang-switcher--desktop {
                    margin-bottom: 0.85rem;
                    width: fit-content;
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
        wrapper.setAttribute('aria-label', 'Language Selector / Taalkeuze');

        wrapper.innerHTML = `
            <button type="button" class="dealifly-lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en" aria-label="Switch to English" aria-pressed="${currentLang === 'en'}">
                <span class="dealifly-lang-globe" aria-hidden="true">🌐</span> EN
            </button>
            <span class="dealifly-lang-divider" aria-hidden="true">/</span>
            <button type="button" class="dealifly-lang-btn ${currentLang === 'nl' ? 'active' : ''}" data-lang="nl" aria-label="Schakel over naar Nederlands" aria-pressed="${currentLang === 'nl'}">
                NL
            </button>
        `;

        wrapper.addEventListener('click', function (e) {
            const btn = e.target.closest('.dealifly-lang-btn');
            if (!btn) return;
            const targetLang = btn.getAttribute('data-lang');
            if (targetLang && targetLang !== currentLang) {
                setLanguage(targetLang);
            }
        });

        return wrapper;
    }

    // Inject switchers into Header, Mobile Bar, and Footer
    function injectSwitchers() {
        injectStyles();

        // 1. Desktop Header
        const headerActions = document.querySelector('.primary-header .d-flex.align-items-center.ms-lg-auto, .dealifly-floating-nav .d-flex.align-items-center.ms-lg-auto, nav .ms-lg-auto.d-flex, nav .d-flex.gap-3');
        if (headerActions && !headerActions.querySelector('.dealifly-lang-switcher')) {
            const desktopSwitcher = createSwitcherElement('desktop');
            const ctaBtn = headerActions.querySelector('.btn, a');
            if (ctaBtn) {
                headerActions.insertBefore(desktopSwitcher, ctaBtn);
            } else {
                headerActions.appendChild(desktopSwitcher);
            }
        }

        // 2. Mobile Bar
        const toggler = document.querySelector('.navbar-toggler');
        if (toggler && toggler.parentElement && !toggler.parentElement.querySelector('.dealifly-lang-switcher--mobile-bar')) {
            const mobileBarSwitcher = createSwitcherElement('mobile-bar');
            mobileBarSwitcher.classList.add('d-lg-none');
            toggler.parentElement.insertBefore(mobileBarSwitcher, toggler);
        }

        // 3. Footer
        const footerBottom = document.querySelector('.dealifly-footer__bottom .d-flex, .dealifly-footer-main-row');
        if (footerBottom && !document.querySelector('.dealifly-lang-switcher--footer')) {
            const footerSwitcher = createSwitcherElement('footer');
            footerBottom.appendChild(footerSwitcher);
        }

        updateSwitcherUI();
    }

    // Update active states
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

    // Recursive text translator for a root element
    function translateRoot(root, targetLang) {
        if (!root || !root.ownerDocument) return;
        const dict = getTranslations();
        const isDutch = targetLang === 'nl';

        isTranslating = true;

        // TreeWalker
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

        isTranslating = false;
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
                            const trimmed = node.nodeValue.trim();
                            const dict = getTranslations();
                            if (dict[trimmed]) {
                                if (!node._dealiflyOrigText) node._dealiflyOrigText = node.nodeValue;
                                isTranslating = true;
                                node.nodeValue = dict[trimmed];
                                isTranslating = false;
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
    }

    // Global DealiflyI18n API
    window.DealiflyI18n = {
        getLanguage: () => currentLang,
        setLanguage: setLanguage,
        init: init
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
