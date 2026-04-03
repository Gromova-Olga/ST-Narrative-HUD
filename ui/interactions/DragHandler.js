// ui/interactions/DragHandler.js

/**
 * Обработка drag-and-drop для окон HUD
 */

/**
 * Делает окно перетаскиваемым
 * @param {string} windowId - ID окна
 * @param {string} handleId - ID drag-handle (заголовок)
 */
export function makeDraggable(windowId, handleId) {
    const el = document.getElementById(windowId);
    const handle = document.getElementById(handleId);
    if (!el || !handle) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    handle.style.cursor = 'grab';

    handle.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = el.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        handle.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        el.style.left = `${startLeft + dx}px`;
        el.style.top = `${startTop + dy}px`;
        el.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            handle.style.cursor = 'grab';
            document.body.style.userSelect = '';
        }
    });
}

/**
 * Делает sidebar-окно перетаскиваемым (с сохранением позиции)
 * @param {string} windowId
 * @param {string} handleId
 * @param {Function} onPositionChange - колбэк(newPos) для сохранения
 */
export function makeDraggableWithSave(windowId, handleId, onPositionChange) {
    makeDraggable(windowId, handleId);

    const el = document.getElementById(windowId);
    if (!el) return;

    const observer = new MutationObserver(() => {
        if (onPositionChange && el.style.left && el.style.top) {
            onPositionChange({ top: el.style.top, left: el.style.left });
        }
    });

    // Не наблюдаем за мутациями — сохраняем по mouseup
    document.addEventListener('mouseup', () => {
        if (onPositionChange && el.style.left && el.style.top) {
            onPositionChange({ top: el.style.top, left: el.style.left });
        }
    });
}
