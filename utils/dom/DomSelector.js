// utils/dom/DomSelector.js

/**
 * Селекторы DOM-элементов SillyTavern
 * Централизованные селекторы, чтобы не дублировать строки по проекту
 */

/**
 * Получает DOM-элемент сообщения
 */
export function getMessageElement(messageId) {
    return document.querySelector(`.mes[mesid="${messageId}"]`);
}

/**
 * Получает текстовый элемент сообщения
 */
export function getMesTextElement(messageId) {
    return document.querySelector(`.mes[mesid="${messageId}"] .mes_text`);
}

/**
 * Получает все сообщения в чате
 */
export function getAllMessages() {
    return document.querySelectorAll('.mes');
}

/**
 * Получает все сообщения бота (не user, не system)
 */
export function getBotMessages() {
    return document.querySelectorAll('.mes[is_user="false"]');
}

/**
 * Получает контейнер чата
 */
export function getChatContainer() {
    return document.getElementById('chat');
}

/**
 * Получает кнопки внутри сообщения
 */
export function getMesButtons(messageId) {
    const el = getMessageElement(messageId);
    return el ? el.querySelector('.mes_buttons') : null;
}

/**
 * Получает extraMesButtons контейнер
 */
export function getExtraMesButtons(messageId) {
    const el = getMessageElement(messageId);
    return el ? el.querySelector('.extraMesButtons') : null;
}

/**
 * Получает swipeId из DOM-атрибута
 */
export function getSwipeIdAttr(messageId) {
    const el = getMessageElement(messageId);
    return el ? el.getAttribute('swipeid') : null;
}

/**
 * Проверяет, виден ли элемент в viewport
 */
export function isElementVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
}
