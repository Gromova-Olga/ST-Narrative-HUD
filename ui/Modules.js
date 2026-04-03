// ui/Modules.js
import { extensionName } from "../core/constants.js";
import { NarrativeStorage } from "../storage/NarrativeStorage.js";
import { getSTContext, getUserName, getSTProfiles } from "../utils/helpers.js";
import { getSettings, getLive, getChatTrackers, getTrackerValue } from "../core/StateManager.js";
import { saveSettingsDebounced } from "../../../../../script.js";
import { makeWindowDraggable } from "./Popups.js";

export function toggleMiniSims() {
    let popup = $("#nhud-mini-sims");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-mini-sims" style="display:none; position:fixed; top:150px; left:100px; width:340px; min-width:260px; height:450px; min-height:200px; z-index:9993; background:#151220; border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 5px 20px rgba(0,0,0,0.9); flex-direction:column; resize:both; overflow:hidden;">
                <div id="nhud-mini-sims-header" style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8)); padding:8px 10px; border-bottom:1px solid var(--nhud-border, #4a1525); cursor:grab; flex-shrink:0;">
                    <span style="font-weight:bold; color:var(--nhud-text-main, #e0c0c0); font-size:13px;">❤️ Отношения</span>
                    <button id="nhud-mini-sims-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:0; font-size:16px;">✕</button>
                </div>
                <div id="nhud-mini-sims-content" style="flex:1; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.2);"></div>
            </div>
        `);
        makeWindowDraggable("nhud-mini-sims", "nhud-mini-sims-header");
        $("#nhud-mini-sims-close").on("click", () => $("#nhud-mini-sims").fadeOut(150));
        popup = $("#nhud-mini-sims");
    }
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderMiniSims(); popup.fadeIn(150); }
}

export function renderMiniSims() {
    const popup = $("#nhud-mini-sims-content");
    if (!popup.length) return;
    popup.empty();
    const live = getLive();
    const settings = getSettings();
    const relSettings = settings.relationshipSettings;
    const userName = getUserName();
    const charNames = Object.keys(live.characters).filter(name => 
        name.toLowerCase() !== userName.toLowerCase() && 
        !name.toLowerCase().includes('system') && 
        !live.characters[name].ignoreRelationship &&
        !live.characters[name].isHiddenFromScene
    );

    if (!charNames.length) {
        popup.append('<div style="color:var(--nhud-text-muted); font-size:12px; text-align:center; margin-top:20px;">В этом чате пока нет персонажей</div>');
        return;
    }

    charNames.forEach(name => {
        const char = live.characters[name];
        const relVal = char.relationship !== undefined ? char.relationship : 50;
        let barColor = "#a090c0"; if (relVal < 30) barColor = "#e05252"; else if (relVal < 45) barColor = "#e0a352"; else if (relVal >= 80) barColor = "#e052a8"; else if (relVal >= 60) barColor = "#52e0a3";

        const card = $(`
            <div style="display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; border:1px solid #3a3050;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; color:#e0d0a0; font-size:0.95em;">${name}</span>
                    <input class="nhud-input nhud-m-rel-status" value="${char.relationship_status || ""}" style="width:110px; padding:2px 4px; font-size:0.8em; text-align:right;" placeholder="Статус..." />
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="flex:1; height:8px; background:#1a1628; border-radius:4px; overflow:hidden; border:1px solid #2a2040;">
                        <div class="nhud-m-rel-bar" style="width:${relVal}%; height:100%; background:${barColor}; transition:0.3s;"></div>
                    </div>
                    <input class="nhud-input nhud-m-rel-val" type="number" min="0" max="100" value="${relVal}" style="width:45px; padding:2px; font-size:0.8em; text-align:center;" />
                </div>
            </div>
        `);

        card.find('.nhud-m-rel-val').on('input', e => {
            const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), 100);
            live.characters[name].relationship = val;
            card.find('.nhud-m-rel-bar').css('width', val + '%');
            saveSettingsDebounced(); import('./UIManager.js').then(m => m.renderRelationships());
        });
        card.find('.nhud-m-rel-status').on('input', e => { live.characters[name].relationship_status = e.target.value; saveSettingsDebounced(); });
        popup.append(card);
    });
// --- БЛОК ФРАКЦИЙ В ОКНЕ ОТНОШЕНИЙ ---
    if (settings.modules?.factions !== false) {
        popup.append('<div style="border-top:1px dashed #4a1525; margin:10px 0 5px 0;"></div>');
        popup.append('<div style="font-size:13px; font-weight:bold; color:#e0c0a0; margin-bottom:10px;">🏴‍☠️ Фракции и Группировки</div>');
        
        // ВОТ ФИКС ЗДЕСЬ ТОЖЕ
        const chatData = getSettings().chatData[NarrativeStorage.getCurrentChatId()];
        if (chatData && !chatData.factions) chatData.factions = [];
        const factions = chatData?.factions || [];
        
        const renderFactionsList = () => {
            const fList = $('<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:10px;"></div>');
            factions.forEach((f, idx) => {
                let barColor = "#a090c0"; 
                if (f.rep < 30) barColor = "#e05252"; 
                else if (f.rep >= 80) barColor = "#52e0a3"; 

                const fCard = $(`
                    <div style="background:rgba(0,0,0,0.3); border:1px solid #3a3050; border-radius:6px; padding:8px; position:relative;">
                        <button class="nhud-f-del" data-idx="${idx}" style="position:absolute; top:4px; right:4px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">✕</button>
                        <div style="font-weight:bold; color:#e0d0a0; font-size:0.9em; margin-bottom:6px;">${f.name}</div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="flex:1; height:6px; background:#1a1628; border-radius:3px; overflow:hidden; border:1px solid #2a2040;">
                                <div style="width:${f.rep}%; height:100%; background:${barColor};"></div>
                            </div>
                            <input type="number" class="nhud-input nhud-f-val" data-idx="${idx}" value="${f.rep}" min="0" max="100" style="width:45px; padding:2px; font-size:0.8em; text-align:center;" />
                        </div>
                    </div>
                `);
                
                fCard.find('.nhud-f-del').on('click', function() {
                    factions.splice(parseInt($(this).data('idx')), 1);
                    saveSettingsDebounced(); popup.find('#nhud-factions-container').empty().append(renderFactionsList());
                });
                fCard.find('.nhud-f-val').on('change', function() {
                    factions[parseInt($(this).data('idx'))].rep = parseInt($(this).val()) || 0;
                    saveSettingsDebounced(); popup.find('#nhud-factions-container').empty().append(renderFactionsList());
                });
                fList.append(fCard);
            });
            return fList;
        };

        const fContainer = $('<div id="nhud-factions-container"></div>').append(renderFactionsList());
        popup.append(fContainer);

        const addFBlock = $(`
            <div style="display:flex; gap:6px;">
                <input id="nhud-f-new-name" class="nhud-input" placeholder="Новая фракция..." style="flex:1;" />
                <button id="nhud-f-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
            </div>
        `);
        addFBlock.find('#nhud-f-add-btn').on('click', () => {
            const name = addFBlock.find('#nhud-f-new-name').val().trim();
            if (name) {
                factions.push({ name: name, rep: 50 });
                saveSettingsDebounced();
                addFBlock.find('#nhud-f-new-name').val('');
                popup.find('#nhud-factions-container').empty().append(renderFactionsList());
            }
        });
        popup.append(addFBlock);
    }
}

export function toggleMiniConn() {
    let popup = $("#nhud-mini-conn");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-mini-conn" style="display:none; position:fixed; top:200px; left:100px; width:220px; z-index:9993; background:#151220; border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 5px 20px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-mini-conn-header" style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8)); padding:8px 10px; border-bottom:1px solid var(--nhud-border, #4a1525); cursor:grab;">
                    <span style="font-weight:bold; color:var(--nhud-text-main, #e0c0c0); font-size:12px;">🔌 Подключение</span>
                    <button id="nhud-mini-conn-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:0; font-size:14px;">✕</button>
                </div>
                <div id="nhud-mini-conn-content" style="padding:15px 10px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.2);">
                    <select id="nhud-mc-profile" class="nhud-select" style="width:100%; font-size:12px; padding:6px; background:#1a0a10; border:1px solid var(--nhud-border); color:var(--nhud-text-main);"></select>
                    <button id="nhud-mc-send" class="nhud-send-btn" style="width:100%; padding:8px; background:rgba(60, 20, 30, 0.4); border:1px solid var(--nhud-border); color:var(--nhud-text-main); border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px; transition:0.2s;">▶ Обновить статы</button>
                </div>
            </div>
        `);
        makeWindowDraggable("nhud-mini-conn", "nhud-mini-conn-header");
        $("#nhud-mini-conn-close").on("click", () => $("#nhud-mini-conn").fadeOut(150));
        
        $("#nhud-mc-profile").on("change", function() {
            const settings = getSettings(); const val = $(this).val();
            settings.activeProfile = val === "__quiet__" ? null : val;
            settings.useSTProfile = val !== "__quiet__";
            saveSettingsDebounced(); import('./UIManager.js').then(m => m.renderProfileSelect());
        });

        $("#nhud-mc-send").on("click", () => { import('../index.js').then(m => m.sendToAPI(true)); });
        popup = $("#nhud-mini-conn");
    }
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderMiniConn(); popup.fadeIn(150); }
}

export function renderMiniConn() {
    const popup = $("#nhud-mini-conn");
    if (!popup.length) return;
    const settings = getSettings();
    const sel = $("#nhud-mc-profile");
    sel.empty();
    if (settings.requestSettings?.lightMode) sel.append('<option value="__quiet__" disabled>❌ ST (Лайт активен)</option>');
    else sel.append(`<option value="__quiet__" ${!settings.useSTProfile ? 'selected' : ''}>🔄 Подключение ST</option>`);
    try {
        getSTProfiles().forEach(p => {
            const selected = settings.useSTProfile && settings.activeProfile === p.name ? 'selected' : '';
            const shortName = p.name.length > 20 ? p.name.substring(0, 20) + '…' : p.name;
            sel.append(`<option value="${p.name}" ${selected}>${shortName}</option>`);
        });
    } catch (e) {}
}

export function toggleHeroSheet() {
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
        makeWindowDraggable("nhud-hero-sheet", "nhud-hero-header");
        $("#nhud-hero-close").on("click", () => $("#nhud-hero-sheet").fadeOut(150));
        popup = $("#nhud-hero-sheet");
    }
    
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderHeroSheet(); popup.fadeIn(150); }
}

export function renderHeroSheet() {
    import('../core/StateManager.js').then(m => {
        const sheet = m.getHeroSheet();
        if (!sheet) return;
        
        const content = $("#nhud-hero-content");
        content.empty();
        
        const nextLvlXp = sheet.level * 100;
        const xpPct = Math.round((sheet.xp / nextLvlXp) * 100);
        
        // Шапка с уровнем и опытом
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
        
        // Характеристики
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
                renderHeroSheet(); // Перерисовываем
            });
            content.append(statRow);
        }
    });
}

export function toggleInventory() {
    let popup = $("#nhud-inventory-modal");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-inventory-modal" style="display:none; position:fixed; top:15vh; left:calc(50% - 150px); width:300px; z-index:9995; background:var(--nhud-prompt-bg, #151220); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-inv-header" style="display:flex; justify-content:space-between; align-items:center; background:var(--nhud-prompt-header, #2a101a); padding:10px; border-bottom:1px solid var(--nhud-border); cursor:grab;">
                    <span style="font-weight:bold; color:#e0a352; font-size:14px;">🎒 Инвентарь и Имущество</span>
                    <button id="nhud-inv-close" style="background:none; border:none; color:var(--nhud-accent); cursor:pointer; padding:0; font-size:16px;">✕</button>
                </div>
                <div id="nhud-inv-content" style="padding:10px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.3); max-height:60vh; overflow-y:auto;"></div>
            </div>
        `);
        makeWindowDraggable("nhud-inventory-modal", "nhud-inv-header");
        $("#nhud-inv-close").on("click", () => $("#nhud-inventory-modal").fadeOut(150));
        popup = $("#nhud-inventory-modal");
    }
    
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderInventory(); popup.fadeIn(150); }
}

export function renderInventory() {
    import('../core/StateManager.js').then(m => {
        const inv = m.getInventory();
        if (!inv) return;
        
        const content = $("#nhud-inv-content");
        content.empty();
        
        // 💰 Баланс
        content.append(`
            <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid #3a3050;">
                <div style="font-size:11px; color:#a0a0b8; text-transform:uppercase; margin-bottom:6px; font-weight:bold;">💰 Кошелек</div>
                <div style="display:flex; gap:6px;">
                    <input id="nhud-inv-money" type="number" value="${inv.money}" class="nhud-input" style="flex:1; font-weight:bold; color:#52e0a3; font-size:14px;" />
                    <input id="nhud-inv-currency" type="text" value="${inv.currency}" class="nhud-input" style="width:100px; text-align:center;" placeholder="Валюта" />
                </div>
            </div>
        `);

        // Функция-генератор списков (чтобы не писать 3 раза одно и то же)
        const buildList = (title, key, icon) => {
            let html = `<div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid #3a3050;">
                <div style="font-size:11px; color:#a0a0b8; text-transform:uppercase; margin-bottom:6px; font-weight:bold;">${icon} ${title}</div>
                <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:6px;">`;
            
            inv[key].forEach((item, idx) => {
                html += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:4px; border:1px solid #2a2040; font-size:12px; color:var(--nhud-text-main);">
                    <span>${typeof item === 'object' ? (item.name || JSON.stringify(item)) : item}</span>
                    <button class="nhud-inv-del nhud-s-delete" data-key="${key}" data-idx="${idx}" style="padding:2px 6px; font-size:10px; margin:0;">✕</button>
                </div>`;
            });
            
            html += `</div>
                <div style="display:flex; gap:4px;">
                    <input id="nhud-inv-add-val-${key}" type="text" class="nhud-input" style="flex:1; padding:4px; font-size:11px;" placeholder="Добавить..." />
                    <button class="nhud-inv-add nhud-add-btn" data-key="${key}" style="margin:0; padding:4px 8px;">+</button>
                </div>
            </div>`;
            return html;
        };

        content.append(buildList("Рюкзак", "items", "🎒"));
        content.append(buildList("Транспорт", "vehicles", "🚗"));
        content.append(buildList("Недвижимость", "estate", "🏠"));

        // Сохранение значений
        content.find('#nhud-inv-money').on('change', e => { inv.money = parseInt(e.target.value)||0; saveSettingsDebounced(); });
        content.find('#nhud-inv-currency').on('change', e => { inv.currency = e.target.value; saveSettingsDebounced(); });
        
        content.find('.nhud-inv-del').on('click', function() {
            const key = $(this).data('key');
            inv[key].splice(parseInt($(this).data('idx')), 1);
            saveSettingsDebounced(); renderInventory();
        });

        content.find('.nhud-inv-add').on('click', function() {
            const key = $(this).data('key');
            const val = content.find(`#nhud-inv-add-val-${key}`).val().trim();
            if (val) {
                inv[key].push(key === 'items' ? val : { name: val, desc: '', active: false });
                saveSettingsDebounced(); renderInventory();
            }
        });
    });
}

export function toggleQuestLog() {
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
        makeWindowDraggable("nhud-quest-log", "nhud-quest-header");
        $("#nhud-quest-close").on("click", () => $("#nhud-quest-log").fadeOut(150));
        popup = $("#nhud-quest-log");
    }
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderQuestLog(); popup.fadeIn(150); }
}

export function renderQuestLog() {
    import('../core/StateManager.js').then(m => {
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
                </details>
            `;

            if (activeCount > 0) content.append(makeGroup("nhud-w-q-active", "⏳ Активные", "#52a8e0", activeCount, true));
            if (compCount > 0) content.append(makeGroup("nhud-w-q-comp", "✅ Выполненные", "#52e0a3", compCount, false));
            if (failCount > 0) content.append(makeGroup("nhud-w-q-fail", "❌ Проваленные", "#e05252", failCount, false));

            quests.forEach((q, idx) => {
                let color = "#52a8e0"; let icon = "⏳"; let bg = "rgba(82, 168, 224, 0.05)";
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

export function toggleCodex() {
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
        makeWindowDraggable("nhud-codex-modal", "nhud-codex-header");
        $("#nhud-codex-close").on("click", () => $("#nhud-codex-modal").fadeOut(150));
        popup = $("#nhud-codex-modal");
    }
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderCodex(); popup.fadeIn(150); }
}

export function renderCodex() {
    import('../core/StateManager.js').then(m => {
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

