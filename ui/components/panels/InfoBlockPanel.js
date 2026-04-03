// ui/components/panels/InfoBlockPanel.js

/**
 * Панель инфоблоков — отображение и переключение блоков
 */

import { eventBus } from '../../../core/EventBus.js';
import { formatPopupText } from '../../../utils/formatting/PopupFormatter.js';

/**
 * Рендерит кнопки инфоблоков
 * @param {Array} promptBlocks - [{ id, label, enabled }]
 * @param {Object} infoBlocks - { blockId: content }
 * @returns {string} HTML
 */
export function renderInfoBlockButtons(promptBlocks, infoBlocks) {
    return (promptBlocks || [])
        .filter(b => b.enabled)
        .map(block => {
            const hasContent = infoBlocks[block.id] && infoBlocks[block.id].trim().length > 0;
            return `<button class="nhud-info-btn ${hasContent ? 'has-content' : ''}" 
                data-block="${block.id}" 
                title="${block.label}"
                style="padding:4px 8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; cursor:pointer; font-size:12px; color:var(--nhud-text-main); transition:0.2s;">
                ${block.label}
            </button>`;
        })
        .join('');
}

/**
 * Показывает содержимое инфоблока в popup
 * @param {string} blockId
 * @param {string} content
 * @param {string} title
 */
export function showInfoBlockContent(blockId, content, title) {
    const popup = document.getElementById('nhud-infoblock-popup');
    const titleEl = document.getElementById('nhud-infoblock-popup-title');
    const contentEl = document.getElementById('nhud-infoblock-popup-content');

    if (popup && contentEl) {
        if (titleEl) titleEl.textContent = title || blockId;
        contentEl.innerHTML = formatPopupText(content);
        popup.style.display = 'block';

        // Подсвечиваем активную кнопку
        document.querySelectorAll('.nhud-info-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.nhud-info-btn[data-block="${blockId}"]`)?.classList.add('active');

        eventBus.emit('infoblock:shown', { blockId, title });
    }
}

/**
 * Скрывает popup инфоблока
 */
export function hideInfoBlockPopup() {
    const popup = document.getElementById('nhud-infoblock-popup');
    if (popup) popup.style.display = 'none';
    document.querySelectorAll('.nhud-info-btn').forEach(b => b.classList.remove('active'));
}
