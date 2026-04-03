// ui/components/panels/MiniPanels.js
// Вынесено из _UIManager.internal.js (toggleMiniSims, renderMiniSims, toggleMiniConn, renderMiniConn)

import { getSettings, getLive } from '../../../core/StateManager.js';
import { makeWindowDraggable, renderRelationships } from '../../_UIManager.internal.js';
import { saveSettingsDebounced } from '../../../../../../script.js';

export function toggleMiniSims() {
    let popup = $("#nhud-mini-sims");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-mini-sims" style="display:none; position:fixed; top:150px; left:100px; width:340px; min-width:260px; height:450px; min-height:200px; z-index:9993; background:#151220; border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 5px 20px rgba(0,0,0,0.9); flex-direction:column; resize:both; overflow:hidden;">
                <div id="nhud-mini-sims-header" style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8)); padding:8px 10px; border-bottom:1px solid var(--nhud-border, #4a1525); cursor:grab; flex-shrink:0;">
                    <span style="font-weight:bold; color:var(--nhud-text-main, #e0c0c0); font-size:13px;">вќ¤пёЏ РћС‚РЅРѕС€РµРЅРёСЏ</span>
                    <button id="nhud-mini-sims-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:0; font-size:16px;">вњ•</button>
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
        popup.append('<div style="color:var(--nhud-text-muted); font-size:12px; text-align:center; margin-top:20px;">Р’ СЌС‚РѕРј С‡Р°С‚Рµ РїРѕРєР° РЅРµС‚ РїРµСЂСЃРѕРЅР°Р¶РµР№</div>');
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
                    <input class="nhud-input nhud-m-rel-status" value="${char.relationship_status || ""}" style="width:110px; padding:2px 4px; font-size:0.8em; text-align:right;" placeholder="РЎС‚Р°С‚СѓСЃ..." />
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
            saveSettingsDebounced(); renderRelationships();
        });
        card.find('.nhud-m-rel-status').on('input', e => { live.characters[name].relationship_status = e.target.value; saveSettingsDebounced(); });
        popup.append(card);
    });
// --- Р‘Р›РћРљ Р¤Р РђРљР¦РР™ Р’ РћРљРќР• РћРўРќРћРЁР•РќРР™ ---
    if (settings.modules?.factions !== false) {
        popup.append('<div style="border-top:1px dashed #4a1525; margin:10px 0 5px 0;"></div>');
        popup.append('<div style="font-size:13px; font-weight:bold; color:#e0c0a0; margin-bottom:10px;">рџЏґвЂЌв пёЏ Р¤СЂР°РєС†РёРё Рё Р“СЂСѓРїРїРёСЂРѕРІРєРё</div>');
        
        // Р’РћРў Р¤РРљРЎ Р—Р”Р•РЎР¬ РўРћР–Р•
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
                        <button class="nhud-f-del" data-idx="${idx}" style="position:absolute; top:4px; right:4px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">вњ•</button>
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
                <input id="nhud-f-new-name" class="nhud-input" placeholder="РќРѕРІР°СЏ С„СЂР°РєС†РёСЏ..." style="flex:1;" />
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
                    <span style="font-weight:bold; color:var(--nhud-text-main, #e0c0c0); font-size:12px;">рџ”Њ РџРѕРґРєР»СЋС‡РµРЅРёРµ</span>
                    <button id="nhud-mini-conn-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:0; font-size:14px;">вњ•</button>
                </div>
                <div id="nhud-mini-conn-content" style="padding:15px 10px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.2);">
                    <select id="nhud-mc-profile" class="nhud-select" style="width:100%; font-size:12px; padding:6px; background:#1a0a10; border:1px solid var(--nhud-border); color:var(--nhud-text-main);"></select>
                    <button id="nhud-mc-send" class="nhud-send-btn" style="width:100%; padding:8px; background:rgba(60, 20, 30, 0.4); border:1px solid var(--nhud-border); color:var(--nhud-text-main); border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px; transition:0.2s;">в–¶ РћР±РЅРѕРІРёС‚СЊ СЃС‚Р°С‚С‹</button>
                </div>
            </div>
        `);
        makeWindowDraggable("nhud-mini-conn", "nhud-mini-conn-header");
        $("#nhud-mini-conn-close").on("click", () => $("#nhud-mini-conn").fadeOut(150));
        
        $("#nhud-mc-profile").on("change", function() {
            const settings = getSettings(); const val = $(this).val();
            settings.activeProfile = val === "__quiet__" ? null : val;
            settings.useSTProfile = val !== "__quiet__";
            saveSettingsDebounced(); renderProfileSelect();
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
    if (settings.requestSettings?.lightMode) sel.append('<option value="__quiet__" disabled>вќЊ ST (Р›Р°Р№С‚ Р°РєС‚РёРІРµРЅ)</option>');
    else sel.append(`<option value="__quiet__" ${!settings.useSTProfile ? 'selected' : ''}>рџ”„ РџРѕРґРєР»СЋС‡РµРЅРёРµ ST</option>`);
    try {
        getSTProfiles().forEach(p => {
