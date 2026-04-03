// ui/components/modals/QuestLogModal.js

export function toggleQuestLog(makeWindowDraggableFn) {
    let popup = $("#nhud-quest-log");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-quest-log" style="display:none; position:fixed; top:15vh; left:calc(50% - 160px); width:320px; z-index:9995; background:var(--nhud-prompt-bg, #151220); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-quest-header" style="display:flex; justify-content:space-between; align-items:center; background:var(--nhud-prompt-header, #2a101a); padding:10px; border-bottom:1px solid var(--nhud-border); cursor:grab;">
                    <span style="font-weight:bold; color:#e0c0a0; font-size:14px;">📜 Журнал Заданий</span>
                    <button id="nhud-quest-close" style="background:none; border:none; color:var(--nhud-accent); cursor:pointer; padding:0; font-size:16px;">✕</button>
                </div>
                <div id="nhud-quest-content" style="padding:10px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.3); max-height:60vh; overflow-y:auto;"></div>
            </div>
        `);
        if (makeWindowDraggableFn) makeWindowDraggableFn("nhud-quest-log", "nhud-quest-header");
        $("#nhud-quest-close").on("click", () => $("#nhud-quest-log").fadeOut(150));
        popup = $("#nhud-quest-log");
    }
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderQuestLog(); popup.fadeIn(150); }
}

export function renderQuestLog() {
    import('../../../core/StateManager.js').then(m => {
        const quests = m.getQuests();
        const content = $("#nhud-quest-content");
        content.empty();

        content.append(`
            <div style="display:flex; gap:6px; margin-bottom:5px;">
                <input id="nhud-q-add-title" class="nhud-input" style="flex:1;" placeholder="Новый квест..." />
                <button id="nhud-q-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
            </div>
        `);

        if (!quests || quests.length === 0) {
            content.append('<div style="color:#606080; text-align:center; font-size:12px; padding:20px;">Нет активных заданий...</div>');
        } else {
            const activeCount = quests.filter(q => q.status === 'active').length;
            const compCount = quests.filter(q => q.status === 'completed').length;
            const failCount = quests.filter(q => q.status === 'failed').length;

            const makeGroup = (id, title, color, count, isOpen) => `
                <details ${isOpen ? 'open' : ''} style="margin-bottom:6px; border:1px solid ${color}40; border-radius:6px; background:rgba(0,0,0,0.2);">
                    <summary style="font-weight:bold; color:${color}; cursor:pointer; padding:8px; outline:none; user-select:none; font-size:13px; background:rgba(0,0,0,0.3); border-radius:5px;">
                        ${title} (${count})
                    </summary>
                    <div id="${id}" style="padding:8px; display:flex; flex-direction:column; gap:8px; border-top:1px dashed ${color}40;"></div>
                </details>`;

            if (activeCount > 0) content.append(makeGroup("nhud-w-q-active", "⏳ Активные", "#52a8e0", activeCount, true));
            if (compCount > 0) content.append(makeGroup("nhud-w-q-comp", "✅ Выполненные", "#52e0a3", compCount, false));
            if (failCount > 0) content.append(makeGroup("nhud-w-q-fail", "❌ Проваленные", "#e05252", failCount, false));

            quests.forEach((q, idx) => {
                let color = "#52a8e0", icon = "⏳", bg = "rgba(82, 168, 224, 0.05)";
                if (q.status === 'completed') { color = "#52e0a3"; icon = "✅"; bg = "rgba(82, 224, 163, 0.05)"; }
                if (q.status === 'failed') { color = "#e05252"; icon = "❌"; bg = "rgba(224, 82, 82, 0.05)"; }

                const card = $(`
                    <div style="background:${bg}; border:1px solid ${color}40; border-radius:6px; padding:10px; position:relative;">
                        <button class="nhud-q-del" data-idx="${idx}" style="position:absolute; top:5px; right:5px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">✕</button>
                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px; padding-right:15px;">
                            <span style="font-size:14px;">${icon}</span>
                            <span style="font-weight:bold; color:${color}; font-size:13px; line-height:1.2;">${q.title}</span>
                        </div>
                        <textarea class="nhud-q-desc nhud-textarea" data-idx="${idx}" rows="2" style="font-size:11px; border:none; background:rgba(0,0,0,0.2); color:#a0a0b0; padding:6px; width:100%; box-sizing:border-box;">${q.desc || ''}</textarea>
                        <div style="display:flex; gap:6px; margin-top:6px;">
                            <select class="nhud-q-status nhud-select" data-idx="${idx}" style="font-size:10px; padding:4px; background:rgba(0,0,0,0.4); border-color:${color}40; color:${color}; width:100%;">
                                <option value="active" ${q.status==='active'?'selected':''}>⏳ Активен</option>
                                <option value="completed" ${q.status==='completed'?'selected':''}>✅ Выполнен</option>
                                <option value="failed" ${q.status==='failed'?'selected':''}>❌ Провален</option>
                            </select>
                        </div>
                    </div>
                `);
                card.find('.nhud-q-del').on('click', function() {
                    quests.splice(parseInt($(this).data('idx')), 1);
                    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                    renderQuestLog();
                });
                card.find('.nhud-q-desc').on('change', function() {
                    quests[parseInt($(this).data('idx'))].desc = $(this).val();
                    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                });
                card.find('.nhud-q-status').on('change', function() {
                    quests[parseInt($(this).data('idx'))].status = $(this).val();
                    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                    renderQuestLog();
                });
                let targetId = "#nhud-w-q-active";
                if (q.status === 'completed') targetId = "#nhud-w-q-comp";
                if (q.status === 'failed') targetId = "#nhud-w-q-fail";
                content.find(targetId).append(card);
            });
        }

        $("#nhud-q-add-btn").off("click").on("click", () => {
            const title = $("#nhud-q-add-title").val().trim();
            if (title) {
                quests.unshift({ title, desc: "...", status: "active" });
                import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                renderQuestLog();
            }
        });
    });
}
