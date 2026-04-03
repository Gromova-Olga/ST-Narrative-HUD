// ui/interactions/ClickHandler.js

/**
 * Централизованная обработка кликов
 */

import { eventBus } from '../../core/EventBus.js';

/**
 * Делегирование кликов на контейнер
 * @param {Element} container - контейнер
 * @param {string} selector - CSS-селектор для делегирования
 * @param {Function} handler - обработчик(event, element)
 */
export function delegateClick(container, selector, handler) {
    container.addEventListener('click', (e) => {
        const target = e.target.closest(selector);
        if (target) handler(e, target);
    });
}

/**
 * Клик с защитой от двойного срабатывания (debounce)
 * @param {Element} el
 * @param {Function} handler
 * @param {number} delay
 */
export function clickDebounced(el, handler, delay = 300) {
    let lastClick = 0;
    el.addEventListener('click', (e) => {
        const now = Date.now();
        if (now - lastClick < delay) return;
        lastClick = now;
        handler(e);
    });
}

/**
 * Обработчик клика вне элемента
 * @param {Element} el - элемент
 * @param {Function} handler - вызывается при клике вне el
 * @returns {Function} функция отписки
 */
export function onClickOutside(el, handler) {
    const listener = (e) => {
        if (!el.contains(e.target)) handler(e);
    };
    document.addEventListener('click', listener);
    return () => document.removeEventListener('click', listener);
}

/**
 * Регистрирует обработчик клика и публикует в EventBus
 * @param {Element} el
 * @param {string} eventName
 * @param {Object} data
 */
export function emitClick(el, eventName, data = {}) {
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        eventBus.emit(eventName, { ...data, event: e, element: el });
    });
}
