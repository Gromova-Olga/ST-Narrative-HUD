// components\settings\HallOfFameSettings.js
// Вынесено из _SettingsUI.internal.js (renderHallOfFame)

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
export function renderHallOfFame() {
    const list = $("#nhud-hall-of-fame-list");
    if (!list.length) return;
    list.empty();
    
    const settings = getSettings();
    const chatId = NarrativeStorage.getCurrentChatId();

    // Р•СЃР»Рё РёРіСЂРѕРє РІС‹РєР»СЋС‡РёР» РјРѕРґСѓР»СЊ
    if (!settings.modules?.achievements) {
        list.append('<div style="text-align:center; color:#806060; padding:20px; background:rgba(0,0,0,0.2); border-radius:8px; border:1px dashed #3a1525;">РЎРёСЃС‚РµРјР° РґРѕСЃС‚РёР¶РµРЅРёР№ РѕС‚РєР»СЋС‡РµРЅР° РІ РіР»РѕР±Р°Р»СЊРЅС‹С… РЅР°СЃС‚СЂРѕР№РєР°С….</div>');
        return;
    }

    const achievements = settings.chatData?.[chatId]?.achievements || [];
    
    if (achievements.length === 0) {
        list.append('<div style="text-align:center; color:#606080; padding:20px; background:rgba(0,0,0,0.2); border-radius:8px; border:1px dashed #3a1525;">Р’ СЌС‚РѕРј С‡Р°С‚Рµ РїРѕРєР° РЅРµ РїРѕР»СѓС‡РµРЅРѕ РґРѕСЃС‚РёР¶РµРЅРёР№.</div>');
        return;
    }
    
    // Р’С‹РІРѕРґРёРј РѕС‚ РЅРѕРІС‹С… Рє СЃС‚Р°СЂС‹Рј
    [...achievements].reverse().forEach((ach, idx) => {
        const card = $(`
            <div style="display:flex; gap:12px; background:linear-gradient(90deg, rgba(0,0,0,0.4), rgba(42,16,26,0.2)); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; padding:10px; align-items:center; position:relative;">
                <button class="nhud-del-ach" data-idx="${achievements.length - 1 - idx}" style="position:absolute; top:5px; right:5px; background:none; border:none; color:#804040; cursor:pointer; font-size:12px; transition:0.2s;" title="РЈРґР°Р»РёС‚СЊ РЅР°РІСЃРµРіРґР°">вњ•</button>
                <div style="font-size:24px; background:rgba(0,0,0,0.3); border:1px solid var(--nhud-accent, #d05070); width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:50%; flex-shrink:0;">
                    ${ach.icon || 'рџЏ†'}
                </div>
                <div>
                    <div style="color:#52e0a3; font-weight:bold; font-size:14px; margin-bottom:2px;">${ach.title}</div>
                    <div style="color:var(--nhud-text-main, #e0b0b0); font-size:12px; margin-bottom:4px;">${ach.desc}</div>
                    <div style="color:var(--nhud-text-muted, #606080); font-size:10px;">РџРѕР»СѓС‡РµРЅРѕ: ${ach.date}</div>
                </div>
            </div>
        `);
        
        card.find('.nhud-del-ach').hover(
            function() { $(this).css("color", "#e05252"); },
            function() { $(this).css("color", "#804040"); }
        ).on('click', function() {
            if(!confirm("РўРѕС‡РЅРѕ СѓРґР°Р»РёС‚СЊ СЌС‚Рѕ РґРѕСЃС‚РёР¶РµРЅРёРµ?")) return;
            const realIdx = parseInt($(this).data('idx'));
            settings.chatData[chatId].achievements.splice(realIdx, 1);
            saveSettingsDebounced();
            renderHallOfFame();
        });
        
        list.append(card);
    });
}

// =========================================================================
// РќРћР’Р«Р• Р¤РЈРќРљР¦РР Р Р•РќР”Р•Р Рђ Р”Р›РЇ Р›Р•Р’РћР™ РџРђРќР•Р›Р
// =========================================================================

