// ui/components/modals/CodexModal.js

export function toggleCodex(makeWindowDraggableFn) {
    let popup = $("#nhud-codex-modal");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-codex-modal" style="display:none; position:fixed; top:15vh; left:calc(50% - 180px); width:360px; z-index:9995; background:var(--nhud-prompt-bg, #151220); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-codex-header" style="display:flex; justify-content:space-between; align-items:center; background:var(--nhud-prompt-header, #2a101a); padding:10px; border-bottom:1px solid var(--nhud-border); cursor:grab;">
                    <span style="font-weight:bold; color:#b080e0; font-size:14px;">📖 Сюжетный Кодекс</span>
                    <button id="nhud-codex-close" style="background:none; border:none; color:var(--nhud-accent); cursor:pointer; padding:0; font-size:16px;">✕</button>
                </div>
                <div id="nhud-codex-content" style="padding:10px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.3); max-height:60vh; overflow-y:auto;"></div>
            </div>
        `);
        if (makeWindowDraggableFn) makeWindowDraggableFn("nhud-codex-modal", "nhud-codex-header");
        $("#nhud-codex-close").on("click", () => $("#nhud-codex-modal").fadeOut(150));
        popup = $("#nhud-codex-modal");
    }
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderCodex(); popup.fadeIn(150); }
}

export function renderCodex() {
    import('../../../core/StateManager.js').then(m => {
        const codex = m.getCodex();
        const content = $("#nhud-codex-content");
        content.empty();

        if (!codex || codex.length === 0) {
            content.append('<div style="color:#606080; text-align:center; font-size:12px; padding:20px;">Записей пока нет. Изучайте мир!</div>');
            return;
        }

        codex.forEach((entry, idx) => {
            const card = $(`
                <div style="background:rgba(176, 128, 224, 0.05); border:1px solid rgba(176, 128, 224, 0.3); border-radius:6px; padding:10px; position:relative;">
                    <button class="nhud-c-del" data-idx="${idx}" style="position:absolute; top:5px; right:5px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">✕</button>
                    <div style="font-weight:bold; color:#b080e0; font-size:13px; margin-bottom:6px; padding-right:15px; border-bottom:1px dashed rgba(176, 128, 224, 0.2); padding-bottom:4px;">
                        ${entry.title}
                    </div>
                    <textarea class="nhud-c-text nhud-textarea" data-idx="${idx}" rows="3" style="font-size:11px; border:none; background:transparent; color:#a0a0b0; padding:0; width:100%; box-sizing:border-box; line-height:1.4;">${entry.text}</textarea>
                </div>
            `);
            card.find('.nhud-c-del').on('click', function() {
                if(!confirm("Удалить запись из кодекса?")) return;
                codex.splice(parseInt($(this).data('idx')), 1);
                import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                renderCodex();
            });
            card.find('.nhud-c-text').on('change', function() {
                codex[parseInt($(this).data('idx'))].text = $(this).val();
                import('../../../../../script.js').then(s => s.saveSettingsDebounced());
            });
            content.append(card);
        });
    });
}
