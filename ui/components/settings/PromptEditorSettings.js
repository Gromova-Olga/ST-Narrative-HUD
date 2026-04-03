// components\settings\PromptEditorSettings.js
// Вынесено из _SettingsUI.internal.js (renderSettingsPrompts)

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
export function renderSettingsPrompts() {
    const settings = getSettings();
    
    if (!$("#nhud-local-token-tracker").length) {
        $("#nhud-prompt-system").parent().before(`
            <details id="nhud-local-token-tracker" style="background:rgba(20,0,0,0.3); border:1px solid #802030; border-radius:4px; padding:5px; margin-bottom:15px;" open>
                <summary class="nhud-cen-head" style="cursor:pointer; color:#e05252; font-weight:bold; outline:none; padding:5px; display:flex; justify-content:space-between; align-items:center;">
                    <span>рџ“Љ Р Р°СЃС…РѕРґ С‚РѕРєРµРЅРѕРІ РІ Р­РўРћРњ С‡Р°С‚Рµ</span>
                    <button id="nhud-refresh-local-tokens" title="РџРµСЂРµСЃС‡РёС‚Р°С‚СЊ" style="background:none; border:none; color:#a08080; cursor:pointer; font-size:12px; transition:0.3s;">рџ”„</button>
                </summary>
                <div style="padding:10px; display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--nhud-left-text);">
                    <div style="display:flex; justify-content:space-between;"><span>Р‘Р°Р·РѕРІС‹Рµ РїСЂРѕРјРїС‚С‹:</span><span id="nhud-local-tokens-base">0</span></div>
                    <div style="display:flex; justify-content:space-between; color:#52a8e0; font-weight:bold;"><span>Р’С€РёС‚Р°СЏ РїР°РјСЏС‚СЊ (РРјСѓС‰РµСЃС‚РІРѕ, Р›РѕСЂ, Рё С‚.Рґ.):</span><span id="nhud-local-tokens-memory">0</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>РЎС‚СЂСѓРєС‚СѓСЂР° JSON (РЎРєРµР»РµС‚):</span><span>190</span></div>
                    <div style="border-top:1px dashed #802030; margin:4px 0;"></div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px; color:#e0c0c0;"><span>РС‚РѕРіРѕ Рє Р·Р°РїСЂРѕСЃСѓ:</span><span><span id="nhud-local-tokens-total">0</span> С‚РѕРєРµРЅРѕРІ</span></div>
                    <div style="font-size:9px; color:#a08080; margin-top:4px;">* РџРµСЂРµСЃС‡РёС‚С‹РІР°РµС‚СЃСЏ РїСЂРё РЅР°Р¶Р°С‚РёРё рџ”„ РёР»Рё РїРµСЂРµРѕС‚РєСЂС‹С‚РёРё РІРєР»Р°РґРєРё.</div>
                </div>
            </details>
        `);
    }

    $("#nhud-prompt-system").val(settings.prompts.system);
    $("#nhud-prompt-language").val(settings.prompts.language || "Russian");
    const rs = settings.requestSettings;
    $("#nhud-auto-send").prop("checked", settings.autoSend);
    $("#nhud-send-with-main").prop("checked", rs.sendWithMain || false);
    $("#nhud-light-mode").prop("checked", rs.lightMode || false);
    $("#nhud-context-messages").val(rs.contextMessages || 10);
    $("#nhud-max-tokens").val(rs.maxTokens || 2000);
    $("#nhud-temperature").val(rs.temperature || 0.7);

    const calculateLocalTokens = () => {
        const mConf = settings.modules || {};
        const pConf = settings.prompts || {};
        
        let baseText = (pConf.system || "") + "\n\n";
        if(mConf.trackers !== false) baseText += (pConf.trackersPrompt || "") + "\n";
        if(mConf.characters !== false) baseText += (pConf.charsPrompt || "") + "\n";
        if(mConf.datetime !== false) baseText += (pConf.datetimePrompt || "") + "\n";
        if(mConf.achievements !== false) baseText += (pConf.achievementsPrompt || "") + "\n";
        if(mConf.hero !== false) baseText += (pConf.heroPrompt || "") + "\n";
        if(mConf.quests !== false) baseText += (pConf.questsPrompt || "") + "\n";
        if(mConf.codex !== false) baseText += (pConf.codexPrompt || "") + "\n";
        if(mConf.factions !== false) baseText += (pConf.factionsPrompt || "") + "\n";
        (settings.promptBlocks || []).filter(b => b.enabled).forEach(b => { baseText += `For the JSON field "${b.id}": ${b.prompt || ""}\n`; });
        baseText += `\nResponse language: ${pConf.language || 'Russian'}.\nReturn ONLY valid JSON.`;

        let memoryText = "";
        const chatId = NarrativeStorage.getCurrentChatId();
        
        if (chatId && settings.chatData && settings.chatData[chatId]) {
            const cData = settings.chatData[chatId];
            
            if (mConf.hero !== false && cData.heroSheet) {
                memoryText += `\n[User Character Stats: Level ${cData.heroSheet.level} | ` + Object.entries(cData.heroSheet.stats).map(([k,v]) => `${k.replace(/[^Р°-СЏРђ-РЇa-zA-Z]/g, '').trim()}: ${v}`).join(', ') + `.]\n`;
            }
            
            if (mConf.codex !== false && cData.codex && cData.codex.length) {
                const actC = cData.codex.filter(c => c.active !== false);
                if (actC.length) {
                    memoryText += `\n[Unlocked Codex Entries]\n`;
                    actC.forEach(c => { memoryText += `- ${c.title || ''}: ${c.text || ''}\n`; });
                    memoryText += `[End Codex]\n`;
                }
            }
            
            // Р¤РРљРЎ: РЇРІРЅРѕРµ !== false РґР»СЏ РРЅРІРµРЅС‚Р°СЂСЏ Рё Р·Р°С‰РёС‰РµРЅРЅС‹Р№ РїР°СЂСЃРёРЅРі РќРµРґРІРёР¶РёРјРѕСЃС‚Рё
            if (mConf.inventory !== false && cData.inventory) {
                const inv = cData.inventory;
                memoryText += `\n[User Inventory & Assets]\nMoney: ${inv.money || 0} ${inv.currency || ''}\n`;
                if (inv.items && inv.items.length) memoryText += `Items: ${inv.items.join(', ')}\n`;
                
                const actVeh = (inv.vehicles || []).filter(v => v && v.active);
                if (actVeh.length) memoryText += `Vehicles: ${actVeh.map(v => `${v.name || ''}${v.desc ? ` (${v.desc})` : ''}`).join(', ')}\n`;
                
                const actEst = (inv.estate || []).filter(e => e && e.active);
                if (actEst.length) memoryText += `Real Estate: ${actEst.map(e => `${e.name || ''}${e.desc ? ` (${e.desc})` : ''}`).join(', ')}\n`;
                
                memoryText += `[End Inventory]\n`;
            }
            
            if (mConf.factions !== false && cData.factions && cData.factions.length) {
                memoryText += `\n[Factions Reputation]\n` + cData.factions.map(f => {
                    let fStr = `${f.name || ''}: ${f.rep || 0}/100`;
                    if (f.descActive && f.desc) fStr += ` (${f.desc})`;
                    return fStr;
                }).join('\n') + `\n[End Factions]\n`;
            }
            
            if (mConf.quests !== false && cData.quests && cData.quests.length) {
                const actQ = cData.quests.filter(q => q.status === 'active').map(q => `- ${q.title || ''}: ${q.desc || ''}`);
                if (actQ.length) memoryText += `\n[Active Quests]\n${actQ.join('\n')}\n[End Quests]\n`;
            }
        }

        const calc = (text) => {
            if (!text) return 0;
            let t = 0;
            for(let i=0; i<text.length; i++) {
                const c = text.charCodeAt(i);
                t += (c >= 1024 && c <= 1279) ? 0.5 : 0.25;
            }
            return Math.ceil(t);
        };

        const baseTokens = calc(baseText);
        const memoryTokens = calc(memoryText);
        const totalTextTokens = baseTokens + memoryTokens;
        
        $("#nhud-local-tokens-base").text(baseTokens);
        $("#nhud-local-tokens-memory").text(memoryTokens);
        $("#nhud-local-tokens-total").text(totalTextTokens + 190); 
        
        $("#nhud-refresh-local-tokens").css("transform", "rotate(180deg)");
        setTimeout(() => $("#nhud-refresh-local-tokens").css("transform", "none"), 300);
    };

    $("#nhud-refresh-local-tokens").off('click').on('click', calculateLocalTokens);
    calculateLocalTokens();
}

