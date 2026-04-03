// core/LifecycleManager.js

/**
 * Управление жизненным циклом расширения
 * 
 * Координирует:
 * - Инициализацию всех модулей
 * - Подписку на ST-события → EventBus
 * - Обработку внутренних EventBus-событий
 * - Корректный shutdown
 */

import { eventBus } from './EventBus.js';
import { initSTEventListener, destroySTEventListener } from '../integration/STEventListener.js';
import { initChatObserver, destroyChatObserver } from '../integration/STChatObserver.js';
import { invalidateCache } from '../integration/STContextProvider.js';

let _initialized = false;
const _cleanupFunctions = [];

/**
 * Инициализация всех подсистем
 * @param {Object} handlers - объект с обработчиками событий
 */
export function initLifecycle(handlers = {}) {
    if (_initialized) {
        console.warn('[LifecycleManager] Already initialized');
        return;
    }

    // 1. ST Events → EventBus
    initSTEventListener();
    _cleanupFunctions.push(() => destroySTEventListener());

    // 2. Chat Observer → EventBus
    initChatObserver({ debounceMs: 100 });
    _cleanupFunctions.push(() => destroyChatObserver());

    // 3. Регистрируем обработчики внутренних EventBus-событий
    if (handlers.onMessageReceived) {
        const unsub = eventBus.on('st:message-received', handlers.onMessageReceived);
        _cleanupFunctions.push(unsub);
    }

    if (handlers.onChatChanged) {
        const unsub = eventBus.on('st:chat-changed', handlers.onChatChanged);
        _cleanupFunctions.push(unsub);
    }

    if (handlers.onMessageDeleted) {
        const unsub = eventBus.on('st:message-deleted', handlers.onMessageDeleted);
        _cleanupFunctions.push(unsub);
    }

    if (handlers.onMessageSwiped) {
        const unsub = eventBus.on('st:message-swiped', handlers.onMessageSwiped);
        _cleanupFunctions.push(unsub);
    }

    if (handlers.onChatDeleted) {
        const unsub = eventBus.on('st:chat-deleted', handlers.onChatDeleted);
        _cleanupFunctions.push(unsub);
    }

    if (handlers.onGenerationStarted) {
        const unsub = eventBus.on('st:generation-started', handlers.onGenerationStarted);
        _cleanupFunctions.push(unsub);
    }

    if (handlers.onMessageRendered) {
        const unsub = eventBus.on('st:message-rendered', handlers.onMessageRendered);
        _cleanupFunctions.push(unsub);
    }

    _initialized = true;
    console.log('[LifecycleManager] Initialized');
}

/**
 * Корректное завершение — отписка от всех событий
 */
export function shutdownLifecycle() {
    _cleanupFunctions.forEach(fn => {
        try { fn(); } catch (e) { console.warn('[LifecycleManager] Cleanup error:', e); }
    });
    _cleanupFunctions.length = 0;
    _initialized = false;
    invalidateCache();
    console.log('[LifecycleManager] Shut down');
}

/**
 * Проверяет, инициализирован ли lifecycle
 */
export function isLifecycleInitialized() {
    return _initialized;
}
