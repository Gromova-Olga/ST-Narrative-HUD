// ui/interactions/TouchHandler.js

/**
 * Обработка touch-событий для мобильных устройств
 */

/**
 * Добавляет touch-drag для элемента
 * @param {string} windowId
 * @param {string} handleId
 */
export function makeTouchDraggable(windowId, handleId) {
    const el = document.getElementById(windowId);
    const handle = document.getElementById(handleId);
    if (!el || !handle) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    handle.addEventListener('touchstart', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        const touch = e.touches[0];
        isDragging = true;
        startX = touch.clientX;
        startY = touch.clientY;
        const rect = el.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        el.style.left = `${startLeft + dx}px`;
        el.style.top = `${startTop + dy}px`;
        el.style.right = 'auto';
        e.preventDefault();
    }, { passive: false });

    handle.addEventListener('touchend', () => {
        isDragging = false;
    });
}

/**
 * Добавляет обработчик свайпа
 * @param {Element} el - элемент
 * @param {Function} onSwipeLeft
 * @param {Function} onSwipeRight
 * @param {number} threshold - минимальная дистанция свайпа
 */
export function addSwipeListener(el, onSwipeLeft, onSwipeRight, threshold = 50) {
    let startX = 0;

    el.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].clientX;
        const diff = endX - startX;
        if (Math.abs(diff) > threshold) {
            if (diff > 0 && onSwipeRight) onSwipeRight();
            else if (diff < 0 && onSwipeLeft) onSwipeLeft();
        }
    });
}
