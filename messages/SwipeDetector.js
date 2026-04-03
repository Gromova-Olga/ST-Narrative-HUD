// messages/SwipeDetector.js

/**
 * Определение текущего свайпа и информации о сообщениях
 * 
 * Инкапсулирует логику работы со свайпами SillyTavern:
 * - Получение swipeId из DOM или контекста ST
 * - Формирование ключей для хранилища
 * - Определение последнего сообщения бота
 */

import { getContext, getChat, getMessage } from '../integration/STContextProvider.js';

/**
 * Получает текущий swipeId для сообщения
 * Пробует DOM-атрибут, затем контекст ST, fallback = 0
 * @param {string|number} messageId
 * @returns {number}
 */
export function getCurrentSwipeId(messageId) {
    // Из контекста ST
    const msg = getMessage(messageId);
    if (msg && msg.swipe_id !== undefined) {
        return msg.swipe_id;
    }

    // Из DOM
    const mesEl = document.querySelector(`.mes[mesid="${messageId}"]`);
    if (mesEl) {
        const swipeId = mesEl.getAttribute('swipeid');
        return swipeId !== null ? parseInt(swipeId) : 0;
    }

    return 0;
}

/**
 * Получает swipeId из DOM-атрибута (без fallback)
 * @param {string|number} messageId
 * @returns {number|null}
 */
export function getSwipeIdFromDOM(messageId) {
    const mesEl = document.querySelector(`.mes[mesid="${messageId}"]`);
    if (!mesEl) return null;
    const swipeId = mesEl.getAttribute('swipeid');
    return swipeId !== null ? parseInt(swipeId) : 0;
}

/**
 * Формирует ключ свайпа для хранилища
 * @param {string|number} messageId
 * @param {number} swipeId
 * @returns {string} "messageId_swipeId"
 */
export function getSwipeKey(messageId, swipeId) {
    return `${messageId}_${swipeId}`;
}

/**
 * Парсит ключ свайпа обратно в компоненты
 * @param {string} swipeKey
 * @returns {{ messageId: string, swipeId: number }}
 */
export function parseSwipeKey(swipeKey) {
    const parts = String(swipeKey).split('_');
    return {
        messageId: parts[0],
        swipeId: parseInt(parts[1]) || 0,
    };
}

/**
 * Получает информацию о последнем сообщении бота
 * @returns {{ msgId: number|null, swipeId: number|null, key: string|null }}
 */
export function getLastBotMessageInfo() {
    const chat = getChat();
    if (!chat?.length) return { msgId: null, swipeId: null, key: null };

    for (let i = chat.length - 1; i >= 0; i--) {
        if (!chat[i].is_user && !chat[i].is_system) {
            const swipeId = getCurrentSwipeId(i);
            return {
                msgId: i,
                swipeId,
                key: getSwipeKey(i, swipeId),
            };
        }
    }

    return { msgId: null, swipeId: null, key: null };
}

/**
 * Проверяет, есть ли у сообщения несколько свайпов
 * @param {string|number} messageId
 * @returns {boolean}
 */
export function hasMultipleSwipes(messageId) {
    const msg = getMessage(messageId);
    if (!msg) return false;
    return Array.isArray(msg.swipes) && msg.swipes.length > 1;
}

/**
 * Получает количество свайпов у сообщения
 * @param {string|number} messageId
 * @returns {number}
 */
export function getSwipeCount(messageId) {
    const msg = getMessage(messageId);
    if (!msg) return 0;
    return Array.isArray(msg.swipes) ? msg.swipes.length : 1;
}
