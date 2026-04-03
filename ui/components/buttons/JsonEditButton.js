// ui/components/buttons/JsonEditButton.js

/**
 * Кнопки JSON-редактора и извлечения данных (🪄 + код)
 */

import { eventBus } from '../../../core/EventBus.js';
import { getContext } from '../../../integration/STContextProvider.js';
import { getMessageBlocks } from '../../../storage/MessageBlocksAdapter.js';
import { loadSwipeData } from '../../../storage/SwipeDataAdapter.js';
import { getChatId } from '../../../integration/STContextProvider.js';
import { getCurrentSwipeId } from '../../../messages/SwipeDetector.js';

/**
 * Добавляет кнопки к сообщению (JSON editor + extract)
 * @param {string|number} messageId
 */
export function addMessageButtons(messageId) {
    const messageElement = $(`.mes[mesid="${messageId}"]`);
    if (!messageElement.length) return;
    if (messageElement.find('.nhud-msg-actions').length) return;

    const chatId = getChatId();
    const savedData = chatId ? getMessageBlocks(chatId, String(messageId)) : {};
    const swipeId = getCurrentSwipeId(messageId);
    const swipeData = chatId && swipeId ? loadSwipeData(chatId, `${messageId}_${swipeId}`) : null;
    const hasData = Object.keys(savedData).length > 0 || (swipeData && Object.keys(swipeData).length > 0);

    const btnContainer = $(`<div class="nhud-msg-actions" style="display:inline-flex; gap:4px; margin-left:8px;"></div>`);

    // Кнопка JSON editor
    const jsonButton = $(`
        <div class="mes_button" title="Редактор JSON (Narrative HUD)" style="${!hasData ? 'opacity:0.5;' : ''}">
            <i class="fa-solid fa-code"></i>
        </div>
    `);
    jsonButton.on('click', (e) => {
        e.stopPropagation();
        eventBus.emit('json-editor:open', { messageId: String(messageId) });
    });

    // Кнопка извлечения
    const extractButton = $(`
        <div class="mes_button" title="Извлечь статы из текста (Regex)">🪄</div>
    `);
    extractButton.on('click', (e) => {
        e.stopPropagation();
        eventBus.emit('data-extract:click', { messageId: String(messageId) });
    });

    btnContainer.append(extractButton).append(jsonButton);

    const eyeButton = messageElement.find('.extraMesButtons .fa-eye, .extraMesButtons .fa-eye-slash').first();
    if (eyeButton.length) eyeButton.parent().after(btnContainer);
    else messageElement.find('.extraMesButtons').append(btnContainer);
}

/**
 * Обновляет все кнопки JSON-редактора
 */
export function updateAllJsonEditButtons() {
    const ctx = getContext();
    if (!ctx?.chat) return;
    ctx.chat.forEach((_, index) => addMessageButtons(index));
}
