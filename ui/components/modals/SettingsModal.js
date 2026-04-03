// ui/components/modals/SettingsModal.js

/**
 * Модальное окно настроек
 * Ссылается на существующий SettingsUI.js для рендера
 */

import { showModal, closeModal } from './ModalManager.js';

const MODAL_ID = 'nhud-settings';

/**
 * Открывает панель настроек Narrative HUD
 */
export function openSettingsPanel() {
    const panel = document.getElementById('nhud-settings-panel');
    if (panel) {
        panel.classList.toggle('open');
    }
    // SettingsUI.js по-прежнему рендерит содержимое
}

/**
 * Открывает панель настроек внешнего вида
 */
export function openDesignSettings() {
    const panel = document.getElementById('nhud-settings-panel');
    if (panel) {
        panel.classList.add('open');
        // Переключаемся на вкладку дизайна
        const designTab = panel.querySelector('[data-tab="design"]');
        if (designTab) designTab.click();
    }
}
