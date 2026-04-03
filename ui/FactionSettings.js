// ui/FactionSettings.js
import { extensionName } from "../core/constants.js";
import { NarrativeStorage } from "../storage/NarrativeStorage.js";
import { getSettings } from "../core/StateManager.js";
import { saveSettingsDebounced } from "../../../../../script.js";
export function renderSettingsFactions() {
    const container = $("#nhud-settings-factions-list");
    if (!container.length) return;
    container.empty();

    const chatId = NarrativeStorage.getCurrentChatId();
    const settings = getSettings();
    if (!settings || !settings.chatData) return;
    const chatData = settings.chatData[chatId];
    if (!chatData) return;
    
    if (!chatData.factions) chatData.factions = [];
    // Обновляем структуру старых фракций
    chatData.factions = chatData.factions.map(f => ({ ...f, desc: f.desc || "", bgUrl: f.bgUrl || "", descActive: f.descActive || false, expanded: f.expanded !== false }));
    const factions = chatData.factions;

    factions.forEach((f, idx) => {
        let barColor = "#a090c0"; if (f.rep < 30) barColor = "#e05252"; else if (f.rep >= 80) barColor = "#52e0a3"; 
        const cardBg = f.bgUrl ? `linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url('${f.bgUrl}') center/cover` : `linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.7))`;
        
        const isDescActive = f.descActive;
        const activeBtnStyle = isDescActive 
            ? "background:var(--nhud-accent, #d05070); color:#fff; border-color:var(--nhud-accent, #d05070); box-shadow:0 0 10px rgba(208,80,112,0.4);" 
            : "background:rgba(255,255,255,0.1); color:#a0a0b0; border-color:transparent;";

        const card = $(`
            <div style="background:${cardBg}; border:1px solid var(--nhud-border); border-radius:6px; margin-bottom:8px; overflow:hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 8px; background: rgba(0,0,0,0.5); border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; align-items:center; flex:1; gap:6px;">
                        <button class="nhud-f-accordion-btn" style="background:none; border:none; color:#e0c0c0; cursor:pointer; font-size:12px; padding:0; width:16px; transition:0.2s;" title="Свернуть/Развернуть">${f.expanded ? '▼' : '▶'}</button>
                        <input type="text" class="nhud-input nhud-f-name" value="${f.name}" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:var(--nhud-left-text); font-weight:bold; padding:4px 6px; flex:1;" />
                    </div>
                    <div style="display:flex; gap:4px; margin-left:6px;">
                        <button class="nhud-f-desc-toggle" style="border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer; font-weight:bold; transition:0.2s; ${activeBtnStyle}" title="Вшить ОПИСАНИЕ в память ИИ (Сама репутация вшивается всегда)">
                            ${isDescActive ? '👁️ Описание' : '👁️‍🗨️ Без описания'}
                        </button>
                        <button class="nhud-f-settings-btn" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer;" title="Настройки">⚙️</button>
                    </div>
                </div>

                <div class="nhud-f-desc-container" style="display:${f.expanded ? 'block' : 'none'}; padding:8px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <div style="flex:1; height:8px; background:#1a1628; border-radius:4px; overflow:hidden; border:1px solid #2a2040; box-shadow:inset 0 0 5px rgba(0,0,0,0.8);">
                            <div style="width:${f.rep}%; height:100%; background:${barColor}; box-shadow:0 0 10px ${barColor};"></div>
                        </div>
                        <input type="number" class="nhud-input nhud-f-val" value="${f.rep}" min="0" max="100" style="width:45px; padding:4px; font-size:12px; font-weight:bold; text-align:center; background:rgba(0,0,0,0.6);" />
                    </div>
                    <textarea class="nhud-f-desc nhud-textarea" rows="2" placeholder="Описание фракции (лор)..." style="font-size:11px; background:rgba(0,0,0,0.5); color:#e0d0c0; border:1px solid rgba(255,255,255,0.1); width:100%; box-sizing:border-box;">${f.desc || ''}</textarea>
                </div>

                <div class="nhud-f-settings-container" style="display:none; padding:8px; background:rgba(0,0,0,0.85); border-top:1px dashed #d05070;">
                    <div style="font-size:10px; color:#d05070; margin-bottom:4px; text-transform:uppercase;">Технические настройки</div>
                    <input class="nhud-f-bg nhud-input" type="text" value="${f.bgUrl || ''}" placeholder="URL фона (картинка)" style="font-size:11px; padding:4px; width:100%; box-sizing:border-box; margin-bottom:6px;" />
                    <button class="nhud-f-del nhud-s-delete" style="padding:4px; font-size:11px; width:100%;">🗑️ Удалить фракцию</button>
                </div>
            </div>
        `);
        
        card.find('.nhud-f-del').on('click', () => { if(confirm("Удалить фракцию?")) { factions.splice(idx, 1); saveSettingsDebounced(); renderSettingsFactions(); }});
        card.find('.nhud-f-name').on('change', function() { f.name = $(this).val(); saveSettingsDebounced(); });
        card.find('.nhud-f-val').on('change', function() { f.rep = parseInt($(this).val()) || 0; saveSettingsDebounced(); renderSettingsFactions(); });
        card.find('.nhud-f-desc').on('change', function() { f.desc = $(this).val(); saveSettingsDebounced(); });
        card.find('.nhud-f-bg').on('change', function() { f.bgUrl = $(this).val(); saveSettingsDebounced(); renderSettingsFactions(); });
        
        card.find('.nhud-f-accordion-btn').on('click', function() {
            f.expanded = !f.expanded; saveSettingsDebounced();
            card.find('.nhud-f-desc-container').slideToggle(150);
            $(this).text(f.expanded ? '▼' : '▶');
        });
        card.find('.nhud-f-settings-btn').on('click', () => card.find('.nhud-f-settings-container').slideToggle(150));
        card.find('.nhud-f-desc-toggle').on('click', () => { f.descActive = !f.descActive; saveSettingsDebounced(); renderSettingsFactions(); });

        container.append(card);
    });

    const addBlock = $(`
        <div style="display:flex; gap:6px; margin-top:8px;">
            <input id="nhud-f-new-name" class="nhud-input" placeholder="Новая фракция..." style="flex:1;" />
            <button id="nhud-f-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
        </div>
    `);
    addBlock.find('#nhud-f-add-btn').on('click', () => {
        const name = addBlock.find('#nhud-f-new-name').val().trim();
        if (name) { factions.push({ name: name, rep: 50, desc: "", bgUrl: "", descActive: false, expanded: true }); saveSettingsDebounced(); renderSettingsFactions(); }
    });
    container.append(addBlock);
}
