// ui/components/modals/ModalManager.js

/**
 * Управление модальными окнами
 */

import { makeDraggable } from '../../interactions/DragHandler.js';
import { makeTouchDraggable } from '../../interactions/TouchHandler.js';

const _activeModals = new Map();

/**
 * Показывает модальное окно
 * @param {string} id - уникальный ID модалки
 * @param {jQuery} html - содержимое
 * @param {Object} options - { draggable, headerId, onClose }
 */
export function showModal(id, html, options = {}) {
    // Закрываем существующую с тем же ID
    if (_activeModals.has(id)) {
        closeModal(id);
    }

    $('body').append(html);
    _activeModals.set(id, { element: html, options });

    if (options.draggable && options.headerId) {
        makeDraggable(id, options.headerId);
        makeTouchDraggable(id, options.headerId);
    }

    // Кнопка закрытия
    if (options.closeButtonId) {
        $(`#${options.closeButtonId}`).on('click', () => closeModal(id));
    }

    html.hide().fadeIn(150);
}

/**
 * Закрывает модальное окно
 * @param {string} id
 */
export function closeModal(id) {
    const modal = _activeModals.get(id);
    if (modal) {
        modal.element.fadeOut(150, () => modal.element.remove());
        _activeModals.delete(id);
        if (modal.options.onClose) modal.options.onClose();
    }
}

/**
 * Закрывает все модалки
 */
export function closeAllModals() {
    _activeModals.forEach((_, id) => closeModal(id));
}

/**
 * Проверяет, открыта ли модалка
 */
export function isModalOpen(id) {
    return _activeModals.has(id);
}
