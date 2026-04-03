// ui/components/buttons/MessageButtonInjector.js

/**
 * Инъекция кнопок в сообщения
 * 
 * Координирует добавление HistoryButton и JsonEditButton
 * к сообщениям в чате.
 */

import { eventBus } from '../../../core/EventBus.js';
import { addHistoryButton, updateHistoryButtons } from './HistoryButton.js';
import { addMessageButtons, updateAllJsonEditButtons } from './JsonEditButton.js';

/**
 * Добавляет все кнопки к сообщению
 * @param {string|number} messageId
 */
export function injectButtons(messageId) {
    const messageElement = $(`.mes[mesid="${messageId}"]`);
    if (!messageElement.length) return;

    addHistoryButton(messageId, messageElement);
    addMessageButtons(messageId);
}

/**
 * Обновляет все кнопки во всех сообщениях
 */
export function updateAllButtons() {
    updateHistoryButtons();
    updateAllJsonEditButtons();
}

/**
 * Подписывает инжектор на события EventBus
 * @returns {Function} функция отписки
 */
export function initButtonInjector() {
    const unsub1 = eventBus.on('st:message-rendered', () => {
        setTimeout(updateAllButtons, 300);
    });

    const unsub2 = eventBus.on('chat:dom-changed', () => {
        updateAllButtons();
    });

    return () => { unsub1(); unsub2(); };
}
