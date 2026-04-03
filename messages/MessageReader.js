// messages/MessageReader.js

/**
 * Чтение данных из сообщений SillyTavern
 * 
 * Инкапсулирует доступ к содержимому сообщений ST:
 * - Текст сообщения (из контекста и DOM)
 * - HTML-разметка
 * - Метаданные (is_user, is_system)
 */

import { getContext, getChat, getMessage, getLastBotMessage } from '../integration/STContextProvider.js';

/**
 * Получает текст сообщения из контекста ST
 * @param {string|number} messageId
 * @returns {string}
 */
export function getMessageText(messageId) {
    const msg = getMessage(messageId);
    return msg?.mes || '';
}

/**
 * Получает текст сообщения из DOM
 * @param {string|number} messageId
 * @returns {string}
 */
export function getMessageTextFromDOM(messageId) {
    const el = document.querySelector(`.mes[mesid="${messageId}"] .mes_text`);
    return el ? el.textContent || el.innerText || '' : '';
}

/**
 * Получает HTML сообщения из DOM
 * @param {string|number} messageId
 * @returns {string}
 */
export function getMessageHtmlFromDOM(messageId) {
    const el = document.querySelector(`.mes[mesid="${messageId}"] .mes_text`);
    return el ? el.innerHTML || '' : '';
}

/**
 * Получает текст последнего сообщения бота
 * @returns {{ text: string, index: number }|null}
 */
export function getLastBotText() {
    const last = getLastBotMessage();
    if (!last) return null;
    return { text: last.message.mes || '', index: last.index };
}

/**
 * Проверяет, является ли сообщение от пользователя
 * @param {string|number} messageId
 * @returns {boolean}
 */
export function isUserMessage(messageId) {
    const msg = getMessage(messageId);
    return !!msg?.is_user;
}

/**
 * Проверяет, является ли сообщение системным
 * @param {string|number} messageId
 * @returns {boolean}
 */
export function isSystemMessage(messageId) {
    const msg = getMessage(messageId);
    return !!msg?.is_system;
}

/**
 * Получает количество сообщений в чате
 * @returns {number}
 */
export function getMessageCount() {
    return getChat().length;
}

/**
 * Ищет последнее сообщение бота после удаления (для отката)
 * @returns {{ index: number, message: Object }|null}
 */
export function findLastBotAfterDeletion() {
    const chat = getChat();
    for (let i = chat.length - 1; i >= 0; i--) {
        if (!chat[i].is_user && !chat[i].is_system) {
            return { index: i, message: chat[i] };
        }
    }
    return null;
}

/**
 * Безопасно записывает текст в DOM-элемент сообщения
 * @param {string|number} messageId
 * @param {string} html
 */
export function setMessageHtmlInDOM(messageId, html) {
    const el = document.querySelector(`.mes[mesid="${messageId}"] .mes_text`);
    if (el) el.innerHTML = html;
}
