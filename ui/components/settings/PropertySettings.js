// components\settings\PropertySettings.js
// Вынесено из _SettingsUI.internal.js (renderPropertyCards, renderSettingsProperty)

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
export function renderPropertyCards(type) { // type = 'estate' РёР»Рё 'vehicles'
    const chatId = NarrativeStorage.getCurrentChatId();
    const settings = getSettings();
    if (!settings || !settings.chatData) return;
    const chatData = settings.chatData[chatId];
    if (!chatData) return;
    
    if (!chatData.inventory) chatData.inventory = { money: 0, currency: "Р—РѕР»РѕС‚Рѕ", items: [], estate: [], vehicles: [] };
    const inv = chatData.inventory;
    if (!inv[type]) inv[type] = [];

    // РљРѕРЅРІРµСЂС‚Р°С†РёСЏ СЃС‚Р°СЂС‹С… СЃС‚СЂРѕРє РІ РѕР±СЉРµРєС‚С‹ + РґРѕР±Р°РІР»СЏРµРј С„Р»Р°Рі expanded (СЂР°Р·РІРµСЂРЅСѓС‚Рѕ Р»Рё РѕРїРёСЃР°РЅРёРµ)
    inv[type] = inv[type].map(item => typeof item === 'string' ? { name: item, desc: "", bgUrl: "", active: false, expanded: true } : item);

    const container = $(`#nhud-settings-${type}-list`);
    container.empty();

    inv[type].forEach((item, idx) => {
        // Р”РµР»Р°РµРј С„РѕРЅ С‡СѓС‚СЊ С‚РµРјРЅРµРµ, С‡С‚РѕР±С‹ С‚РµРєСЃС‚ РЅР° РЅРµРј С‡РёС‚Р°Р»СЃСЏ С…РѕСЂРѕС€Рѕ
        const cardBg = item.bgUrl ? `linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url('${item.bgUrl}') center/cover` : `linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8))`;
        
        const isActive = item.active;
        const activeBtnStyle = isActive 
            ? "background:var(--nhud-accent, #d05070); color:#fff; border-color:var(--nhud-accent, #d05070); box-shadow:0 0 10px rgba(208,80,112,0.4);" 
            : "background:rgba(255,255,255,0.1); color:#a0a0b0; border-color:transparent;";

        const isExpanded = item.expanded !== false; // РџРѕ СѓРјРѕР»С‡Р°РЅРёСЋ РѕРїРёСЃР°РЅРёРµ РѕС‚РєСЂС‹С‚Рѕ

        const card = $(`
            <div class="nhud-property-card" style="background: ${cardBg}; border-radius: 6px; border: 1px solid ${isActive ? 'var(--nhud-accent, #d05070)' : '#3a3050'}; transition: 0.2s; margin-bottom: 8px; overflow:hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                
                <div class="nhud-property-header" style="display:flex; justify-content:space-between; align-items:center; padding: 6px 8px; background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; align-items:center; flex:1; gap:6px;">
                        <button class="nhud-prop-accordion-btn" style="background:none; border:none; color:#e0c0c0; cursor:pointer; font-size:12px; padding:0; width:16px; transition:0.2s;" title="РЎРІРµСЂРЅСѓС‚СЊ/Р Р°Р·РІРµСЂРЅСѓС‚СЊ РѕРїРёСЃР°РЅРёРµ">${isExpanded ? 'в–ј' : 'в–¶'}</button>
                        <input class="nhud-prop-name nhud-input" type="text" value="${item.name}" placeholder="РќР°Р·РІР°РЅРёРµ..." style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:#e0c0c0; font-weight:bold; flex:1; padding:4px 6px;" />
                    </div>
                    
                    <div style="display:flex; gap:4px; margin-left:6px;">
                        <button class="nhud-prop-toggle-btn" style="border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer; font-weight:bold; transition:0.2s; ${activeBtnStyle}" title="Р’С€РёС‚СЊ РІ РїР°РјСЏС‚СЊ РР (РђРєС‚РёРІРЅРѕ)">
                            ${isActive ? 'рџ‘ЃпёЏ Р’ РїР°РјСЏС‚Рё' : 'рџ‘ЃпёЏвЂЌрџ—ЁпёЏ РЎРєСЂС‹С‚Рѕ'}
                        </button>
                        <button class="nhud-prop-prompt-btn" style="background:rgba(82,168,224,0.2); border:1px solid #3a5a80; color:#80b0e0; border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer; font-weight:bold;" title="Р’СЃС‚Р°РІРёС‚СЊ РѕРїРёСЃР°РЅРёРµ С‚РµРєСЃС‚РѕРј РІ РїРѕР»Рµ РІРІРѕРґР° С‡Р°С‚Р°">рџ’¬</button>
                        <button class="nhud-prop-settings-btn" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer;" title="РќР°СЃС‚СЂРѕР№РєРё (URL РєР°СЂС‚РёРЅРєРё Рё РЈРґР°Р»РµРЅРёРµ)">вљ™пёЏ</button>
                    </div>
                </div>

                <div class="nhud-prop-desc-container" style="display:${isExpanded ? 'block' : 'none'}; padding:8px;">
                    <textarea class="nhud-prop-desc nhud-textarea" rows="3" placeholder="РљСЂР°СЃРёРІРѕРµ РѕРїРёСЃР°РЅРёРµ... (РћРЅРѕ Р±СѓРґРµС‚ РІС€РёС‚Рѕ РІ РїР°РјСЏС‚СЊ РР, РµСЃР»Рё РіРѕСЂРёС‚ РіР»Р°Р·РёРє)" style="font-size:12px; background:rgba(0,0,0,0.4); color:#e0d0c0; border:1px solid rgba(255,255,255,0.1); box-shadow: inset 0 0 10px rgba(0,0,0,0.5); text-shadow: 0 1px 2px #000; width:100%; box-sizing:border-box;">${item.desc || ''}</textarea>
                </div>

                <div class="nhud-prop-settings-container" style="display:none; padding:8px; background:rgba(0,0,0,0.85); border-top:1px dashed #d05070;">
                    <div style="font-size:10px; color:#d05070; margin-bottom:4px; text-transform:uppercase;">РўРµС…РЅРёС‡РµСЃРєРёРµ РЅР°СЃС‚СЂРѕР№РєРё</div>
                    <input class="nhud-prop-bg nhud-input" type="text" value="${item.bgUrl || ''}" placeholder="URL С„РѕРЅР° (РєР°СЂС‚РёРЅРєР°)" style="font-size:11px; padding:4px; width:100%; box-sizing:border-box; margin-bottom:6px;" />
                    <button class="nhud-prop-del-btn nhud-s-delete" style="padding:4px; font-size:11px; width:100%;">рџ—‘пёЏ РЈРґР°Р»РёС‚СЊ РєР°СЂС‚РѕС‡РєСѓ РЅР°РІСЃРµРіРґР°</button>
                </div>
            </div>
        `);

        card.find('.nhud-prop-name').on('change', e => { item.name = e.target.value; saveSettingsDebounced(); });
        card.find('.nhud-prop-desc').on('change', e => { item.desc = e.target.value; saveSettingsDebounced(); });
        card.find('.nhud-prop-bg').on('change', e => { item.bgUrl = e.target.value; saveSettingsDebounced(); renderPropertyCards(type); });
        
        // Р“Р°СЂРјРѕС€РєР° РѕРїРёСЃР°РЅРёСЏ
        card.find('.nhud-prop-accordion-btn').on('click', function() {
            item.expanded = !item.expanded;
            saveSettingsDebounced();
            card.find('.nhud-prop-desc-container').slideToggle(150);
            $(this).text(item.expanded ? 'в–ј' : 'в–¶');
        });

        // РћС‚РєСЂС‹С‚РёРµ С€РµСЃС‚РµСЂРµРЅРєРё
        card.find('.nhud-prop-settings-btn').on('click', () => {
            card.find('.nhud-prop-settings-container').slideToggle(150);
        });

        // Р“Р»Р°Р·РёРє
        card.find('.nhud-prop-toggle-btn').on('click', () => {
            item.active = !item.active;
            saveSettingsDebounced();
            renderPropertyCards(type);
        });

        // РљРЅРѕРїРєР° рџ’¬
        card.find('.nhud-prop-prompt-btn').on('click', () => {
            const chatInput = document.getElementById("send_textarea");
            if (chatInput) {
                const textToInsert = `[${item.name}]: ${item.desc}`;
                chatInput.value = chatInput.value ? chatInput.value + "\n" + textToInsert : textToInsert;
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                toastr.success(`РћРїРёСЃР°РЅРёРµ "${item.name}" РґРѕР±Р°РІР»РµРЅРѕ РІ РїРѕР»Рµ РІРІРѕРґР°!`);
            }
        });

        // РЈРґР°Р»РµРЅРёРµ
        card.find('.nhud-prop-del-btn').on('click', () => {
            if(!confirm("РЈРґР°Р»РёС‚СЊ РєР°СЂС‚РѕС‡РєСѓ РЅР°РІСЃРµРіРґР°?")) return;
            inv[type].splice(idx, 1);
            saveSettingsDebounced();
            renderPropertyCards(type);
        });

        container.append(card);
    });
}

export function renderSettingsProperty() {
    const chatId = NarrativeStorage.getCurrentChatId();
    const settings = getSettings();
    if (!settings || !settings.chatData) return;
    const chatData = settings.chatData[chatId];
    if (!chatData) return;
    if (!chatData.inventory) chatData.inventory = { money: 0, currency: "Р—РѕР»РѕС‚Рѕ", items: [], estate: [], vehicles: [] };
    const inv = chatData.inventory;

    // РљРѕС€РµР»РµРє
    $("#nhud-settings-money").val(inv.money).off('change').on('change', e => { inv.money = parseInt(e.target.value)||0; saveSettingsDebounced(); });
    $("#nhud-settings-currency").val(inv.currency).off('change').on('change', e => { inv.currency = e.target.value; saveSettingsDebounced(); });

    // РћР±С‹С‡РЅС‹Р№ РёРЅРІРµРЅС‚Р°СЂСЊ
    const invList = $("#nhud-settings-inventory-list");
    invList.empty();
    inv.items.forEach((item, idx) => {
        invList.append(`
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:4px; border:1px solid #2a2040; margin-bottom:4px; font-size:12px;">
                <span>${item}</span>
                <button class="nhud-inv-del nhud-s-delete" data-idx="${idx}" style="padding:2px 6px; font-size:10px; margin:0;">вњ•</button>
            </div>
        `);
    });
    invList.append(`
        <div style="display:flex; gap:4px; margin-top:6px;">
            <input id="nhud-s-inv-add-val" type="text" class="nhud-input" style="flex:1; padding:4px; font-size:11px;" placeholder="Р”РѕР±Р°РІРёС‚СЊ РїСЂРµРґРјРµС‚..." />
            <button id="nhud-s-inv-add-btn" class="nhud-add-btn" style="margin:0; padding:4px 8px;">+</button>
        </div>
    `);
    
    invList.find('.nhud-inv-del').on('click', function() {
        inv.items.splice(parseInt($(this).data('idx')), 1); saveSettingsDebounced(); renderSettingsProperty();
    });
    invList.find('#nhud-s-inv-add-btn').on('click', function() {
        const val = $("#nhud-s-inv-add-val").val().trim();
        if (val) { inv.items.push(val); saveSettingsDebounced(); renderSettingsProperty(); }
    });

    // РљР°СЂС‚РѕС‡РєРё РёРјСѓС‰РµСЃС‚РІР°
    renderPropertyCards('estate');
    renderPropertyCards('vehicles');
}

// =========================================================================
// Р Р•РќР”Р•Р Р« Р”Р›РЇ Р›Р•Р’РћР™ РџРђРќР•Р›Р (РўР Р•РљР•Р Р« Р Р–РЈР РќРђР›)
// =========================================================================

