// ui/components/panels/SettingsPanelBuilder.js
// Каркас панели настроек (buildSettingsPanel, updateSettingsPosition, open/close)
// Вынесено из _SettingsUI.internal.js

import { getSettings, getLive, getChatTrackers } from '../../../core/StateManager.js';
import { NarrativeStorage } from '../../../storage/NarrativeStorage.js';
import { getContext } from '../../../integration/STContextProvider.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { openSmartCleaner } from '../Modals.js';
import { updateHistoryButtons } from '../MessageActions.js';
import { renderTrackers, renderInfoBlockButtons } from '../UIManager.js';

// Render-функции из компонентов настроек
import { renderSettingsCharacterAccordion } from '../settings/CharacterSettings.js';
import { renderParserSettings, renderPromptBlocks } from '../settings/PromptSettings.js';
import { renderStorageStats } from '../settings/StorageSettings.js';
import { renderSettingsProfileSelect } from '../settings/ProfileSettings.js';
import { renderSettingsTrackers } from '../settings/TrackerSettings.js';
import { renderSettingsPrompts } from '../settings/PromptEditorSettings.js';
import { renderHallOfFame } from '../settings/HallOfFameSettings.js';
import { renderPropertyCards, renderSettingsProperty } from '../settings/PropertySettings.js';
import { renderSettingsFactions } from '../settings/FactionSettings.js';
import { renderSettingsHeroSheet } from '../settings/HeroSettings.js';
import { renderSettingsQuests } from '../settings/QuestSettings.js';
import { renderSettingsCodex } from '../settings/CodexSettings.js';
import { renderSettingsCalendar } from '../settings/CalendarSettings.js';

function getUserName() { return getContext().name1 || ''; }
function getSTProfiles() { return getContext().extensionSettings?.connectionManager?.profiles || []; }
function parseJsonFromMessage(text, openTag, closeTag) { if (!text) return null; const o=openTag.replace(/[.*+?${}()|[\]\\]/g,'\\$&'); const c=closeTag.replace(/[.*+?${}()|[\]\\]/g,'\\$&'); const r=new RegExp(o+'\\s*(\\{[\\s\\S]*?\\})\\s*'+c,'i'); const m=text.match(r); if(m){try{return JSON.parse(m[1]);}catch{}} const j=text.match(/\\{[\\s\\S]*\\}/); if(j){try{return JSON.parse(j[0]);}catch{}} return null; }

// ui/_SettingsUI.internal.js
// Остались: updateSettingsPosition, openSettingsPanel, closeSettingsPanel, buildSettingsPanel
// Все render-функции вынесены в components/settings/

export function updateSettingsPosition() {
    const chatEl = document.getElementById("chat");
    const panel = $("#nhud-settings-panel");
    if (!panel.length) return;

    // Р’СЃС‚СЂР°РёРІР°РµРј РїРѕР»Р·СѓРЅРѕРє Рё РєРЅРѕРїРєСѓ, РµСЃР»Рё РёС… РµС‰Рµ РЅРµС‚
    if (!$("#nhud-left-resize-handle").length) {
        initLeftPanelResize();
    }

    const topOffset = $('#top-bar').outerHeight() || 40; // РћС‚СЃС‚СѓРї РѕС‚ С€Р°РїРєРё ST
    
    import('../core/StateManager.js').then(m => {
        const settings = m.getSettings();
        if (!settings.ui) settings.ui = {};
        const mode = settings.ui.leftMode || "chat"; 
        const handle = $("#nhud-left-resize-handle");

        if (panel.is(":visible")) {
            panel.css({ top: topOffset + "px" });
            
            if (window.innerWidth <= 768) {
                panel.css({ width: "100%" });
                handle.hide();
            } else {
                if (mode === "screen") {
                    // Р РµР¶РёРј 1: Р СѓС‡РЅР°СЏ С€РёСЂРёРЅР° (СЃ РїРѕР»Р·СѓРЅРєРѕРј)
                    const w = settings.ui.leftWidth || 300;
                    panel.css({ width: w + "px" });
                    handle.show();
                    $("#nhud-left-mode-toggle").html("в—Ё").attr("title", "РџСЂРёРІСЏР·Р°С‚СЊ Рє РіСЂР°РЅРёС†Рµ С‡Р°С‚Р°");
                } else {
                    // Р РµР¶РёРј 2: РџСЂРёРІСЏР·РєР° Рє РіСЂР°РЅРёС†Рµ С‡Р°С‚Р°
                    if (chatEl) {
                        const rect = chatEl.getBoundingClientRect();
                        panel.css({ width: Math.max(250, rect.left) + "px" });
                    }
                    handle.hide();
                    $("#nhud-left-mode-toggle").html("в—§").attr("title", "Р СѓС‡РЅР°СЏ С€РёСЂРёРЅР°");
                }
            }
        }
    });
}

// РќРѕРІР°СЏ С„СѓРЅРєС†РёСЏ, РєРѕС‚РѕСЂР°СЏ РґРѕР±Р°РІР»СЏРµС‚ Р»РѕРіРёРєСѓ РїРµСЂРµС‚Р°СЃРєРёРІР°РЅРёСЏ Рё РїРµСЂРµРєР»СЋС‡РµРЅРёСЏ
function initLeftPanelResize() {
    const panel = $("#nhud-settings-panel");
    
    // Р”РѕР±Р°РІР»СЏРµРј РєРЅРѕРїРєСѓ РїРµСЂРµРєР»СЋС‡РµРЅРёСЏ (РІ РїСЂР°РІС‹Р№ РІРµСЂС…РЅРёР№ СѓРіРѕР», Р»РµРІРµРµ РєСЂРµСЃС‚РёРєР° Р·Р°РєСЂС‹С‚РёСЏ)
    panel.append('<button id="nhud-left-mode-toggle" style="position:absolute; top:-5px; right:15px; background:none; border:none; color:var(--nhud-accent, #d05070); font-size:16px; font-weight:bold; cursor:pointer; padding:0; z-index:100; transition:0.2s;">в—§</button>');
    // Р”РѕР±Р°РІР»СЏРµРј РїРѕР»Р·СѓРЅРѕРє РёР·РјРµРЅРµРЅРёСЏ С€РёСЂРёРЅС‹ РЅР° РїСЂР°РІСѓСЋ РіСЂР°РЅРёС†Сѓ
    panel.append('<div id="nhud-left-resize-handle" style="position:absolute; right:-4px; top:0; bottom:0; width:8px; cursor:ew-resize; z-index:10; background:transparent;"></div>');

    // РљР»РёРє РїРѕ РєРЅРѕРїРєРµ РїРµСЂРµРєР»СЋС‡РµРЅРёСЏ
    $("#nhud-left-mode-toggle").on("click", () => {
        import('../core/StateManager.js').then(m => {
            const settings = m.getSettings();
            if (!settings.ui) settings.ui = {};
            settings.ui.leftMode = settings.ui.leftMode === "screen" ? "chat" : "screen";
            import('../../../../../script.js').then(sc => sc.saveSettingsDebounced()); 
            updateSettingsPosition();
        });
    });

    // Р›РѕРіРёРєР° РїРµСЂРµС‚Р°СЃРєРёРІР°РЅРёСЏ (СЂРµСЃР°Р№Р·Р°)
    let isResizing = false, startX, startWidth;

    $("#nhud-left-resize-handle").on("mousedown", function(e) {
        import('../core/StateManager.js').then(m => {
            if (m.getSettings().ui?.leftMode === "chat") return;
            isResizing = true; 
            startX = e.clientX; 
            startWidth = panel.width();
            $("body").css("user-select", "none"); 
            e.preventDefault();
        });
    });
    
    $(document).on("mousemove.nhudleftresize", function(e) {
        if (!isResizing) return;
        const newWidth = startWidth + (e.clientX - startX); // РўСЏРЅРµРј РІРїСЂР°РІРѕ - СѓРІРµР»РёС‡РёРІР°РµРј
        const finalWidth = Math.min(Math.max(220, newWidth), window.innerWidth / 1.5);
        panel.css("width", finalWidth + "px");
    });
    
    $(document).on("mouseup.nhudleftresize", () => {
        if (isResizing) { 
            isResizing = false; 
            $("body").css("user-select", ""); 
            import('../core/StateManager.js').then(m => {
                m.getSettings().ui.leftWidth = panel.width();
                import('../../../../../script.js').then(sc => sc.saveSettingsDebounced()); 
            });
        }
    });

    // РЎР»РµРґРёРј Р·Р° СЂРµСЃР°Р№Р·РѕРј РѕРєРЅР° С‡Р°С‚Р°, С‡С‚РѕР±С‹ РїР°РЅРµР»СЊ Р°РґР°РїС‚РёСЂРѕРІР°Р»Р°СЃСЊ
    const chatObserver = new ResizeObserver(() => { 
        import('../core/StateManager.js').then(m => {
            if (m.getSettings().ui?.leftMode !== "screen") updateSettingsPosition(); 
        });
    });
    const chatEl = document.getElementById("chat");
    if (chatEl) chatObserver.observe(chatEl);
}

export function openSettingsPanel() {
    if (!$("#nhud-settings-panel").length) buildSettingsPanel();
    else {
        renderSettingsTrackers(); 
        renderSettingsCharacterAccordion();
        renderSettingsProfileSelect(); 
        renderSettingsPrompts(); 
        renderPromptBlocks();
        renderParserSettings();
        renderSettingsFactions();
        renderSettingsHeroSheet();
    }
    updateSettingsPosition();
    // ИСПРАВЛЕНИЕ: Гарантируем, что display останется flex
    $("#nhud-settings-panel").css({ opacity: 0, display: "flex" }).animate({ opacity: 1 }, 200);
}

export function closeSettingsPanel() {
    $("#nhud-settings-panel").fadeOut(200);
}

export function buildSettingsPanel() {
    if ($("#nhud-settings-panel").length) return;

    $("body").append(`
        <style>
            .nhud-tab-content { display: none !important; }
            .nhud-tab-content.active-tab { display: block !important; }
        </style>

        <div id="nhud-settings-panel" style="display:none; position:fixed; top:40px; bottom:0; left:0; z-index:9990; background:var(--nhud-left-bg, #151220); border-right:1px solid var(--nhud-border, #3a1525); flex-direction:column; box-shadow:5px 0 25px rgba(0,0,0,0.8);">
            <div id="nhud-settings-header" style="display:flex; justify-content:space-between; align-items:center; background:var(--nhud-left-head, linear-gradient(180deg, #2a101a, #1a0a10)); padding:10px 15px; border-bottom:1px solid var(--nhud-border, #4a1525);">
                <span style="font-weight:bold; color:var(--nhud-left-text, #e0c0c0); text-shadow:0 2px 4px rgba(0,0,0,0.5);">вљ”пёЏ Narrative HUD</span>
                <button id="nhud-settings-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); font-size:18px; cursor:pointer; padding:0;">вњ•</button>
            </div>
            
            <div id="nhud-settings-body" style="display:flex; flex:1; overflow:hidden; flex-direction:column;">
                
                <div id="nhud-settings-tabs" style="display:flex; flex-wrap:wrap; background:rgba(0,0,0,0.4); border-bottom:1px solid var(--nhud-border, #3a1525); flex-shrink:0;">
                    <button class="nhud-tab active" data-tab="trackers" title="РўСЂРµРєРµСЂС‹" style="padding:8px; background:none; border:none; color:var(--nhud-left-text, #e0c0c0); font-weight:bold; cursor:pointer;">рџ“Љ <span class="nhud-tab-text">РўСЂРµРєРµСЂС‹</span></button>
                    <button class="nhud-tab" data-tab="property" title="РРјСѓС‰РµСЃС‚РІРѕ" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">рџЋ’ <span class="nhud-tab-text">РРјСѓС‰РµСЃС‚РІРѕ</span></button>
                    <button class="nhud-tab" data-tab="journal" title="Р–СѓСЂРЅР°Р»" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">рџ“њ <span class="nhud-tab-text">Р–СѓСЂРЅР°Р»</span></button>
                    <button class="nhud-tab" data-tab="halloffame" title="Р—Р°Р» РЎР»Р°РІС‹" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">рџЏ† <span class="nhud-tab-text">Р—Р°Р» РЎР»Р°РІС‹</span></button>
                    <button class="nhud-tab" data-tab="characters" title="РџРµСЂСЃРѕРЅР°Р¶Рё" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">рџ‘Ґ <span class="nhud-tab-text">РџРµСЂСЃ.</span></button>
                    <button class="nhud-tab" data-tab="prompts" title="РџСЂРѕРјС‚С‹" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">рџ“ќ <span class="nhud-tab-text">РџСЂРѕРјС‚С‹</span></button>
                    <button class="nhud-tab" data-tab="api" title="API Рё JSON" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">рџ”Њ <span class="nhud-tab-text">API</span></button>
                    <button class="nhud-tab" data-tab="storage" title="Р‘Р°Р·Р° Р”Р°РЅРЅС‹С…" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">рџ—„пёЏ <span class="nhud-tab-text">Р‘Р°Р·Р°</span></button>
                </div>
                
                <div id="nhud-settings-content" style="flex:1; overflow-y:auto; padding:15px; background:rgba(0,0,0,0.2);">

                    <div class="nhud-tab-content active-tab" data-tab="trackers">
                        <div id="nhud-settings-rel-container-placeholder"></div>
                        <details style="margin-top:10px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#a090c0; cursor:pointer; padding:5px; outline:none; user-select:none;">рџЏґвЂЌв пёЏ РћС‚РЅРѕС€РµРЅРёСЏ СЃ С„СЂР°РєС†РёСЏРјРё</summary>
                            <div id="nhud-settings-factions-list" style="margin-top:10px;"></div>
                        </details>
                        <details style="margin-top:10px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#52a8e0; cursor:pointer; padding:5px; outline:none; user-select:none;">рџ§¬ РЎС‚Р°С‚С‹ Р“РµСЂРѕСЏ</summary>
                            <div id="nhud-settings-hero-sheet" style="margin-top:10px;"></div>
                        </details>
                    </div>

                    <div class="nhud-tab-content" data-tab="property">
                        <details open style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:var(--nhud-accent, #d05070); cursor:pointer; padding:5px; outline:none; user-select:none;">рџ“‰ РћСЃРЅРѕРІРЅС‹Рµ С‚СЂРµРєРµСЂС‹ (Р—РґРѕСЂРѕРІСЊРµ, РњР°РЅР°...)</summary>
                            <div class="nhud-section-hint" style="margin-top:10px;">РќР°Р·РІР°РЅРёРµ В· ID (РґР»СЏ JSON) В· РњР°РєСЃ В· Р¦РІРµС‚</div>
                            <div id="nhud-settings-tracker-list"></div>
                            <button id="nhud-add-tracker" class="nhud-add-btn">+ Р”РѕР±Р°РІРёС‚СЊ С‚СЂРµРєРµСЂ</button>
                        </details>
                        
                        <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid var(--nhud-border); margin-bottom:15px;">
                            <div style="font-size:11px; color:#a0a0b8; text-transform:uppercase; margin-bottom:6px; font-weight:bold;">рџ’° РљРѕС€РµР»РµРє</div>
                            <div style="display:flex; gap:6px;">
                                <input id="nhud-settings-money" type="number" class="nhud-input" style="flex:1; font-weight:bold; color:#52e0a3; font-size:14px;" />
                                <input id="nhud-settings-currency" type="text" class="nhud-input" style="width:100px; text-align:center;" placeholder="Р’Р°Р»СЋС‚Р°" />
                            </div>
                        </div>

                        <details open style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#e0a352; cursor:pointer; padding:5px; outline:none; user-select:none;">рџЋ’ РРЅРІРµРЅС‚Р°СЂСЊ</summary>
                            <div id="nhud-settings-inventory-list" style="margin-top:10px;"></div>
                        </details>

                        <details style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#a0d0e0; cursor:pointer; padding:5px; outline:none; user-select:none;">рџЏ  РќРµРґРІРёР¶РёРјРѕСЃС‚СЊ</summary>
                            <div id="nhud-settings-estate-list" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
                            <button id="nhud-add-estate" class="nhud-add-btn">+ Р”РѕР±Р°РІРёС‚СЊ РЅРµРґРІРёР¶РёРјРѕСЃС‚СЊ</button>
                        </details>

                        <details style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#e080b0; cursor:pointer; padding:5px; outline:none; user-select:none;">рџљ— РўСЂР°РЅСЃРїРѕСЂС‚</summary>
                            <div id="nhud-settings-vehicles-list" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
                            <button id="nhud-add-vehicle" class="nhud-add-btn">+ Р”РѕР±Р°РІРёС‚СЊ С‚СЂР°РЅСЃРїРѕСЂС‚</button>
                        </details>
                    </div>

                    <div class="nhud-tab-content" data-tab="journal">
                        <details open style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#e0c0a0; cursor:pointer; padding:5px; outline:none; user-select:none;">рџ“њ РљРІРµСЃС‚С‹</summary>
                            <div id="nhud-settings-quests-list" style="margin-top:10px;"></div>
                        </details>
                        <details open style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#b080e0; cursor:pointer; padding:5px; outline:none; user-select:none;">рџ“– РЎСЋР¶РµС‚РЅС‹Р№ РљРѕРґРµРєСЃ</summary>
                            <div id="nhud-settings-codex-list" style="margin-top:10px;"></div>
                        </details>
                        <details open style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#70d090; cursor:pointer; padding:5px; outline:none; user-select:none;">рџ“… РљР°Р»РµРЅРґР°СЂСЊ СЃРѕР±С‹С‚РёР№</summary>
                            <div id="nhud-settings-calendar-wrap" style="margin-top:10px;"></div>
                        </details>
                    </div>

                    <div class="nhud-tab-content" data-tab="halloffame">
                        <div style="text-align:center; margin-bottom:15px;">
                            <h3 style="margin:0; color:#52e0a3; text-shadow:0 0 10px rgba(82,224,163,0.3);">рџЏ† Р—Р°Р» РЎР»Р°РІС‹</h3>
                            <div style="font-size:0.8em; color:var(--nhud-text-muted);">Р—РґРµСЃСЊ С…СЂР°РЅСЏС‚СЃСЏ РІР°С€Рё РІРµР»РёРєРёРµ (Рё РЅРµ РѕС‡РµРЅСЊ) СЃРІРµСЂС€РµРЅРёСЏ</div>
                        </div>
                        <div id="nhud-hall-of-fame-list" style="display:flex; flex-direction:column; gap:10px;"></div>
                    </div>

                    <div class="nhud-tab-content" data-tab="characters">
                        <div class="nhud-section-hint">РќР°Р¶РјРё РЅР° С‡Р°С‚ С‡С‚РѕР±С‹ СЂР°СЃРєСЂС‹С‚СЊ РїРµСЂСЃРѕРЅР°Р¶РµР№. РђРІР°С‚Р°СЂРєРё СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ РіР»РѕР±Р°Р»СЊРЅРѕ.</div>
                        <div id="nhud-settings-char-accordion"></div>
                    </div>

                    <div class="nhud-tab-content" data-tab="prompts">
                        <div class="nhud-field-group">
                            <label>РЎРёСЃС‚РµРјРЅС‹Р№ РїСЂРѕРјС‚</label>
                            <textarea id="nhud-prompt-system" class="nhud-textarea" rows="3"></textarea>
                        </div>
                        <div class="nhud-field-group">
                            <label>РЇР·С‹Рє РѕС‚РІРµС‚Р°</label>
                            <input id="nhud-prompt-language" class="nhud-input" type="text" placeholder="Russian / English" style="width:150px;" />
                        </div>
                        <div style="border-top:1px solid var(--nhud-border);padding-top:12px;margin-top:4px;">
                            <div class="nhud-section-hint">Р‘Р»РѕРєРё РїСЂРѕРјС‚РѕРІ вЂ” РєР°Р¶РґС‹Р№ Р±Р»РѕРє СЌС‚Рѕ РѕС‚РґРµР»СЊРЅРѕРµ РїРѕР»Рµ РІ JSON РѕС‚РІРµС‚Рµ:</div>
                            <div id="nhud-prompt-blocks-list"></div>
                            <button id="nhud-add-prompt-block" class="nhud-add-btn">+ Р”РѕР±Р°РІРёС‚СЊ Р±Р»РѕРє</button>
                            <div style="height: 60px; width: 100%; flex-shrink: 0;"></div>
                        </div>
                    </div>

                    <div class="nhud-tab-content" data-tab="api">
                        <h4 style="color:#d05070; margin-top:0;">рџ”Њ РџРѕРґРєР»СЋС‡РµРЅРёРµ</h4>
                        <div id="nhud-proxy-instruction-btn" style="background:rgba(224, 82, 82, 0.15); border:1px solid #e05252; border-radius:4px; padding:10px; margin-bottom:15px; cursor:pointer; text-align:center; transition:0.2s;">
                            <span style="color:#e05252; font-weight:bold; font-size:14px;">вљ пёЏ Р’РђР–РќРћ: РћР—РќРђРљРћРњР¬РўР•РЎР¬ РЎ РРќРЎРўР РЈРљР¦РР•Р™ РџРћ РџР РћРљРЎР!</span>
                            <div style="font-size:11px; color:#d0d0a0; margin-top:4px;">РќР°Р¶РјРёС‚Рµ Р·РґРµСЃСЊ, С‡С‚РѕР±С‹ СѓР·РЅР°С‚СЊ, РєР°Рє РїСЂР°РІРёР»СЊРЅРѕ РЅР°СЃС‚СЂРѕРёС‚СЊ РїСЂРѕС„РёР»Рё OpenRouter Рё СЃС‚РѕСЂРѕРЅРЅРёС… API</div>
                        </div>
                        <div class="nhud-field-group"><label>РџСЂРѕС„РёР»СЊ РїРѕРґРєР»СЋС‡РµРЅРёСЏ</label><select id="nhud-settings-profile-select" class="nhud-select"></select></div>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-auto-send" type="checkbox" /><label for="nhud-auto-send" style="color:#d0b0b0;">РђРІС‚Рѕ-РѕС‚РїСЂР°РІРєР° РїРѕСЃР»Рµ РєР°Р¶РґРѕРіРѕ СЃРѕРѕР±С‰РµРЅРёСЏ Р±РѕС‚Р°</label></div>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-send-with-main" type="checkbox" /><label for="nhud-send-with-main" style="color:#d0b0b0;">РћС‚РїСЂР°РІР»СЏС‚СЊ РІРјРµСЃС‚Рµ СЃ РѕСЃРЅРѕРІРЅС‹Рј Р·Р°РїСЂРѕСЃРѕРј (Р’С€РёРІР°С‚СЊ РІ РїСЂРµСЃРµС‚)</label></div>
                        <div class="nhud-field-group nhud-checkbox-group" style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--nhud-border);">
                            <input id="nhud-light-mode" type="checkbox" />
                            <label for="nhud-light-mode" style="color:#e0d0a0;"><strong>вљЎ Р›Р°Р№С‚-СЂРµР¶РёРј (Р­РєРѕРЅРѕРјРёСЏ С‚РѕРєРµРЅРѕРІ)</strong></label>
                        </div>
                        <div style="font-size:11px; color:#a0a0b0; padding-left:24px; margin-bottom:8px; line-height:1.4;">
                            РЈРЅРёРєР°Р»СЊРЅС‹Р№ Р°Р»РіРѕСЂРёС‚Рј С„РѕРЅРѕРІРѕРіРѕ РїР°СЂСЃРёРЅРіР° РґР»СЏ СЃР»Р°Р±С‹С… РјРѕРґРµР»РµР№ (Р”Р•Р›РђР•Рў Р”Р’Рђ Р—РђРџР РћРЎРђ).<br>
                            Р’РјРµСЃС‚Рѕ С‚РѕРіРѕ С‡С‚РѕР±С‹ Р·Р°СЃС‚Р°РІР»СЏС‚СЊ РР РїРёСЃР°С‚СЊ С‚СЏР¶РµР»С‹Р№ JSON РІ РєР°Р¶РґРѕРј РѕС‚РІРµС‚Рµ, РјРѕРґ РґРµР»Р°РµС‚ РґРІР° Р·Р°РїСЂРѕСЃР°:<br>
                            1. РР РїРёС€РµС‚ РєСЂР°СЃРёРІС‹Р№ С…СѓРґРѕР¶РµСЃС‚РІРµРЅРЅС‹Р№ РѕС‚РІРµС‚ (Р±РµР· Р»РёС€РЅРёС… РёРЅСЃС‚СЂСѓРєС†РёР№).<br>
                            2. РњРѕРґ РЅРµР·Р°РјРµС‚РЅРѕ РґРµР»Р°РµС‚ РІС‚РѕСЂРѕР№, "С‚РёС…РёР№" Р·Р°РїСЂРѕСЃ СЃ РјРёРЅРёРјР°Р»СЊРЅС‹Рј РєРѕРЅС‚РµРєСЃС‚РѕРј РґР»СЏ РёР·РІР»РµС‡РµРЅРёСЏ СЃС‚Р°С‚РѕРІ Рё РїСЂРѕС‡РµРіРѕ.<br>
                            <span style="color:#52e0a3;">Р РµР·СѓР»СЊС‚Р°С‚: РѕРіСЂРѕРјРЅР°СЏ СЌРєРѕРЅРѕРјРёСЏ РєРѕРЅС‚РµРєСЃС‚Р° Рё РЅРёРєР°РєРёС… СЃР»РѕРјР°РЅРЅС‹С… РѕС‚РІРµС‚РѕРІ Р±РѕС‚Р°!</span>
                        </div>
                        <div style="border-top:1px solid var(--nhud-border);padding-top:12px;margin-top:8px;">
                            <div class="nhud-section-hint">РџР°СЂР°РјРµС‚СЂС‹ Р·Р°РїСЂРѕСЃР°:</div>
                            <div class="nhud-field-group"><label>РЎРѕРѕР±С‰РµРЅРёР№ РєРѕРЅС‚РµРєСЃС‚Р°</label><input id="nhud-context-messages" class="nhud-input" type="number" min="1" max="50" style="width:80px;" /></div>
                            <div class="nhud-field-group"><label>РњР°РєСЃ. С‚РѕРєРµРЅРѕРІ РѕС‚РІРµС‚Р°</label><input id="nhud-max-tokens" class="nhud-input" type="number" min="100" max="8000" style="width:100px;" /></div>
                            <div class="nhud-field-group"><label>РўРµРјРїРµСЂР°С‚СѓСЂР° (0.0 вЂ” 2.0)</label><input id="nhud-temperature" class="nhud-input" type="number" min="0" max="2" step="0.1" style="width:80px;" /></div>
                        </div>

                        <h4 style="color:#d05070; margin-top:20px; border-top:1px solid var(--nhud-border); padding-top:15px;">рџ”Ќ РџР°СЂСЃРµСЂ JSON</h4>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-parser-enabled" type="checkbox" /><label for="nhud-parser-enabled">Р’РєР»СЋС‡РёС‚СЊ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРёР№ РїР°СЂСЃРёРЅРі JSON</label></div>
                        <div class="nhud-field-group"><label>РћС‚РєСЂС‹РІР°СЋС‰РёР№ С‚РµРі</label><input id="nhud-parser-open-tag" class="nhud-input" type="text" placeholder="[NHUD]" /></div>
                        <div class="nhud-field-group"><label>Р—Р°РєСЂС‹РІР°СЋС‰РёР№ С‚РµРі</label><input id="nhud-parser-close-tag" class="nhud-input" type="text" placeholder="[/NHUD]" /></div>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-parser-auto-remove" type="checkbox" /><label for="nhud-parser-auto-remove">РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРё СѓРґР°Р»СЏС‚СЊ С‚РµРіРё РёР· СЃРѕРѕР±С‰РµРЅРёР№</label></div>
                        <div class="nhud-field-group"><button id="nhud-parser-test" class="nhud-add-btn">рџ”Ќ РўРµСЃС‚ РїР°СЂСЃРµСЂР°</button></div>
                    </div>

                    <div class="nhud-tab-content" data-tab="storage">
                        <div class="nhud-field-group">
                            <label>РЎС‚Р°С‚РёСЃС‚РёРєР° С‚РµРєСѓС‰РµРіРѕ С‡Р°С‚Р°</label>
                            <div id="nhud-storage-stats" class="nhud-stats-box" style="background:rgba(0,0,0,0.3); border:1px solid var(--nhud-border); padding:10px; border-radius:4px;"><div>Р—Р°РіСЂСѓР·РєР°...</div></div>
                        </div>
                        <div class="nhud-field-group">
                            <label>Р­РєСЃРїРѕСЂС‚ / РРјРїРѕСЂС‚</label>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                <button id="nhud-export-btn" class="nhud-add-btn" style="background:#2a101a; border-color:#5a2035;">рџ“¤ Р­РєСЃРїРѕСЂС‚ С‡Р°С‚Р°</button>
                                <label class="nhud-add-btn" style="cursor:pointer; background:#2a101a; border-color:#5a2035;">рџ“Ґ РРјРїРѕСЂС‚<input id="nhud-import-file" type="file" accept=".json" style="display:none;" /></label>
                            </div>
                        </div>
                        <div class="nhud-field-group" style="margin-top:16px;border-top:1px dashed var(--nhud-border);padding-top:12px;">
                            <label>РћС‡РёСЃС‚РєР°</label>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                <button id="nhud-smart-clean-btn" class="nhud-send-btn" style="padding:6px 12px; border:1px solid #5040a0; background:rgba(80,60,140,0.3);">рџ§  РЈРјРЅР°СЏ РѕС‡РёСЃС‚РєР°</button>
                                <button id="nhud-clear-chat-btn" class="nhud-s-delete" style="padding:6px 12px; border:1px solid #802030;">рџ—‘пёЏ РўРµРєСѓС‰РёР№ С‡Р°С‚</button>
                                <button id="nhud-clear-all-btn" class="nhud-s-delete" style="padding:6px 12px; border:1px solid #802030; background:#401015;">вљ пёЏ Р’СЃРµ С‡Р°С‚С‹</button>
                            </div>
                            <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #802030;">
                                <div style="font-size:11px; color:#a08080; margin-bottom:6px;">вљ пёЏ РџРѕР»РЅС‹Р№ СЃР±СЂРѕСЃ вЂ” СѓРґР°Р»СЏРµС‚ Р’РЎР• РЅР°СЃС‚СЂРѕР№РєРё РјРѕРґР° (РїСЂРѕРјС‚С‹, РґРёР·Р°Р№РЅ, РјРѕРґСѓР»Рё) РґРѕ Р·Р°РІРѕРґСЃРєРёС…. Р”Р°РЅРЅС‹Рµ С‡Р°С‚РѕРІ СЃРѕС…СЂР°РЅСЏС‚СЃСЏ.</div>
                                <button id="nhud-factory-reset-btn" class="nhud-s-delete" style="padding:6px 12px; border:2px solid #e05252; background:#500010; color:#ffaaaa; font-weight:bold; width:100%;">рџ”ґ РЎР±СЂРѕСЃ РґРѕ Р·Р°РІРѕРґСЃРєРёС… РЅР°СЃС‚СЂРѕРµРє</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `);

    $("#nhud-settings-tabs").off("click").on("click", ".nhud-tab", function() {
        const tab = $(this).data("tab");
        $(".nhud-tab").css({ color: "var(--nhud-text-muted, #a08080)", fontWeight: "normal" });
        $(this).css({ color: "var(--nhud-text-main, #e0c0c0)", fontWeight: "bold" });
        $(".nhud-tab-content").removeClass("active-tab");
        $(`.nhud-tab-content[data-tab="${tab}"]`).addClass("active-tab");
        
        if (tab === "trackers") { renderSettingsFactions(); renderSettingsHeroSheet(); }
        if (tab === "property") { renderSettingsTrackers(); if (typeof renderSettingsProperty === 'function') renderSettingsProperty(); }
        if (tab === "journal") { renderSettingsQuests(); renderSettingsCodex(); renderSettingsCalendar(); }
        if (tab === "storage") renderStorageStats();
        if (tab === "characters") renderSettingsCharacterAccordion();
        if (tab === "api") { renderSettingsProfileSelect(); renderParserSettings(); }
        if (tab === "halloffame") renderHallOfFame();
    });

    // Р‘РёРЅРґС‹ РєРЅРѕРїРѕРє РРјСѓС‰РµСЃС‚РІР°
    $("#nhud-add-estate").on("click", () => {
        const inv = getSettings().chatData[NarrativeStorage.getCurrentChatId()]?.inventory;
        if (inv) { inv.estate.push({ name: "РќРѕРІР°СЏ РЅРµРґРІРёР¶РёРјРѕСЃС‚СЊ", desc: "", bgUrl: "" }); saveSettingsDebounced(); if(typeof renderPropertyCards === 'function') renderPropertyCards('estate'); }
    });
    
    $("#nhud-add-vehicle").on("click", () => {
        const inv = getSettings().chatData[NarrativeStorage.getCurrentChatId()]?.inventory;
        if (inv) { inv.vehicles.push({ name: "РќРѕРІС‹Р№ С‚СЂР°РЅСЃРїРѕСЂС‚", desc: "", bgUrl: "" }); saveSettingsDebounced(); if(typeof renderPropertyCards === 'function') renderPropertyCards('vehicles'); }
    });

    // Р’СЃРµ СЃС‚Р°СЂС‹Рµ Р±РёРЅРґС‹...
    $("#nhud-settings-close").on("click", closeSettingsPanel);
    $("#nhud-settings-profile-select").on("change", function() { const settings = getSettings(); const val = $(this).val(); settings.activeProfile = val === "__quiet__" ? null : val; settings.useSTProfile = val !== "__quiet__"; saveSettingsDebounced(); renderSettingsProfileSelect(); });
    $("#nhud-prompt-system").on("input",   e => { getSettings().prompts.system   = e.target.value; saveSettingsDebounced(); });
    $("#nhud-prompt-language").on("input", e => { getSettings().prompts.language = e.target.value; saveSettingsDebounced(); });
    $("#nhud-auto-send").on("change",      e => { getSettings().autoSend = e.target.checked; saveSettingsDebounced(); });
    $("#nhud-send-with-main").on("change", e => { getSettings().requestSettings.sendWithMain = e.target.checked; saveSettingsDebounced(); });
    $("#nhud-light-mode").on("change",     e => { const settings = getSettings(); const isLight = e.target.checked; settings.requestSettings.lightMode = isLight; if (isLight && !settings.useSTProfile) { const profiles = getSTProfiles(); if (profiles.length > 0) { settings.activeProfile = profiles[0].name; settings.useSTProfile = true; toastr.info(`РџСЂРѕС„РёР»СЊ РёР·РјРµРЅРµРЅ РЅР° ${profiles[0].name}`, "вљЎ Р›Р°Р№С‚-СЂРµР¶РёРј"); } else { toastr.warning("Р”Р»СЏ Р›Р°Р№С‚-СЂРµР¶РёРјР° С‚СЂРµР±СѓРµС‚СЃСЏ СЃРѕР·РґР°С‚СЊ API РїСЂРѕС„РёР»СЊ!", "Р’РЅРёРјР°РЅРёРµ"); } } saveSettingsDebounced(); renderSettingsProfileSelect(); });
    $("#nhud-context-messages").on("input",e => { getSettings().requestSettings.contextMessages = parseInt(e.target.value)||10; saveSettingsDebounced(); });
    $("#nhud-max-tokens").on("input",      e => { getSettings().requestSettings.maxTokens = parseInt(e.target.value)||2000; saveSettingsDebounced(); });
    $("#nhud-temperature").on("input",     e => { getSettings().requestSettings.temperature = parseFloat(e.target.value)||0.7; saveSettingsDebounced(); });
    $("#nhud-add-tracker").off("click").on("click", () => { const trackers = getChatTrackers(); trackers.push({ id: `tracker_${Date.now()}`, label: "РќРѕРІС‹Р№", max: 100, color: "#52b8e0" }); saveSettingsDebounced(); renderSettingsTrackers(); renderTrackers(); });
    $("#nhud-add-prompt-block").on("click", () => { const s = getSettings(); const id = `block_${Date.now()}`; s.promptBlocks.push({ id, label: "РќРѕРІС‹Р№ Р±Р»РѕРє", prompt: "", enabled: true }); saveSettingsDebounced(); renderPromptBlocks(); renderInfoBlockButtons(); });
    $("#nhud-parser-enabled").on("change", e => { getSettings().jsonParser.enabled = e.target.checked; saveSettingsDebounced(); });
    $("#nhud-parser-open-tag").on("input", e => { getSettings().jsonParser.openTag = e.target.value; saveSettingsDebounced(); });
    $("#nhud-parser-close-tag").on("input", e => { getSettings().jsonParser.closeTag = e.target.value; saveSettingsDebounced(); });
    $("#nhud-parser-auto-remove").on("change", e => { getSettings().jsonParser.autoRemoveTags = e.target.checked; saveSettingsDebounced(); });
    
    $("#nhud-parser-test").on("click", () => {
        const testText = prompt("Р’РІРµРґРёС‚Рµ С‚РµРєСЃС‚ СЃ JSON РґР»СЏ С‚РµСЃС‚Р°:", "[NHUD]\\n{\\n  \\\"trackers\\\": {\\n    \\\"health\\\": 85\\n  }\\n}\\n[/NHUD]");
        if (!testText) return; const settings = getSettings(); const jsonData = parseJsonFromMessage(testText, settings.jsonParser.openTag, settings.jsonParser.closeTag);
        if (jsonData) alert("вњ… JSON РЅР°Р№РґРµРЅ:\\n" + JSON.stringify(jsonData, null, 2)); else alert("вќЊ JSON РЅРµ РЅР°Р№РґРµРЅ РёР»Рё РЅРµРІР°Р»РёРґРЅС‹Р№");
    });
    
    $("#nhud-export-btn").on("click", () => { const data = NarrativeStorage.exportChatBlocks(); if (!data) { toastr.warning("РќРµС‚ РґР°РЅРЅС‹С… РґР»СЏ СЌРєСЃРїРѕСЂС‚Р°"); return; } const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `narrative-hud-${data.chatId || 'chat'}.json`; a.click(); URL.revokeObjectURL(url); toastr.success("Р­РєСЃРїРѕСЂС‚ Р·Р°РІРµСЂС€С‘РЅ"); });
    $("#nhud-import-file").on("change", function() { const file = this.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const data = JSON.parse(e.target.result); NarrativeStorage.importChatBlocks(data.chatId || NarrativeStorage.getCurrentChatId(), data); toastr.success("РРјРїРѕСЂС‚ Р·Р°РІРµСЂС€С‘РЅ"); updateHistoryButtons(); renderStorageStats(); } catch(err) { toastr.error("РћС€РёР±РєР° РёРјРїРѕСЂС‚Р°: " + err.message); } }; reader.readAsText(file); });
    $("#nhud-smart-clean-btn").on("click", () => { if (typeof openSmartCleaner === 'function') openSmartCleaner(); });
    $("#nhud-clear-chat-btn").on("click", () => { if (!confirm("РћС‡РёСЃС‚РёС‚СЊ РІСЃРµ Р±Р»РѕРєРё РІ С‚РµРєСѓС‰РµРј С‡Р°С‚Рµ?")) return; NarrativeStorage.deleteCurrentChat(); updateHistoryButtons(); renderStorageStats(); toastr.success("Р”Р°РЅРЅС‹Рµ С‚РµРєСѓС‰РµРіРѕ С‡Р°С‚Р° РѕС‡РёС‰РµРЅС‹"); });
    $("#nhud-clear-all-btn").on("click", () => { if (!confirm("вљ пёЏ РћС‡РёСЃС‚РёС‚СЊ Р’РЎР• РґР°РЅРЅС‹Рµ РІСЃРµС… С‡Р°С‚РѕРІ?")) return; NarrativeStorage.purgeAllData(); updateHistoryButtons(); renderStorageStats(); toastr.success("Р’СЃРµ РґР°РЅРЅС‹Рµ РѕС‡РёС‰РµРЅС‹"); });

    $("#nhud-factory-reset-btn").on("click", () => {
    if (!confirm("вљ пёЏ РџРћР›РќРћР• РЈРќРР§РўРћР–Р•РќРР• Р’РЎР•РҐ Р”РђРќРќР«РҐ РњРћР”Рђ?\n\nР‘СѓРґСѓС‚ СѓРґР°Р»РµРЅС‹:\nвЂ” Р’СЃРµ РЅР°СЃС‚СЂРѕР№РєРё (РїСЂРѕРјРїС‚С‹, РґРёР·Р°Р№РЅ, РјРѕРґСѓР»Рё)\nвЂ” Р’СЃРµ РґР°РЅРЅС‹Рµ С‡Р°С‚РѕРІ (РїРµСЂСЃРѕРЅР°Р¶Рё, С‚СЂРµРєРµСЂС‹, РєРІРµСЃС‚С‹)\nвЂ” Р’РµСЃСЊ РїСЂРѕРіСЂРµСЃСЃ РІРѕ РІСЃРµС… С‡Р°С‚Р°С…\n\nР’РѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ РќР•Р’РћР—РњРћР–РќРћ.\n\nРџСЂРѕРґРѕР»Р¶РёС‚СЊ?")) return;
    if (!confirm("Р’С‹ С‚РѕС‡РЅРѕ СѓРІРµСЂРµРЅС‹? Р­С‚Рѕ РЅРµР»СЊР·СЏ РѕС‚РјРµРЅРёС‚СЊ.")) return;

    import('../core/constants.js').then(({ extensionName }) => {
        import('../../../../extensions.js').then(({ extension_settings }) => {
            import('../../../../../script.js').then(({ saveSettingsDebounced }) => {
                // РџРѕР»РЅРѕРµ СѓРЅРёС‡С‚РѕР¶РµРЅРёРµ вЂ” СѓРґР°Р»СЏРµРј РІРµСЃСЊ РѕР±СЉРµРєС‚ СЂР°СЃС€РёСЂРµРЅРёСЏ
                delete extension_settings[extensionName];
                
                // Р§РёСЃС‚РёРј localStorage РЅР° РІСЃСЏРєРёР№ СЃР»СѓС‡Р°Р№
                try {
                    Object.keys(localStorage).forEach(key => {
                        if (key.includes('narrative') || key.includes('nhud')) {
                            localStorage.removeItem(key);
                        }
                    });
                } catch(e) {}

                // РЎРѕС…СЂР°РЅСЏРµРј РїСѓСЃС‚РѕС‚Сѓ РЅР° РґРёСЃРє
                saveSettingsDebounced();

                toastr.warning("Р”Р°РЅРЅС‹Рµ СѓРЅРёС‡С‚РѕР¶РµРЅС‹. РџРµСЂРµР·Р°РіСЂСѓР·РєР°...", "рџ’Ґ РџРѕР»РЅС‹Р№ СЃР±СЂРѕСЃ", { timeOut: 2000 });

                // РџРµСЂРµР·Р°РіСЂСѓР¶Р°РµРј СЃС‚СЂР°РЅРёС†Сѓ С‡РµСЂРµР· 2 СЃРµРєСѓРЅРґС‹
                setTimeout(() => location.reload(), 2000);
            });
        });
    });
});
    
    $("#nhud-proxy-instruction-btn").hover(function() { $(this).css("background", "rgba(224, 82, 82, 0.25)"); }, function() { $(this).css("background", "rgba(224, 82, 82, 0.15)"); }).on("click", () => {
        $("#nhud-custom-proxy-modal").remove();
        const html = `
            <div id="nhud-custom-proxy-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box; backdrop-filter:blur(3px);">
                <div style="background:#151220; border:1px solid #e05252; border-radius:8px; padding:20px; max-width:500px; width:100%; max-height:85vh; overflow-y:auto; position:relative; box-shadow:0 10px 40px rgba(0,0,0,0.8);">
                    <button id="nhud-close-proxy-modal" style="position:absolute; top:10px; right:15px; background:none; border:none; color:#a08080; font-size:22px; cursor:pointer; transition:0.2s;" onmouseover="this.style.color='#e05252'" onmouseout="this.style.color='#a08080'">вњ•</button>
                    <h3 style="color:#e05252; margin-top:0; font-size:1.2em; padding-right:20px;">РќР°СЃС‚СЂРѕР№РєР° СЃС‚РѕСЂРѕРЅРЅРёС… API</h3>
                    <p style="font-size:0.95em; color:var(--nhud-text-main);">РР·-Р·Р° РѕСЃРѕР±РµРЅРЅРѕСЃС‚РµР№ СЂР°Р±РѕС‚С‹ РўР°РІРµСЂРЅС‹, РґР»СЏ РєРѕСЂСЂРµРєС‚РЅРѕР№ РјР°СЂС€СЂСѓС‚РёР·Р°С†РёРё Р·Р°РїСЂРѕСЃРѕРІ СЂР°СЃС€РёСЂРµРЅРёСЏ РЅРµРѕР±С…РѕРґРёРјРѕ СЃРѕР·РґР°С‚СЊ РѕС‚РґРµР»СЊРЅС‹Р№ РїСЂРѕС„РёР»СЊ:</p>
                    <ol style="padding-left:20px; color:#c0b0d8; font-size:0.95em; line-height:1.6;">
                        <li style="margin-bottom:8px;">Р’ РіР»Р°РІРЅРѕРј РјРµРЅСЋ API РІС‹Р±РµСЂРёС‚Рµ <b>Chat Completion -> OpenAI</b></li>
                        <li style="margin-bottom:8px;">Р Р°Р·РІРµСЂРЅРёС‚Рµ РІРєР»Р°РґРєСѓ <b>РџСЂРѕРєСЃРё</b>. РќР°Р·РѕРІРёС‚Рµ РїСЂРµСЃРµС‚, РІСЃС‚Р°РІСЊС‚Рµ СЃСЃС‹Р»РєСѓ РЅР° РїСЂРѕРєСЃРё (РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ СЃ <code>/v1</code> РЅР° РєРѕРЅС†Рµ) Рё РІР°С€ РєР»СЋС‡.</li>
                        <li style="margin-bottom:8px; color:#52e0a3; font-weight:bold;">РћР‘РЇР—РђРўР•Р›Р¬РќРћ: РќР°Р¶РјРёС‚Рµ РёРєРѕРЅРєСѓ РґРёСЃРєРµС‚С‹ (рџ’ѕ) РґР»СЏ РЎРћРҐР РђРќР•РќРРЇ РџР Р•РЎР•РўРђ РџР РћРљРЎР!</li>
                        <li style="margin-bottom:8px;">РЎРІРµСЂРЅРёС‚Рµ РІРєР»Р°РґРєСѓ РџСЂРѕРєСЃРё.</li>
                        <li style="margin-bottom:8px;">РџРѕСЃС‚Р°РІСЊС‚Рµ РіР°Р»РѕС‡РєСѓ <b>В«РџРѕРєР°Р·Р°С‚СЊ "СЃС‚РѕСЂРѕРЅРЅРёРµ" РјРѕРґРµР»Рё (РїСЂРµРґРѕСЃС‚Р°РІР»РµРЅРЅС‹Рµ API)В»</b>.</li>
                        <li style="margin-bottom:8px;">Р’ СЃРїРёСЃРєРµ РјРѕРґРµР»РµР№ РїСЂРѕР»РёСЃС‚Р°Р№С‚Рµ РІРЅРёР· Рё РІС‹Р±РµСЂРёС‚Рµ РЅСѓР¶РЅСѓСЋ РјРѕРґРµР»СЊ РІР°С€РµРіРѕ РїСЂРѕРєСЃРё.</li>
                        <li style="margin-bottom:8px;">РЎРѕС…СЂР°РЅРёС‚Рµ СЃР°Рј РїСЂРѕС„РёР»СЊ (РєРЅРѕРїРєР° СЃРІРµСЂС…Сѓ).</li>
                    </ol>
                    <p style="color:#52a8e0; font-weight:bold; text-align:center; margin-bottom:0; font-size:0.95em; background:rgba(82,168,224,0.1); padding:10px; border-radius:4px;">Р’С‹ РІРµР»РёРєРѕР»РµРїРЅС‹! РџРѕСЃР»Рµ СЌС‚РѕРіРѕ РїСЂРµСЃРµС‚ РјРѕР¶РЅРѕ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ РІ СЂР°СЃС€РёСЂРµРЅРёРё!</p>
                </div>
            </div>
        `;
        $("body").append(html);
        $("#nhud-close-proxy-modal").on("click", () => $("#nhud-custom-proxy-modal").fadeOut(200, function() { $(this).remove(); }));
        $("#nhud-custom-proxy-modal").on("click", function(e) { if (e.target === this) $(this).fadeOut(200, function() { $(this).remove(); }); });
    });

    renderSettingsTrackers();
    renderSettingsCharacterAccordion();
    renderSettingsProfileSelect();
    renderSettingsPrompts();
    renderPromptBlocks();
    renderParserSettings();
    renderSettingsFactions();
    renderSettingsHeroSheet();
    if (typeof renderSettingsProperty === 'function') renderSettingsProperty();
    
    const chatObserver = new ResizeObserver(() => updateSettingsPosition());
    const chatEl = document.getElementById("chat");
    if (chatEl) chatObserver.observe(chatEl);
    
    updateSettingsPosition();
}


