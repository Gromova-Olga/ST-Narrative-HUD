// components\settings\TrackerSettings.js
// Вынесено из _SettingsUI.internal.js (renderSettingsTrackers)

import { getSettings, getLive, getChatTrackers } from '../../../core/StateManager.js';
import { NarrativeStorage } from '../../../storage/NarrativeStorage.js';
import { getContext } from '../../../integration/STContextProvider.js';
import { saveSettingsDebounced } from '../../../../../../script.js';
import { openRelationshipJournal, openAnalyticsPopup } from '../../Modals.js';
import { updateHistoryButtons } from '../../MessageActions.js';
import { renderTrackers, renderRelationships, renderCharacters, renderInfoBlockButtons, renderProfileSelect, applyDesignTheme, renderMiniSims } from '../../UIManager.js';
import { updateSettingsPosition, openSettingsPanel, closeSettingsPanel } from '../../_SettingsUI.internal.js';

function getUserName() { return getContext().name1 || ''; }
function getSTProfiles() { return getContext().extensionSettings?.connectionManager?.profiles || []; }
export function renderSettingsTrackers() {
    const trackers = getChatTrackers();
    const live = getLive();
    const list = $("#nhud-settings-tracker-list");
    list.empty();
    
    const isDynamic = getSettings().design?.barDynamic !== false;

    trackers.forEach((tracker, idx) => {
        const currentVal = live.trackerValues[tracker.id] !== undefined ? live.trackerValues[tracker.id] : tracker.max;
        const colorPickerStyle = isDynamic ? 'display:none;' : 'display:block;';

        const row = $(`
            <div class="nhud-settings-tracker-row" data-idx="${idx}" style="display:flex; gap:6px; margin-bottom:8px; align-items:center;">
                <input class="nhud-s-label nhud-input" type="text" placeholder="РќР°Р·РІР°РЅРёРµ" value="${tracker.label}" style="flex:1;" />
                <input class="nhud-s-id nhud-input" type="text" placeholder="id" value="${tracker.id}" style="width:70px;" />
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:0.6em; color:#606080; line-height:1;">РўРµРє.</span>
                    <input class="nhud-s-val nhud-input" type="number" min="0" max="${tracker.max}" value="${currentVal}" style="width:45px; background:#2a2040; color:#52e0a3; padding:4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:0.6em; color:#606080; line-height:1;">РњР°РєСЃ.</span>
                    <input class="nhud-s-max nhud-input" type="number" min="1" value="${tracker.max}" style="width:45px; padding:4px;" />
                </div>
                <input class="nhud-s-color" type="color" value="${tracker.color}" style="width:28px; height:28px; padding:0; border:none; border-radius:4px; cursor:pointer; margin-top:10px; ${colorPickerStyle}" />
                <button class="nhud-s-delete nhud-s-delete-btn" style="width:24px; padding:2px 0; margin-top:10px;">вњ•</button>
            </div>
        `);
        
        row.find(".nhud-s-label").on("input", e => { trackers[idx].label = e.target.value; saveSettingsDebounced(); renderTrackers(); });
        row.find(".nhud-s-id").on("input",    e => { trackers[idx].id    = e.target.value; saveSettingsDebounced(); });
        row.find(".nhud-s-val").on("input",   e => { 
            const val = parseInt(e.target.value) || 0;
            live.trackerValues[tracker.id] = Math.min(Math.max(0, val), trackers[idx].max);
            saveSettingsDebounced(); 
            renderTrackers(); 
        });
        row.find(".nhud-s-max").on("input",   e => { 
            trackers[idx].max = parseInt(e.target.value) || 100; 
            row.find(".nhud-s-val").attr("max", trackers[idx].max);
            saveSettingsDebounced(); 
            renderTrackers(); 
        });
        row.find(".nhud-s-color").on("input", e => { trackers[idx].color = e.target.value; saveSettingsDebounced(); renderTrackers(); });
        row.find(".nhud-s-delete").on("click",() => { 
            trackers.splice(idx,1); 
            saveSettingsDebounced(); 
            renderSettingsTrackers(); 
            renderTrackers(); 
        });
        list.append(row);
    });

    const placeholder = $("#nhud-settings-rel-container-placeholder");
    if (placeholder.length && placeholder.find("#nhud-settings-rel-container").length === 0) {
        placeholder.html(`
            <div id="nhud-settings-rel-container" style="padding-top:5px;">
                <details open style="border:1px solid var(--nhud-border); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                    <summary style="font-weight:bold; color:var(--nhud-accent); cursor:pointer; padding:5px; outline:none; user-select:none;">вќ¤пёЏ РћС‚РЅРѕС€РµРЅРёСЏ СЃ РїРµСЂСЃРѕРЅР°Р¶Р°РјРё</summary>
                    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; margin:10px 0;">
                        <button id="nhud-s-rel-statuses-btn" class="nhud-add-btn" style="margin:0; padding:4px 8px; background:rgba(200, 100, 150, 0.15); border:1px solid #803a5a; color:#e080b0; transition:0.2s;" title="РќР°СЃС‚СЂРѕРёС‚СЊ СЃС‚Р°С‚СѓСЃС‹ РѕС‚РЅРѕС€РµРЅРёР№">рџЏ·пёЏ РЎС‚Р°С‚СѓСЃС‹</button>
                        
                        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                            <button id="nhud-open-analytics-btn" class="nhud-add-btn" style="margin:0; padding:4px 8px; background:rgba(82, 168, 224, 0.15); border:1px solid #3a5a80; color:#80b0e0; transition:0.2s;" onmouseover="this.style.background='rgba(82,168,224,0.3)'" onmouseout="this.style.background='rgba(82,168,224,0.15)'">рџ“€ РђРЅР°Р»РёС‚РёРєР°</button>
                            <label style="font-size:0.75em; color:#d0d0a0; display:flex; gap:6px; cursor:pointer; align-items:center; background:rgba(200,200,100,0.1); padding:4px 8px; border-radius:4px; border:1px solid #606040; white-space:nowrap;">
                                <input type="checkbox" id="nhud-s-rel-hints-toggle" />
                                рџ’Ў РџРѕРґСЃРєР°Р·РєРё
                            </label>
                        </div>
                    </div>
                    <div id="nhud-s-rel-statuses-wrapper" style="display:none; margin-bottom:10px; padding:8px; background:rgba(0,0,0,0.2); border:1px dashed #803a5a; border-radius:4px;">
                        <div style="font-size:0.7em; color:#e080b0; margin-bottom:4px; text-transform:uppercase;">Р”РѕСЃС‚СѓРїРЅС‹Рµ СЃС‚Р°С‚СѓСЃС‹ (С‡РµСЂРµР· Р·Р°РїСЏС‚СѓСЋ):</div>
                        <textarea id="nhud-s-rel-statuses" class="nhud-textarea" rows="2" style="width:100%; box-sizing:border-box; font-size:0.8em; color:#a090c0; border-color:#803a5a; resize:vertical;" placeholder="Р’СЂР°Рі, РќРµР·РЅР°РєРѕРјРµС†, Р”СЂСѓРі..."></textarea>
                    </div>
                    <div id="nhud-settings-rel-list"></div>
                </details>
            </div>
        `);

        if (getSettings().modules.analytics === false) {
            $("#nhud-open-analytics-btn").hide();
        }

        $("#nhud-open-analytics-btn").on("click", (e) => {
            e.preventDefault();
            if (typeof openAnalyticsPopup === 'function') openAnalyticsPopup();
        });

        $("#nhud-s-rel-statuses-btn").on("click", (e) => {
            e.preventDefault();
            $("#nhud-s-rel-statuses-wrapper").slideToggle(150);
        });

        $("#nhud-s-rel-hints-toggle").on('change', function() {
            getSettings().relationshipSettings.hintsEnabled = this.checked;
            saveSettingsDebounced();
            renderSettingsTrackers();
        });
        $("#nhud-s-rel-statuses").on('change', function() {
            getSettings().relationshipSettings.statuses = $(this).val();
            saveSettingsDebounced();
        });
    }

    const relSettings = getSettings().relationshipSettings;
    $("#nhud-s-rel-hints-toggle").prop('checked', relSettings.hintsEnabled);
    $("#nhud-s-rel-statuses").val(relSettings.statuses);

    const relList = $("#nhud-settings-rel-list");
    relList.empty();

    const userName = getUserName();
    const charNames = Object.keys(live.characters).filter(name => 
        name.toLowerCase() !== userName.toLowerCase() && !name.toLowerCase().includes('system') && !live.characters[name].isHiddenFromScene
    );

    if (charNames.length === 0) {
        relList.append('<div class="nhud-hint">Р’ СЌС‚РѕРј С‡Р°С‚Рµ РїРѕРєР° РЅРµС‚ РїРµСЂСЃРѕРЅР°Р¶РµР№.</div>');
    } else {
        charNames.forEach(name => {
            const char = live.characters[name];
            const relVal = char.relationship !== undefined ? char.relationship : 50;
            const status = char.relationship_status || "";
            const thoughts = char.relationship_thoughts || "";
            const hint = char.relationship_hint || "";
            
            const globalChar = getSettings().characters.find(c => c.name?.toLowerCase() === name.toLowerCase()) || {};
            const avatarHtml = globalChar.avatar 
                ? `<img src="${globalChar.avatar}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"/>`
                : `<div style="width:100%;height:100%;background:#1a1628;color:#6060a0;display:flex;align-items:center;justify-content:center;font-weight:bold;">${name[0].toUpperCase()}</div>`;

            let barColor = "#a090c0"; 
            if (relVal < 30) barColor = "#e05252"; 
            else if (relVal < 45) barColor = "#e0a352"; 
            else if (relVal >= 80) barColor = "#e052a8"; 
            else if (relVal >= 60) barColor = "#52e0a3"; 

            const card = $(`
                <div style="display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid #3a3050; margin-bottom:10px;">
                    <div style="display:flex; gap:10px; align-items:flex-start;">
                        <div style="width:42px; height:42px; border-radius:4px; overflow:hidden; border:1px solid #4a4060; flex-shrink:0;">
                            ${avatarHtml}
                        </div>
                        <div style="flex:1; min-width:0;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                <span style="font-weight:bold; color:#e0d0a0; font-size:0.9em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</span>
                                <div style="display:flex; gap:4px; align-items:center;">
                                    ${getSettings().modules.analytics !== false ? `<button class="nhud-s-rel-journal-btn" data-name="${name}" title="РћС‚РєСЂС‹С‚СЊ Р¶СѓСЂРЅР°Р» СЃРІСЏР·РµР№" style="background:none; border:none; cursor:pointer; font-size:14px; padding:0 4px; transition:0.2s;">рџ“њ</button>` : ''}
                                    <button class="nhud-s-rel-hide-scene-btn" data-name="${name}" title="РЈР±СЂР°С‚СЊ РёР· С‚РµРєСѓС‰РµР№ СЃС†РµРЅС‹ (СЃРѕС…СЂР°РЅРёС‚СЃСЏ РІРѕ РІРєР»Р°РґРєРµ РџРµСЂСЃРѕРЅР°Р¶Рё)" style="background:none; border:none; color:#e05252; cursor:pointer; font-size:14px; padding:0 4px; transition:0.2s;">вњ•</button>
                                    <button class="nhud-s-rel-toggle-btn" data-name="${name}" title="РЎРєСЂС‹С‚СЊ РїРѕР»РѕСЃРєСѓ РёР· HUD" style="background:none; border:none; cursor:pointer; font-size:14px; padding:0 4px; transition:0.2s; filter: grayscale(${char.ignoreRelationship ? '100%' : '0'});">${char.ignoreRelationship ? 'рџ‘ЃпёЏвЂЌрџ—ЁпёЏ' : 'рџ‘ЃпёЏ'}</button>
                                    <input class="nhud-input nhud-s-rel-status" value="${status}" style="width:110px; padding:2px 4px; font-size:0.75em; text-align:right; color:#c0b0a0; border-color:#4a3030;" placeholder="РЎС‚Р°С‚СѓСЃ..." />
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <div style="flex:1; height:6px; background:#1a1628; border-radius:3px; overflow:hidden; border:1px solid #2a2040;">
                                    <div style="width:${relVal}%; height:100%; background:${barColor};"></div>
                                </div>
                                <input class="nhud-input nhud-s-rel-val" type="number" min="0" max="100" value="${relVal}" style="width:40px; padding:2px; font-size:0.75em; text-align:center;" />
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div style="font-size:0.65em; color:#52a8e0; text-transform:uppercase; margin-bottom:2px; font-weight:bold;">рџ’­ РћС‚РЅРѕС€РµРЅРёРµ Рє С‚РµР±Рµ</div>
                        <textarea class="nhud-textarea nhud-s-rel-thoughts" rows="2" style="font-size:0.75em; padding:4px; border-color:#203050; color:#a0c0e0;" placeholder="Р§С‚Рѕ РїРµСЂСЃРѕРЅР°Р¶ РґСѓРјР°РµС‚ Рѕ С‚РµР±Рµ...">${thoughts}</textarea>
                    </div>
                    
                    ${relSettings.hintsEnabled ? `
                    <div style="margin-top:2px;">
                        <div style="font-size:0.65em; color:#d0d0a0; text-transform:uppercase; margin-bottom:2px; font-weight:bold;">рџ’Ў Р¦РµР»СЊ / РџРѕРґСЃРєР°Р·РєР°</div>
                        <textarea class="nhud-textarea nhud-s-rel-hint" rows="2" style="font-size:0.75em; padding:4px; border-color:#606040; color:#e0e0b0; background:#202015;" placeholder="Р’РѕР·РјРѕР¶РЅРѕРµ РґРµР№СЃС‚РІРёРµ...">${hint}</textarea>
                    </div>` : ''}
                </div>
            `);

            card.find('.nhud-s-rel-hide-scene-btn').on('click', function(e) {
                e.stopPropagation();
                live.characters[name].isHiddenFromScene = true;
                saveSettingsDebounced();
                renderSettingsTrackers();
                renderCharacters();
                renderRelationships();
                renderSettingsCharacterAccordion(); 
            });

            card.find('.nhud-s-rel-journal-btn').on('click', function(e) {
                e.stopPropagation();
                if (typeof openRelationshipJournal === 'function') openRelationshipJournal($(this).data('name'));
            });

            card.find('.nhud-s-rel-toggle-btn').on('click', function(e) {
                e.stopPropagation();
                live.characters[name].ignoreRelationship = !live.characters[name].ignoreRelationship;
                saveSettingsDebounced();
                renderSettingsTrackers();
                renderRelationships();
                if (typeof renderMiniSims === 'function') renderMiniSims();
            });

            card.find('.nhud-s-rel-val').on('input', e => {
                live.characters[name].relationship = Math.min(Math.max(0, parseInt(e.target.value) || 0), 100);
                saveSettingsDebounced(); renderRelationships();
            });
            
            card.find('.nhud-s-rel-status').on('input', e => {
                live.characters[name].relationship_status = e.target.value; saveSettingsDebounced();
            });
            
            card.find('.nhud-s-rel-thoughts').on('input', e => {
                live.characters[name].relationship_thoughts = e.target.value; saveSettingsDebounced();
            });
            
            card.find('.nhud-s-rel-hint').on('input', e => {
                live.characters[name].relationship_hint = e.target.value; saveSettingsDebounced();
            });

            relList.append(card);
        });
    }
}

