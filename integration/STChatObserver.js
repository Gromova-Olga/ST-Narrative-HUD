// integration/STChatObserver.js

/**
 * Наблюдатель за изменениями DOM чата SillyTavern
 * 
 * Использует MutationObserver для отслеживания:
 * - Добавления новых сообщений
 * - Изменений в DOM чата
 * 
 * Все изменения пробрасываются в EventBus.
 */

import { eventBus } from '../core/EventBus.js';

let _observer = null;
let _initialized = false;

/**
 * Инициализирует наблюдатель за DOM чата
 * @param {Object} options - Настройки наблюдения
 * @param {boolean} options.observeMessages - Следить за изменениями сообщений (default: false, только добавление)
 * @param {number} options.debounceMs - Дебаунс для событий (default: 100)
 */
export function initChatObserver(options = {}) {
    if (_initialized) {
        console.warn('[STChatObserver] Already initialized');
        return;
    }

    const chatElement = document.getElementById('chat');
    if (!chatElement) {
        console.warn('[STChatObserver] #chat element not found, retrying in 1s...');
        setTimeout(() => initChatObserver(options), 1000);
        return;
    }

    const debounceMs = options.debounceMs || 100;
    let debounceTimer = null;

    _observer = new MutationObserver((mutations) => {
        // Дебаунс чтобы не спамить EventBus при серии быстрых изменений
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            processMutations(mutations);
        }, debounceMs);
    });

    const observeConfig = {
        childList: true,    // Добавление/удаление дочерних элементов
        subtree: false,     // Только прямые дети #chat (сообщения)
    };

    if (options.observeMessages) {
        observeConfig.subtree = true;
        observeConfig.characterData = true;  // Изменения текста
        observeConfig.attributes = true;     // Изменения атрибутов
    }

    _observer.observe(chatElement, observeConfig);
    _initialized = true;

    console.log('[STChatObserver] Initialized with config:', observeConfig);
}

/**
 * Обрабатывает мутации и эмитит события
 */
function processMutations(mutations) {
    let addedMessages = 0;
    let removedMessages = 0;

    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('mes')) {
                    addedMessages++;
                }
            });
            mutation.removedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('mes')) {
                    removedMessages++;
                }
            });
        }
    }

    if (addedMessages > 0) {
        eventBus.emit('chat:messages-added', { count: addedMessages });
    }

    if (removedMessages > 0) {
        eventBus.emit('chat:messages-removed', { count: removedMessages });
    }

    // Общее событие для любых изменений DOM чата
    if (addedMessages > 0 || removedMessages > 0) {
        eventBus.emit('chat:dom-changed', { added: addedMessages, removed: removedMessages });
    }
}

/**
 * Останавливает наблюдатель
 */
export function destroyChatObserver() {
    if (_observer) {
        _observer.disconnect();
        _observer = null;
    }
    _initialized = false;
    console.log('[STChatObserver] Destroyed');
}

/**
 * Проверяет, активен ли наблюдатель
 */
export function isObserving() {
    return _initialized && _observer !== null;
}

/**
 * Временно приостанавливает наблюдение (например, при bulk-обновлениях)
 */
export function pause() {
    if (_observer) {
        _observer.disconnect();
    }
}

/**
 * Возобновляет наблюдение
 */
export function resume() {
    if (_observer) {
        const chatElement = document.getElementById('chat');
        if (chatElement) {
            _observer.observe(chatElement, { childList: true, subtree: false });
        }
    }
}
