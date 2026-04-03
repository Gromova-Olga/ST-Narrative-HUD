// ui/Popups.js
import { extensionName } from "../core/constants.js";

/**
 * Показывает всплывающее уведомление (achievement, уведомление и т.д.)
 * @param {Object} ach - {title, desc, icon}
 */
export function showAchievementPopup(ach) {
    let container = $("#nhud-popup-container");
    if (!container.length) {
        $("body").append('<div id="nhud-popup-container" style="position:fixed; bottom:20px; right:20px; z-index:2147483647; display:flex; flex-direction:column; gap:10px; pointer-events:none;"></div>');
        container = $("#nhud-popup-container");
    }

    const id = 'ach-' + Date.now() + Math.floor(Math.random() * 1000);
    const html = $(`
        <div id="${id}" class="nhud-achievement-popup" style="position:relative !important; bottom:auto !important; right:auto !important; pointer-events:auto; box-shadow: 0 5px 15px rgba(0,0,0,0.8);">
            <div class="nhud-ach-icon">${ach.icon || '🏆'}</div>
            <div class="nhud-ach-text">
                <div style="font-size:9px; color:var(--nhud-text-muted, #a08080); text-transform:uppercase; font-weight:bold; margin-bottom:2px;">УВЕДОМЛЕНИЕ HUD</div>
                <div class="nhud-ach-title">${ach.title}</div>
                <div class="nhud-ach-desc">${ach.desc}</div>
            </div>
        </div>
    `);
    
    container.append(html);
    setTimeout(() => html.addClass('show'), 50);
    setTimeout(() => {
        html.removeClass('show');
        setTimeout(() => html.remove(), 600);
    }, 12000);
}

/**
 * Делает окно перетаскиваемым за handle.
 * Учитывает порог движения (4px) для корректной работы кликов.
 */
export function makeWindowDraggable(elementId, handleId) {
    const el = document.getElementById(elementId);
    const handle = document.getElementById(handleId) || el;
    if (!el || !handle) return;

    handle.onmousedown = null;
    handle.onpointerdown = null;

    let isDragging = false, hasMoved = false, startX, startY, initX, initY, pointerId;

    const onPointerDown = (e) => {
        if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'].includes(e.target.tagName)) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        isDragging = true;
        hasMoved = false;
        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = el.getBoundingClientRect();
        initX = rect.left;
        initY = rect.top;
    };

    const onPointerMove = (e) => {
        if (!isDragging || e.pointerId !== pointerId) return;

        if (!hasMoved) {
            if (Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4) {
                hasMoved = true;
                handle.setPointerCapture(e.pointerId);
                handle.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';
            } else {
                return;
            }
        }

        let newLeft = initX + (e.clientX - startX);
        let newTop  = initY + (e.clientY - startY);
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth  - el.offsetWidth));
        newTop  = Math.max(0, Math.min(newTop,  window.innerHeight - el.offsetHeight));
        el.style.left = newLeft + 'px';
        el.style.top  = newTop  + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.transform = 'none';
    };

    const onPointerUp = (e) => {
        if (!isDragging || e.pointerId !== pointerId) return;
        isDragging = false;
        
        if (hasMoved) {
            handle.releasePointerCapture(e.pointerId);
            handle.style.cursor = 'grab';
            document.body.style.userSelect = '';

            import('../core/StateManager.js').then(m => {
                const settings = m.getSettings();
                if (elementId === 'nhud-infoblock-popup') {
                    settings.design.promptPos = { left: el.style.left, top: el.style.top };
                } else if (elementId === 'nhud-widget-container') {
                    if (!settings.ui) settings.ui = {};
                    settings.ui.widgetPos = { left: el.style.left, top: el.style.top };
                } else {
                    if (!settings.ui) settings.ui = {};
                    settings.ui[elementId + 'Pos'] = { left: el.style.left, top: el.style.top };
                }
                import('../../../../../script.js').then(s => s.saveSettingsDebounced());
            });
        }
        hasMoved = false;
    };

    handle.addEventListener('pointerdown', onPointerDown, { passive: false });
    handle.addEventListener('pointermove', onPointerMove, { passive: true });
    handle.addEventListener('pointerup',   onPointerUp);

    // Клик-маркер для статических элементов
    const clickMarker = document.createElement('div');
    clickMarker.style.cssText = 'position:fixed;top:50%;left:50%;width:0;height:0;border-radius:50%;background:rgba(208,80,112,0.15);pointer-events:none;z-index:2147483647;transition:all 0.5s ease-out;opacity:0;transform:translate(-50%,-50%);';
    document.body.appendChild(clickMarker);
}
