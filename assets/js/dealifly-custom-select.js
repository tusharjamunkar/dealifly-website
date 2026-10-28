/**
 * Dealifly Custom Select Component
 * Replaces native HTML / Apple iOS <select> pickers with authentic Dealifly design.
 */
(function () {
    'use strict';

    function initCustomSelects() {
        var selects = document.querySelectorAll(
            'select.form-select, select.dealifly-contact-select, select.ind-contact-select, select.growth-form-select, select[name="service"], select[name="country"]'
        );

        selects.forEach(function (select) {
            if (select.getAttribute('data-dealifly-custom-select') === 'true') {
                return;
            }
            upgradeSelect(select);
        });
    }

    function upgradeSelect(select) {
        select.setAttribute('data-dealifly-custom-select', 'true');

        // Create wrapper
        var wrapper = document.createElement('div');
        wrapper.className = 'dealifly-custom-select-wrap';
        if (select.className) {
            var firstClass = select.className.split(' ')[0];
            if (firstClass) wrapper.classList.add('wrap-' + firstClass);
        }

        // Insert wrapper before select and move select inside wrapper
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);

        // Build trigger
        var trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'dealifly-custom-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        var labelSpan = document.createElement('span');
        labelSpan.className = 'dealifly-custom-select-label';

        var arrowIcon = document.createElement('i');
        arrowIcon.className = 'bi bi-chevron-down dealifly-custom-select-arrow';
        arrowIcon.setAttribute('aria-hidden', 'true');

        trigger.appendChild(labelSpan);
        trigger.appendChild(arrowIcon);
        wrapper.appendChild(trigger);

        // Build dropdown menu
        var menu = document.createElement('div');
        menu.className = 'dealifly-custom-select-menu';
        menu.setAttribute('role', 'listbox');
        wrapper.appendChild(menu);

        function renderOptions() {
            menu.innerHTML = '';
            var currentVal = select.value;

            Array.from(select.options).forEach(function (opt, idx) {
                var item = document.createElement('div');
                item.className = 'dealifly-custom-select-option';
                item.setAttribute('role', 'option');
                item.setAttribute('data-value', opt.value);
                item.setAttribute('data-index', idx);

                if (opt.disabled) {
                    item.classList.add('is-disabled');
                }
                if (opt.value === currentVal || (currentVal === '' && idx === select.selectedIndex)) {
                    item.classList.add('is-selected');
                    item.setAttribute('aria-selected', 'true');
                } else {
                    item.setAttribute('aria-selected', 'false');
                }

                var itemText = document.createElement('span');
                itemText.className = 'dealifly-option-text';
                itemText.textContent = opt.textContent.trim();
                item.appendChild(itemText);

                var checkIcon = document.createElement('i');
                checkIcon.className = 'bi bi-check2 dealifly-option-check';
                checkIcon.setAttribute('aria-hidden', 'true');
                item.appendChild(checkIcon);

                item.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (opt.disabled) return;

                    select.value = opt.value;
                    select.selectedIndex = idx;
                    trigger.classList.remove('is-invalid');

                    // Dispatch standard change and input events
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    select.dispatchEvent(new Event('input', { bubbles: true }));

                    updateDisplay();
                    closeAll();
                    trigger.focus();
                });

                menu.appendChild(item);
            });

            updateDisplay();
        }

        function updateDisplay() {
            var selectedOption = select.options[select.selectedIndex];
            var isPlaceholder = !select.value || (select.selectedIndex === 0 && selectedOption && selectedOption.value === '');

            if (selectedOption) {
                labelSpan.textContent = selectedOption.textContent.trim();
            } else {
                labelSpan.textContent = '';
            }

            if (isPlaceholder) {
                trigger.classList.add('is-placeholder');
            } else {
                trigger.classList.remove('is-placeholder');
            }

            // Sync option active states
            menu.querySelectorAll('.dealifly-custom-select-option').forEach(function (item) {
                if (item.getAttribute('data-value') === select.value) {
                    item.classList.add('is-selected');
                    item.setAttribute('aria-selected', 'true');
                } else {
                    item.classList.remove('is-selected');
                    item.setAttribute('aria-selected', 'false');
                }
            });
        }

        function openMenu() {
            closeAll();

            var rect = wrapper.getBoundingClientRect();
            var spaceBelow = window.innerHeight - rect.bottom;
            var spaceAbove = rect.top;
            var menuHeight = 290;

            if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                wrapper.classList.add('is-dropup');
            } else {
                wrapper.classList.remove('is-dropup');
            }

            wrapper.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');

            var selectedItem = menu.querySelector('.dealifly-custom-select-option.is-selected');
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest' });
            }
        }

        // Toggle open
        trigger.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            var isOpen = wrapper.classList.contains('is-open');
            if (isOpen) {
                closeAll();
            } else {
                openMenu();
            }
        });

        // Keyboard navigation
        trigger.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (!wrapper.classList.contains('is-open')) {
                    openMenu();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    var highlighted = menu.querySelector('.dealifly-custom-select-option.is-highlighted') ||
                                      menu.querySelector('.dealifly-custom-select-option.is-selected');
                    if (highlighted) {
                        highlighted.click();
                    }
                }
            } else if (e.key === 'Escape') {
                closeAll();
            }
        });

        // Sync when select value changes externally (e.g., reset, translation, script)
        select.addEventListener('change', updateDisplay);

        var form = select.closest('form');
        if (form) {
            form.addEventListener('reset', function () {
                setTimeout(updateDisplay, 15);
            });

            // Required field invalid check
            select.addEventListener('invalid', function () {
                trigger.classList.add('is-invalid');
            });
        }

        renderOptions();

        // Store sync method on select element
        select._dealiflyCustomSelect = {
            renderOptions: renderOptions,
            updateDisplay: updateDisplay
        };
    }

    function closeAll() {
        document.querySelectorAll('.dealifly-custom-select-wrap.is-open').forEach(function (wrap) {
            wrap.classList.remove('is-open');
            wrap.classList.remove('is-dropup');
            var trigger = wrap.querySelector('.dealifly-custom-select-trigger');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
    }

    // Close on click outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.dealifly-custom-select-wrap')) {
            closeAll();
        }
    });

    document.addEventListener('touchend', function (e) {
        if (!e.target.closest('.dealifly-custom-select-wrap')) {
            closeAll();
        }
    });

    // Re-render options when translation language changes
    window.addEventListener('dealifly-lang-change', reRenderAll);
    window.addEventListener('dealifly:languageChange', reRenderAll);

    function reRenderAll() {
        document.querySelectorAll('select[data-dealifly-custom-select="true"]').forEach(function (s) {
            if (s._dealiflyCustomSelect) {
                s._dealiflyCustomSelect.renderOptions();
            }
        });
    }

    window.DealiflyCustomSelect = {
        init: initCustomSelects,
        upgrade: upgradeSelect,
        closeAll: closeAll
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomSelects);
    } else {
        initCustomSelects();
    }
})();
