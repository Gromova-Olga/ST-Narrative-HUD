// integration/STEventListener.js

/**
 * Подписка на события SillyTavern и преобразование во внутренние события EventBus
 * 
 * Все обработчики ST-событий живут здесь.
 * Внутренние модули слушают только EventBus, не зная о ST API.
 */

import { eventSource, event_types } from '../../../../../script.js';
import { eventBus } from '../core/EventBus.js';
import { getChat, getLastBotMessage, getChatId, invalidateCache } from './STContextProvider.js';

/**
 * Маппинг ST event_types → внутренние имена EventBus
 */
const EVENT_MAP = {
    [event_types.GENERATION_STARTED]:       'st:generation-started',
    [event_types.CHARACTER_MESSAGE_RENDERED]: 'st:message-rendered',
    [event_types.MESSAGE_RECEIVED]:         'st:message-received',
    [event_types.CHAT_CHANGED]:             'st:chat-changed',
    [event_types.MESSAGE_DELETED]:          'st:message-deleted',
    [event_types.MESSAGE_SWIPED]:           'st:message-swiped',
    [event_types.CHAT_DELETED]:             'st:chat-deleted',
};

let _initialized = false;
const _unsubscribers = [];

/**
 * Инициализирует подписки на ST-события
 * Вызывается один раз при старте расширения
 */
export function initSTEventListener() {
    if (_initialized) {
        console.warn('[STEventListener] Already initialized');
        return;
    }

    // Генерация началась
    _subscribe(event_types.GENERATION_STARTED, () => {
        invalidateCache();
        eventBus.emit('st:generation-started', {});
    });

    // Сообщение отрендерено (DOM обновлён)
    _subscribe(event_types.CHARACTER_MESSAGE_RENDERED, () => {
        eventBus.emit('st:message-rendered', {});
    });

    // Сообщение получено от API
    _subscribe(event_types.MESSAGE_RECEIVED, () => {
        invalidateCache();
        const lastBot = getLastBotMessage();
        if (lastBot) {
            eventBus.emit('st:message-received', {
                messageIndex: lastBot.index,
                message: lastBot.message,
                text: lastBot.message.mes || '',
            });
        }
    });

    // Чат сменился
    _subscribe(event_types.CHAT_CHANGED, () => {
        invalidateCache();
        eventBus.emit('st:chat-changed', {
            chatId: getChatId(),
        });
    });

    // Сообщение удалено
    _subscribe(event_types.MESSAGE_DELETED, (messageId) => {
        invalidateCache();
        eventBus.emit('st:message-deleted', {
            messageId: String(messageId),
        });
    });

    // Свайп
    _subscribe(event_types.MESSAGE_SWIPED, (mesId) => {
        invalidateCache();
        eventBus.emit('st:message-swiped', {
            messageId: mesId !== undefined && mesId !== null ? String(mesId) : null,
        });
    });

    // Чат удалён
    _subscribe(event_types.CHAT_DELETED, (chatId) => {
        invalidateCache();
        eventBus.emit('st:chat-deleted', {
            chatId: chatId ? String(chatId) : null,
        });
    });

    _initialized = true;
    console.log('[STEventListener] Initialized — listening to', Object.keys(EVENT_MAP).length, 'ST events');
}

/**
 * Подписка на ST-событие с отслеживанием для cleanup
 */
function _subscribe(eventType, handler) {
    eventSource.on(eventType, handler);
    // NOTE: ST eventSource не возвращает unsubscribe-функцию,
    // поэтому мы запоминаем пары для возможного off в будущем
    _unsubscribers.push({ eventType, handler });
}

/**
 * Отписка от всех ST-событий (для destroy/cleanup)
 */
export function destroySTEventListener() {
    _unsubscribers.forEach(({ eventType, handler }) => {
        // ST eventSource может поддерживать off — зависит от версии
        if (eventSource.off) {
            eventSource.off(eventType, handler);
        }
    });
    _unsubscribers.length = 0;
    _initialized = false;
    console.log('[STEventListener] Destroyed');
}

/**
 * Проверяет, инициализирован ли слушатель
 */
export function isInitialized() {
    return _initialized;
}
