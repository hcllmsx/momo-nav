(function () {
    'use strict';

    const SUGGESTION_LIMIT = 8;
    const SUGGESTION_DEBOUNCE_MS = 300;
    const SUGGESTION_TIMEOUT_MS = 5000;

    const suggestionProviders = {
        baidu: {
            url: 'https://suggestion.baidu.com/su',
            queryParam: 'wd',
            callbackParam: 'cb',
            charset: 'gbk',
            extraParams: {
                ie: 'utf-8'
            },
            parse(data) {
                return Array.isArray(data && data.s) ? data.s : [];
            }
        }
    };

    let requestId = 0;
    let debounceTimer = null;
    let suggestionItems = [];
    let activeSuggestionIndex = -1;
    let searchInput = null;
    let suggestionsContainer = null;
    let searchBtn = null;
    let clearBtn = null;

    function getActiveSearchTab() {
        return document.querySelector('.tab-btn.active');
    }

    function getActiveSuggestionProvider() {
        const activeTab = getActiveSearchTab();
        if (!activeTab || activeTab.dataset.engine === 'local') return null;

        const providerName = activeTab.dataset.suggestProvider;
        return providerName ? suggestionProviders[providerName] : null;
    }

    function clearSuggestions() {
        requestId += 1;
        suggestionItems = [];
        activeSuggestionIndex = -1;

        if (!suggestionsContainer) return;
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.hidden = true;
    }

    function updateActiveSuggestion() {
        if (!suggestionsContainer) return;

        Array.from(suggestionsContainer.querySelectorAll('.search-suggestion-item')).forEach((btn, index) => {
            const active = index === activeSuggestionIndex;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    }

    function searchWithSuggestion(value) {
        if (!searchInput) return;

        searchInput.value = value;
        if (typeof window.syncSearchClearButton === 'function') {
            window.syncSearchClearButton(searchInput, clearBtn);
        }
        clearSuggestions();

        if (typeof window.performSearch === 'function') {
            window.performSearch(value);
        } else if (searchBtn) {
            searchBtn.click();
        }
    }

    function renderSuggestions(suggestions) {
        if (!suggestionsContainer) return;

        suggestionItems = Array.from(new Set(
            suggestions
                .map(item => String(item || '').trim())
                .filter(Boolean)
        )).slice(0, SUGGESTION_LIMIT);
        activeSuggestionIndex = -1;

        suggestionsContainer.innerHTML = '';

        if (!suggestionItems.length) {
            suggestionsContainer.hidden = true;
            return;
        }

        suggestionItems.forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'search-suggestion-item';
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-selected', 'false');
            btn.textContent = item;
            btn.addEventListener('pointerdown', event => {
                event.preventDefault();
                searchWithSuggestion(item);
            });
            suggestionsContainer.appendChild(btn);
        });

        suggestionsContainer.hidden = false;
    }

    function fetchJsonpSuggestions(provider, query) {
        return new Promise((resolve, reject) => {
            const callbackName = `__momoNavSearchSuggest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const url = new URL(provider.url);

            Object.entries(provider.extraParams || {}).forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });
            url.searchParams.set(provider.queryParam, query);
            url.searchParams.set(provider.callbackParam, callbackName);

            let script = null;
            let settled = false;

            const cleanup = () => {
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                delete window[callbackName];
            };

            const timeoutId = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(new Error('搜索建议请求超时'));
            }, SUGGESTION_TIMEOUT_MS);

            window[callbackName] = data => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeoutId);
                cleanup();
                resolve(provider.parse(data));
            };

            script = document.createElement('script');
            script.src = url.toString();
            if (provider.charset) {
                script.charset = provider.charset;
            }
            script.onerror = () => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeoutId);
                cleanup();
                reject(new Error('搜索建议加载失败'));
            };
            document.head.appendChild(script);
        });
    }

    function requestSuggestions(query) {
        const cleaned = String(query || '').trim();
        const provider = getActiveSuggestionProvider();

        if (!cleaned || !provider) {
            clearSuggestions();
            return;
        }

        const nextRequestId = requestId + 1;
        requestId = nextRequestId;

        fetchJsonpSuggestions(provider, cleaned)
            .then(suggestions => {
                if (nextRequestId !== requestId) return;
                renderSuggestions(suggestions);
            })
            .catch(error => {
                if (nextRequestId !== requestId) return;
                console.warn('搜索建议获取失败:', error);
                clearSuggestions();
            });
    }

    function requestSuggestionsDebounced() {
        window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
            requestSuggestions(searchInput ? searchInput.value : '');
        }, SUGGESTION_DEBOUNCE_MS);
    }

    function handleSuggestionKeydown(event) {
        if (event.key === 'Enter') {
            if (!suggestionsContainer || suggestionsContainer.hidden || activeSuggestionIndex < 0) {
                window.setTimeout(clearSuggestions, 0);
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
            searchWithSuggestion(suggestionItems[activeSuggestionIndex]);
            return;
        }

        if (!suggestionsContainer || suggestionsContainer.hidden || !suggestionItems.length) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            event.stopImmediatePropagation();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestionItems.length;
            updateActiveSuggestion();
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopImmediatePropagation();
            activeSuggestionIndex = activeSuggestionIndex <= 0
                ? suggestionItems.length - 1
                : activeSuggestionIndex - 1;
            updateActiveSuggestion();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
            clearSuggestions();
        }
    }

    function setupSearchSuggestions() {
        searchInput = document.getElementById('searchInput');
        suggestionsContainer = document.getElementById('searchSuggestions');
        searchBtn = document.getElementById('searchBtn');
        clearBtn = document.getElementById('searchClearBtn');

        if (!searchInput || !suggestionsContainer) return;

        searchInput.addEventListener('input', requestSuggestionsDebounced);
        searchInput.addEventListener('focus', () => {
            requestSuggestions(searchInput.value);
        });
        searchInput.addEventListener('blur', () => {
            window.setTimeout(clearSuggestions, 120);
        });
        searchInput.addEventListener('keydown', handleSuggestionKeydown, true);

        if (searchBtn) {
            searchBtn.addEventListener('click', clearSuggestions);
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', clearSuggestions);
        }

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.setTimeout(() => {
                    requestSuggestions(searchInput.value);
                }, 0);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', setupSearchSuggestions);
})();
