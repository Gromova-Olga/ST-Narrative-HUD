// components\settings\HeroSettings.js
// Вынесено из _SettingsUI.internal.js (renderSettingsHeroSheet)

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
export function renderSettingsHeroSheet() {
    const chatId = NarrativeStorage.getCurrentChatId();
    const settings = getSettings();
    if (!settings || !settings.chatData) return;
    const chatData = settings.chatData[chatId];
    if (!chatData) return;
    
    if (!chatData.heroSheet) chatData.heroSheet = { level: 1, xp: 0, points: 0, stats: { "рџ’Є РЎРёР»Р°": 1, "рџЏѓ Р›РѕРІРєРѕСЃС‚СЊ": 1, "рџ§  РРЅС‚РµР»Р»РµРєС‚": 1, "рџ—ЈпёЏ РҐР°СЂРёР·РјР°": 1, "рџ›ЎпёЏ Р’С‹РЅРѕСЃР»РёРІРѕСЃС‚СЊ": 1 } };
    const sheet = chatData.heroSheet;
    
    const content = $("#nhud-settings-hero-sheet");
    content.empty();
    
    const nextLvlXp = sheet.level * 100;
    const xpPct = Math.round((sheet.xp / nextLvlXp) * 100);
    
    // РљСЂР°СЃРёРІС‹Р№ Р±Р»РѕРє (РєР°Рє РІ РїСЂР°РІРѕРј РјРµРЅСЋ) СЃ РєРЅРѕРїРєРѕР№ С€РµСЃС‚РµСЂРµРЅРєРё РґР»СЏ СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёСЏ
    const header = $(`
        <div style="position:relative; background:var(--nhud-inp-bg, rgba(0,0,0,0.3)); border-radius:6px; padding:10px; border:1px solid var(--nhud-border); margin-bottom:10px;">
            <button id="nhud-hero-settings-toggle" style="position:absolute; top:8px; right:8px; background:none; border:none; color:#a08080; cursor:pointer; font-size:14px; transition:0.2s;" title="Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ Р·РЅР°С‡РµРЅРёСЏ">вљ™пёЏ</button>
            <div style="text-align:center; margin-bottom:10px;">
                <div style="font-size:20px; font-weight:bold; color:#e0d0a0; text-shadow:0 0 10px rgba(224,208,160,0.4);">РЈСЂРѕРІРµРЅСЊ ${sheet.level}</div>
                <div style="font-size:11px; color:var(--nhud-text-muted);">РЎРІРѕР±РѕРґРЅС‹С… РѕС‡РєРѕРІ: <b style="color:#52e0a3; font-size:13px;">${sheet.points}</b></div>
            </div>
            <div style="height:8px; background:#1a1628; border-radius:4px; overflow:hidden; border:1px solid var(--nhud-border);">
                <div style="width:${xpPct}%; height:100%; background:linear-gradient(90deg, #52a8e0, #a0d0e0); box-shadow:0 0 5px #52a8e0;"></div>
            </div>
            <div style="text-align:right; font-size:10px; color:#80a0b0; margin-top:2px;">${sheet.xp} / ${nextLvlXp} XP</div>
        </div>
    `);
    content.append(header);

    // РЎРєСЂС‹С‚С‹Р№ Р±Р»РѕРє СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёСЏ РіР»Р°РІРЅС‹С… СЃС‚Р°С‚РѕРІ
    const editBlock = $(`
        <div id="nhud-hero-edit-block" style="display:none; background:rgba(0,0,0,0.5); padding:10px; border-radius:6px; border:1px dashed #d05070; margin-bottom:10px;">
            <div style="font-size:10px; color:#d05070; margin-bottom:8px; text-transform:uppercase;">РўРµС…РЅРёС‡РµСЃРєРёРµ РЅР°СЃС‚СЂРѕР№РєРё РіРµСЂРѕСЏ</div>
            <div style="display:flex; justify-content:space-between; gap:10px;">
                <div><label style="font-size:10px; color:#a08080;">РЈСЂРѕРІРµРЅСЊ</label><input type="number" id="nhud-s-hero-lvl" value="${sheet.level}" class="nhud-input" style="width:100%; padding:4px;" /></div>
                <div><label style="font-size:10px; color:#a08080;">РўРµРєСѓС‰РёР№ XP</label><input type="number" id="nhud-s-hero-xp" value="${sheet.xp}" class="nhud-input" style="width:100%; padding:4px;" /></div>
                <div><label style="font-size:10px; color:#a08080;">РЎРІРѕР±. РћС‡РєРё</label><input type="number" id="nhud-s-hero-pts" value="${sheet.points}" class="nhud-input" style="width:100%; padding:4px;" /></div>
            </div>
        </div>
    `);
    
    editBlock.find('#nhud-s-hero-lvl').on('change', e => { sheet.level = parseInt(e.target.value)||1; saveSettingsDebounced(); renderSettingsHeroSheet(); });
    editBlock.find('#nhud-s-hero-xp').on('change', e => { sheet.xp = parseInt(e.target.value)||0; saveSettingsDebounced(); renderSettingsHeroSheet(); });
    editBlock.find('#nhud-s-hero-pts').on('change', e => { sheet.points = parseInt(e.target.value)||0; saveSettingsDebounced(); renderSettingsHeroSheet(); });
    
    content.append(editBlock);
    header.find('#nhud-hero-settings-toggle').on('click', () => { editBlock.slideToggle(150); content.find('.nhud-s-stat-del').fadeToggle(150); });

    // РЎРїРёСЃРѕРє С…Р°СЂР°РєС‚РµСЂРёСЃС‚РёРє
    for (const [stat, val] of Object.entries(sheet.stats)) {
        const statRow = $(`
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:6px 10px; border-radius:4px; border:1px solid #2a2040; margin-bottom:4px;">
                <span style="color:var(--nhud-text-main); font-size:13px; font-weight:bold;">${stat}</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="number" class="nhud-input nhud-s-stat-val" data-stat="${stat}" value="${val}" style="width:40px; padding:2px; text-align:center; font-size:14px; color:#e0d0a0; background:transparent; border:none; font-weight:bold;" />
                    <button class="nhud-s-delete nhud-s-stat-del" data-stat="${stat}" style="display:none; padding:2px 6px; font-size:10px; margin:0;" title="РЈРґР°Р»РёС‚СЊ С…Р°СЂР°РєС‚РµСЂРёСЃС‚РёРєСѓ">вњ•</button>
                </div>
            </div>
        `);
        statRow.find('.nhud-s-stat-val').on('change', function() { sheet.stats[$(this).data('stat')] = parseInt($(this).val()) || 0; saveSettingsDebounced(); });
        statRow.find('.nhud-s-stat-del').on('click', function() { delete sheet.stats[$(this).data('stat')]; saveSettingsDebounced(); renderSettingsHeroSheet(); });
        content.append(statRow);
    }

    const addStat = $(`
        <div style="display:flex; gap:4px; margin-top:8px;">
            <input id="nhud-s-stat-new" type="text" class="nhud-input" style="flex:1; padding:6px; font-size:11px;" placeholder="РќРѕРІР°СЏ С…Р°СЂР°РєС‚РµСЂРёСЃС‚РёРєР°..." />
            <button id="nhud-s-stat-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
        </div>
    `);
    addStat.find('#nhud-s-stat-add-btn').on('click', () => {
        const sName = addStat.find('#nhud-s-stat-new').val().trim();
        if (sName && !sheet.stats[sName]) { sheet.stats[sName] = 0; saveSettingsDebounced(); renderSettingsHeroSheet(); }
    });
    content.append(addStat);
}

