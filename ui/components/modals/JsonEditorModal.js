// ui/components/modals/JsonEditorModal.js

/**
 * Модальное окно JSON-редактора
 */

import { showModal, closeModal } from './ModalManager.js';
import { eventBus } from '../../../core/EventBus.js';
import { loadSwipeData } from '../../../storage/SwipeDataAdapter.js';
import { getMessageBlocks } from '../../../storage/MessageBlocksAdapter.js';
import { getChatId } from '../../../integration/STContextProvider.js';
import { getSwipeIdFromDOM } from '../../../messages/SwipeDetector.js';
import { callPopup } from '../../../../../../script.js';

const MODAL_ID = 'nhud-json-editor';

/**
 * Открывает JSON-редактор для сообщения
 * @param {string|number} messageId
 * @param {Object} settings - настройки расширения
 */
export async function openJsonEditor(messageId, settings) {
    const messageElement = $(`.mes[mesid="${messageId}"]`);
    if (!messageElement.length) { toastr.error('Сообщение не найдено'); return; }

    const swipeId = messageElement.attr('swipeid');
    if (swipeId === undefined) { toastr.error('Не удалось определить свайп'); return; }

    const chatId = getChatId();
    const swipeKey = `${messageId}_${swipeId}`;
    const swipeData = chatId ? loadSwipeData(chatId, swipeKey) : null;
    const infoBlocks = chatId ? getMessageBlocks(chatId, String(messageId)) : {};

    const fullData = {
        trackers: swipeData?.trackerValues || {},
        characters: swipeData?.characters
            ? Object.entries(swipeData.characters).map(([name, data]) => ({
                name, outfit: data.outfit || '', state: data.state || '', thoughts: data.thoughts || ''
            }))
            : [],
        datetime: swipeData?.infoBlocks?.datetime || '',
    };

    (settings.promptBlocks || []).forEach(b => {
        fullData[b.id] = infoBlocks[b.id] || swipeData?.infoBlocks?.[b.id] || '';
    });

    const editorHtml = $(`
        <div class="nhud-json-editor">
            <h3 style="margin-bottom:15px;">📦 JSON Editor — Сообщение #${messageId} · Свайп #${swipeId}</h3>
            <div style="margin-bottom:10px; color:#606080; font-size:0.85em;">
                Редактируй данные для этого свайпа. Сохранение применит изменения к HUD.
            </div>
            <textarea id="nhud-json-editor-textarea" class="nhud-json-editor-textarea" rows="20" style="width:100%; font-family:monospace;">${
                JSON.stringify(fullData, null, 2)
            }</textarea>
            <div style="display:flex; gap:10px; margin-top:15px; justify-content:flex-end;">
                <button id="nhud-json-editor-validate" class="menu_button">🔍 Validate</button>
                <button id="nhud-json-editor-format" class="menu_button">✨ Format</button>
            </div>
        </div>
    `);

    setTimeout(() => {
        editorHtml.find('#nhud-json-editor-validate').on('click', () => {
            try { JSON.parse(editorHtml.find('#nhud-json-editor-textarea').val()); toastr.success('✅ JSON валидный!'); }
            catch (e) { toastr.error('❌ ' + e.message); }
        });
        editorHtml.find('#nhud-json-editor-format').on('click', () => {
            const ta = editorHtml.find('#nhud-json-editor-textarea');
            try { ta.val(JSON.stringify(JSON.parse(ta.val()), null, 2)); toastr.success('✨ Отформатировано'); }
            catch (e) { toastr.error('Ошибка форматирования'); }
        });
    }, 100);

    const result = await callPopup(editorHtml, 'confirm', null, { okButton: '💾 Сохранить', cancelButton: 'Отмена', wide: true });

    if (result) {
        try {
            const newData = JSON.parse(editorHtml.find('#nhud-json-editor-textarea').val());
            eventBus.emit('json-editor:save', { messageId, swipeId: parseInt(swipeId), data: newData });
            toastr.success('Данные сохранены и применены!');
        } catch (e) {
            toastr.error('Ошибка: ' + e.message);
        }
    }
}
