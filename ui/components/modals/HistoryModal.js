// ui/components/modals/HistoryModal.js

/**
 * Модальное окно истории инфоблоков сообщения
 */

import { eventBus } from '../../../core/EventBus.js';
import { getChatId } from '../../../integration/STContextProvider.js';
import { getMessageBlocks } from '../../../storage/MessageBlocksAdapter.js';

/**
 * Показывает popup истории для сообщения
 * @param {string|number} messageId
 * @param {Object} liveInfoBlocks - объект live.infoBlocks для обновления
 * @param {Array} promptBlocks - конфигурация promptBlocks
 * @param {Function} onInfoBlocksUpdate - колбэк для обновления UI
 */
export function showHistoryPopup(messageId, liveInfoBlocks, promptBlocks, onInfoBlocksUpdate) {
    const chatId = getChatId();
    if (!chatId) return;

    const blocks = getMessageBlocks(chatId, String(messageId));
    if (Object.keys(blocks).length === 0) return;

    // Применяем блоки к live
    Object.entries(blocks).forEach(([key, value]) => {
        liveInfoBlocks[key] = value;
    });

    if (onInfoBlocksUpdate) onInfoBlocksUpdate();

    // Кликаем на первую кнопку с данными
    const firstKey = (promptBlocks || []).find(b => blocks[b.id])?.id;
    if (firstKey) $(`.nhud-info-btn[data-block="${firstKey}"]`).trigger('click');

    eventBus.emit('history:shown', { messageId });
}
