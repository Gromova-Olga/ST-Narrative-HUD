// ui/components/modals/CalendarModal.js

export function toggleCalendar(makeWindowDraggableFn) {
    let popup = $("#nhud-calendar-modal");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-calendar-modal" style="display:none; position:fixed; top:20vh; left:calc(50% - 200px); width:400px; z-index:9995; background:var(--nhud-prompt-bg, #151220); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-calendar-header" style="display:flex; justify-content:space-between; align-items:center; background:var(--nhud-prompt-header, #2a101a); padding:10px; border-bottom:1px solid var(--nhud-border); cursor:grab;">
                    <span style="font-weight:bold; color:#e080b0; font-size:14px;">📅 Календарь событий</span>
                    <button id="nhud-calendar-close" style="background:none; border:none; color:var(--nhud-accent); cursor:pointer; padding:0; font-size:16px;">✕</button>
                </div>
                <div id="nhud-calendar-content" style="padding:15px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.3); max-height:60vh; overflow-y:auto;"></div>
            </div>
        `);
        if (makeWindowDraggableFn) makeWindowDraggableFn("nhud-calendar-modal", "nhud-calendar-header");
        $("#nhud-calendar-close").on("click", () => $("#nhud-calendar-modal").fadeOut(150));
        popup = $("#nhud-calendar-modal");
    }
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderCalendar(); popup.fadeIn(150); }
}

export function renderCalendar() {
    import('../../../core/StateManager.js').then(m => {
        const calendar = m.getCalendar();
        const content = $("#nhud-calendar-content");
        content.empty();

        content.append(`
            <div style="display:flex; gap:6px; margin-bottom:10px;">
                <input id="nhud-cal-add-date" class="nhud-input" style="width:100px;" placeholder="Дата..." value="${new Date().toLocaleDateString()}" />
                <input id="nhud-cal-add-desc" class="nhud-input" style="flex:1;" placeholder="Что произошло..." />
                <button id="nhud-cal-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
            </div>
        `);

        if (!calendar || calendar.length === 0) {
            content.append('<div style="color:#606080; text-align:center; font-size:12px; padding:20px;">Пока ничего не произошло...</div>');
        } else {
            const timeline = $('<div style="border-left:2px solid #e080b0; margin-left:10px; padding-left:15px; display:flex; flex-direction:column; gap:12px;"></div>');

            calendar.forEach((ev, idx) => {
                const card = $(`
                    <div style="position:relative; background:rgba(224, 128, 176, 0.05); border:1px solid rgba(224, 128, 176, 0.2); border-radius:6px; padding:8px;">
                        <div style="position:absolute; left:-22px; top:12px; width:10px; height:10px; background:#e080b0; border-radius:50%; border:2px solid #151220;"></div>
                        <button class="nhud-cal-del" data-idx="${idx}" style="position:absolute; top:4px; right:4px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">✕</button>
                        <input class="nhud-input nhud-cal-date" data-idx="${idx}" value="${ev.date}" style="font-weight:bold; color:#e080b0; font-size:12px; margin-bottom:4px; background:transparent; border:none; padding:0; width:100px;" />
                        <textarea class="nhud-textarea nhud-cal-desc" data-idx="${idx}" rows="2" style="font-size:12px; border:none; background:transparent; color:#d0c0c0; padding:0; width:100%; box-sizing:border-box;">${ev.desc}</textarea>
                    </div>
                `);
                card.find('.nhud-cal-del').on('click', function() {
                    calendar.splice(parseInt($(this).data('idx')), 1);
                    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                    renderCalendar();
                });
                card.find('.nhud-cal-date').on('change', function() {
                    calendar[parseInt($(this).data('idx'))].date = $(this).val();
                    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                });
                card.find('.nhud-cal-desc').on('change', function() {
                    calendar[parseInt($(this).data('idx'))].desc = $(this).val();
                    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                });
                timeline.append(card);
            });
            content.append(timeline);
        }

        $("#nhud-cal-add-btn").off("click").on("click", () => {
            const date = $("#nhud-cal-add-date").val().trim();
            const desc = $("#nhud-cal-add-desc").val().trim();
            if (desc) {
                m.addCalendarEvent({ date, desc });
                renderCalendar();
            }
        });
    });
}
