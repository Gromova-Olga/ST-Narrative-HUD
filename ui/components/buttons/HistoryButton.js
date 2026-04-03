// ui/components/buttons/HistoryButton.js

/**
 * Кнопка истории (📋) — показывает инфоблоки сообщения
 */

import { eventBus } from '../../../core/EventBus.js';
import { getMessageBlocks } from '../../../storage/MessageBlocksAdapter.js';
import { loadSwipeData } from '../../../storage/SwipeDataAdapter.js';
import { getChatId } from '../../../integration/STContextProvider.js';
import { getSwipeIdFromDOM } from '../../../messages/SwipeDetector.js';

/**
 * Добавляет кнопку истории к сообщению
 * @param {string|number} messageId
 * @param {jQuery} messageElement
 */
export function addHistoryButton(messageId, messageElement) {
    if (!messageElement) messageElement = $(`.mes[mesid="${messageId}"]`);
    if (messageElement.find('.nhud-history-btn').length) return;

    const btn = $(`<button class="nhud-history-btn" title="Инфоблоки этого сообщения">📋</button>`);
    btn.on('click', (e) => {
        e.stopPropagation();
        eventBus.emit('history-button:click', { messageId: String(messageId) });
    });

    const mesButtons = messageElement.find('.mes_buttons');
    if (mesButtons.length) {
        mesButtons.append(btn);
    } else {
        messageElement.find('.mes_text').css('position', 'relative').append(btn);
    }
}

/**
 * Обновляет видимость всех кнопок истории
 */
export function updateHistoryButtons() {
    const chatId = getChatId();
    if (!chatId) return;

    document.querySelectorAll('.mes[is_user="false"]').forEach(mes => {
        const msgId = mes.getAttribute('mesid');
        if (!msgId) return;

        const existing = mes.querySelector('.nhud-history-btn');
        const swipeId = mes.getAttribute('swipeid') || '0';

        const blocks = getMessageBlocks(chatId, msgId);
        const swipeData = loadSwipeData(chatId, `${msgId}_${swipeId}`);
        const hasBlocks = Object.keys(blocks).length > 0;
        const hasSwipeBlocks = swipeData?.infoBlocks && Object.keys(swipeData.infoBlocks).length > 0;
        const hasHistory = hasBlocks || hasSwipeBlocks;

        if (existing) {
            existing.style.display = hasHistory ? '' : 'none';
            return;
        }
        if (hasHistory) addHistoryButton(msgId, $(mes));
    });
}
