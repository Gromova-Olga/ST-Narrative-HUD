// components\settings\CodexSettings.js
// Вынесено из _SettingsUI.internal.js (renderSettingsCodex)

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
export function renderSettingsCodex() {
    const chatId = NarrativeStorage.getCurrentChatId();
    const settings = getSettings();
    if (!settings || !settings.chatData) return;
    const chatData = settings.chatData[chatId];
    if (!chatData) return;
    if (!chatData.codex) chatData.codex = [];
    
    chatData.codex = chatData.codex.map(c => ({ ...c, active: c.active !== false }));
    const codex = chatData.codex;
    
    const content = $("#nhud-settings-codex-list");
    content.empty();

    content.append(`
        <div style="display:flex; gap:6px; margin-bottom:10px;">
            <input id="nhud-s-c-add-title" class="nhud-input" style="flex:1;" placeholder="Р—Р°РіРѕР»РѕРІРѕРє СЃС‚Р°С‚СЊРё..." />
            <button id="nhud-s-c-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
        </div>
    `);

    codex.forEach((entry, idx) => {
        const isActive = entry.active;
        const activeBtnStyle = isActive 
            ? "background:var(--nhud-accent, #d05070); color:#fff; border-color:var(--nhud-accent, #d05070); box-shadow:0 0 10px rgba(208,80,112,0.4);" 
            : "background:rgba(255,255,255,0.1); color:#a0a0b0; border-color:transparent;";

        const card = $(`
            <div style="background:var(--nhud-inp-bg, rgba(0,0,0,0.3)); border:1px solid ${isActive ? 'var(--nhud-accent, #d05070)' : 'var(--nhud-border)'}; border-radius:6px; padding:8px; position:relative; margin-bottom:6px; transition:0.2s;">
                <button class="nhud-c-del" data-idx="${idx}" style="position:absolute; top:4px; right:4px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">вњ•</button>
                
                <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; padding-right:15px;">
                    <input class="nhud-input nhud-c-title" data-idx="${idx}" value="${entry.title}" style="font-weight:bold; color:#b080e0; flex:1; background:transparent; border:none; padding:0;" />
                    <button class="nhud-c-toggle" data-idx="${idx}" style="border-radius:4px; padding:2px 6px; font-size:10px; cursor:pointer; font-weight:bold; transition:0.2s; ${activeBtnStyle}" title="Р’С€РёС‚СЊ РІ РїР°РјСЏС‚СЊ РР">
                        ${isActive ? 'рџ‘ЃпёЏ Р’ РїР°РјСЏС‚Рё' : 'рџ‘ЃпёЏвЂЌрџ—ЁпёЏ РЎРєСЂС‹С‚Рѕ'}
                    </button>
                </div>
                <textarea class="nhud-textarea nhud-c-text" data-idx="${idx}" rows="3" style="font-size:11px;">${entry.text}</textarea>
            </div>
        `);
        
        card.find('.nhud-c-del').on('click', function() { codex.splice(parseInt($(this).data('idx')), 1); saveSettingsDebounced(); renderSettingsCodex(); });
        card.find('.nhud-c-title').on('change', function() { codex[parseInt($(this).data('idx'))].title = $(this).val(); saveSettingsDebounced(); });
        card.find('.nhud-c-text').on('change', function() { codex[parseInt($(this).data('idx'))].text = $(this).val(); saveSettingsDebounced(); });
        card.find('.nhud-c-toggle').on('click', function() {
            entry.active = !entry.active;
            saveSettingsDebounced();
            renderSettingsCodex();
        });
        content.append(card);
    });

    $("#nhud-s-c-add-btn").on("click", () => {
        const title = $("#nhud-s-c-add-title").val().trim();
        if (title) { codex.unshift({ title, text: "РўРµРєСЃС‚ СЃС‚Р°С‚СЊРё...", active: true }); saveSettingsDebounced(); renderSettingsCodex(); }
    });
}

// в”Ђв”Ђв”Ђ РљРђР›Р•РќР”РђР Р¬ (UI) в”Ђв”Ђв”Ђ
