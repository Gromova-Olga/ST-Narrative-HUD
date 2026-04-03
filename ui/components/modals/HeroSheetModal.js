// ui/components/modals/HeroSheetModal.js
// Модальное окно прокачки героя (Статы, XP, уровни)

import { eventBus } from '../../../core/EventBus.js';
import { makeDraggable } from '../../interactions/DragHandler.js';

export function toggleHeroSheet(makeWindowDraggableFn) {
    let popup = $("#nhud-hero-sheet");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-hero-sheet" style="display:none; position:fixed; top:15vh; left:calc(50% - 140px); width:280px; z-index:9995; background:var(--nhud-prompt-bg, #151220); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-hero-header" style="display:flex; justify-content:space-between; align-items:center; background:var(--nhud-prompt-header, #2a101a); padding:10px; border-bottom:1px solid var(--nhud-border); cursor:grab;">
                    <span style="font-weight:bold; color:#52a8e0; font-size:14px;">🧬 Статы Героя</span>
                    <button id="nhud-hero-close" style="background:none; border:none; color:var(--nhud-accent); cursor:pointer; padding:0; font-size:16px;">✕</button>
                </div>
                <div id="nhud-hero-content" style="padding:15px; display:flex; flex-direction:column; gap:12px; background:rgba(0,0,0,0.3);"></div>
            </div>
        `);
        if (makeWindowDraggableFn) makeWindowDraggableFn("nhud-hero-sheet", "nhud-hero-header");
        $("#nhud-hero-close").on("click", () => $("#nhud-hero-sheet").fadeOut(150));
        popup = $("#nhud-hero-sheet");
    }
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderHeroSheet(); popup.fadeIn(150); }
}

export function renderHeroSheet() {
    import('../../../core/StateManager.js').then(m => {
        const sheet = m.getHeroSheet();
        if (!sheet) return;

        const content = $("#nhud-hero-content");
        content.empty();

        const nextLvlXp = sheet.level * 100;
        const xpPct = Math.round((sheet.xp / nextLvlXp) * 100);

        content.append(`
            <div style="text-align:center; margin-bottom:10px;">
                <div style="font-size:24px; font-weight:bold; color:#e0d0a0; text-shadow:0 0 10px rgba(224,208,160,0.4);">Уровень ${sheet.level}</div>
                <div style="font-size:11px; color:var(--nhud-text-muted);">Свободных очков: <b style="color:#52e0a3; font-size:14px;">${sheet.points}</b></div>
            </div>
            <div style="height:10px; background:#1a1628; border-radius:5px; overflow:hidden; border:1px solid var(--nhud-border);">
                <div style="width:${xpPct}%; height:100%; background:linear-gradient(90deg, #52a8e0, #a0d0e0); box-shadow:0 0 5px #52a8e0;"></div>
            </div>
            <div style="text-align:right; font-size:10px; color:#80a0b0;">${sheet.xp} / ${nextLvlXp} XP</div>
            <div style="border-top:1px dashed var(--nhud-border); margin:5px 0;"></div>
        `);

        for (const [stat, val] of Object.entries(sheet.stats)) {
            const statRow = $(`
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:6px 10px; border-radius:4px; border:1px solid #2a2040;">
                    <span style="color:var(--nhud-text-main); font-size:13px; font-weight:bold;">${stat}</span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:16px; color:#e0d0a0; min-width:20px; text-align:center;">${val}</span>
                        ${sheet.points > 0 ? `<button class="nhud-add-stat" data-stat="${stat}" style="background:#2a4060; border:1px solid #52a8e0; color:#fff; width:24px; height:24px; border-radius:4px; cursor:pointer; font-weight:bold;">+</button>` : ''}
                    </div>
                </div>
            `);
            statRow.find('.nhud-add-stat').on('click', function() {
                const s = $(this).data('stat');
                sheet.stats[s]++;
                sheet.points--;
                import('../../../../../script.js').then(sc => sc.saveSettingsDebounced());
                renderHeroSheet();
            });
            content.append(statRow);
        }
    });
}
