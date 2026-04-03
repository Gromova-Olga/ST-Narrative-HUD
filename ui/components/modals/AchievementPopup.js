// ui/components/modals/AchievementPopup.js

/**
 * Всплывающее уведомление (достижения, события)
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
