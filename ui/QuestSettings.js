// ui/QuestSettings.js
import { extensionName } from "../core/constants.js";
import { NarrativeStorage } from "../storage/NarrativeStorage.js";
import { getSettings } from "../core/StateManager.js";
import { saveSettingsDebounced } from "../../../../../script.js";
export function renderSettingsQuests() {
    const chatId = NarrativeStorage.getCurrentChatId();
    const settings = getSettings();
    if (!settings || !settings.chatData) return;
    const chatData = settings.chatData[chatId];
    if (!chatData) return;
    if (!chatData.quests) chatData.quests = [];
    const quests = chatData.quests;
    
    const content = $("#nhud-settings-quests-list");
    content.empty();

    content.append(`
        <div style="display:flex; gap:6px; margin-bottom:10px;">
            <input id="nhud-s-q-add-title" class="nhud-input" style="flex:1;" placeholder="Название квеста..." />
            <button id="nhud-s-q-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
        </div>
    `);

    if (quests.length === 0) {
        content.append('<div style="color:#606080; text-align:center; font-size:12px; padding:10px;">Нет заданий...</div>');
    } else {
        const activeCount = quests.filter(q => q.status === 'active').length;
        const compCount = quests.filter(q => q.status === 'completed').length;
        const failCount = quests.filter(q => q.status === 'failed').length;

        // Создаем контейнеры-гармошки
        const makeGroup = (id, title, color, count, isOpen) => `
            <details ${isOpen ? 'open' : ''} style="margin-bottom:8px; border:1px solid var(--nhud-border); border-radius:4px; background:rgba(0,0,0,0.2);">
                <summary style="font-weight:bold; color:${color}; cursor:pointer; padding:6px; outline:none; user-select:none; font-size:12px; background:rgba(0,0,0,0.3);">
                    ${title} (${count})
                </summary>
                <div id="${id}" style="padding:6px; display:flex; flex-direction:column; gap:6px; border-top:1px dashed var(--nhud-border);"></div>
            </details>
        `;

        if (activeCount > 0) content.append(makeGroup("nhud-s-q-active", "⏳ Активные", "#52a8e0", activeCount, true));
        if (compCount > 0) content.append(makeGroup("nhud-s-q-comp", "✅ Выполненные", "#52e0a3", compCount, false));
        if (failCount > 0) content.append(makeGroup("nhud-s-q-fail", "❌ Проваленные", "#e05252", failCount, false));

        // Заполняем гармошки карточками
        quests.forEach((q, idx) => {
            const card = $(`
                <div style="background:var(--nhud-inp-bg, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:6px; padding:8px; position:relative;">
                    <button class="nhud-q-del" data-idx="${idx}" style="position:absolute; top:4px; right:4px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">✕</button>
                    <input class="nhud-input nhud-q-title" data-idx="${idx}" value="${q.title}" style="font-weight:bold; color:#52a8e0; margin-bottom:6px; width:85%; background:transparent; border:none; padding:0;" />
                    <textarea class="nhud-textarea nhud-q-desc" data-idx="${idx}" rows="2" style="font-size:11px; margin-bottom:6px;">${q.desc}</textarea>
                    <select class="nhud-select nhud-q-status" data-idx="${idx}" style="font-size:11px; padding:4px;">
                        <option value="active" ${q.status==='active'?'selected':''}>⏳ Активен</option>
                        <option value="completed" ${q.status==='completed'?'selected':''}>✅ Выполнен</option>
                        <option value="failed" ${q.status==='failed'?'selected':''}>❌ Провален</option>
                    </select>
                </div>
            `);
            
            card.find('.nhud-q-del').on('click', function() { quests.splice(parseInt($(this).data('idx')), 1); saveSettingsDebounced(); renderSettingsQuests(); });
            card.find('.nhud-q-title').on('change', function() { quests[parseInt($(this).data('idx'))].title = $(this).val(); saveSettingsDebounced(); });
            card.find('.nhud-q-desc').on('change', function() { quests[parseInt($(this).data('idx'))].desc = $(this).val(); saveSettingsDebounced(); });
            card.find('.nhud-q-status').on('change', function() { quests[parseInt($(this).data('idx'))].status = $(this).val(); saveSettingsDebounced(); renderSettingsQuests(); });
            
            let targetId = "#nhud-s-q-active";
            if (q.status === 'completed') targetId = "#nhud-s-q-comp";
            if (q.status === 'failed') targetId = "#nhud-s-q-fail";
            content.find(targetId).append(card);
        });
    }

    $("#nhud-s-q-add-btn").off("click").on("click", () => {
        const title = $("#nhud-s-q-add-title").val().trim();
        if (title) { quests.unshift({ title, desc: "Новое задание...", status: "active" }); saveSettingsDebounced(); renderSettingsQuests(); }
    });
}