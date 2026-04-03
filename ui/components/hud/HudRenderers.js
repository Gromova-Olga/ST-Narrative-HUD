// ui/components/hud/HudRenderers.js
// Вынесено из _UIManager.internal.js (render-функции HUD)

import { getSettings, getLive, getChatTrackers, getTrackerValue } from '../../../core/StateManager.js';
import { formatPopupText } from '../../../utils/formatting/PopupFormatter.js';
import { getContext, getUserName, getCharAvatar } from '../../../integration/STContextProvider.js';
import { findCharacterKey } from '../../../systems/characters/CharacterMatcher.js';
import { saveSettingsDebounced } from '../../../../../../script.js';

const getSTContext = getContext;
const getCharName = () => getContext().name2 || '';
function showStatus(msg, type) { const el = document.getElementById('nhud-api-status'); if (el) { el.textContent = msg; el.setAttribute('data-type', type || 'info'); } }
function getSTProfiles() { return getContext().extensionSettings?.connectionManager?.profiles || []; }

export function renderInfoBlockButtons() {
    const settings = getSettings();
    const container = $("#nhud-infoblock-buttons");
    container.empty();
    settings.promptBlocks.filter(b => b.enabled).forEach(block => {
        container.append(`<button class="nhud-info-btn" data-block="${block.id}">${block.label}</button>`);
    });
    
    const live = getLive();
    const hasNewBlocks = settings.promptBlocks.some(b => b.enabled && live.infoBlocks[b.id] === undefined);
    if (hasNewBlocks) showStatus("вљ пёЏ РќРѕРІС‹Рµ Р±Р»РѕРєРё вЂ” РЅР°Р¶РјРё в–¶", "info");
}

export function renderProfileSelect() {
    const settings = getSettings();
    const sel = $("#nhud-profile-select");
    sel.empty();
    const isLight = settings.requestSettings?.lightMode;
    
    if (isLight) sel.append(`<option value="__quiet__" disabled>вќЊ ST (Р‘Р»РѕРє)</option>`);
    else sel.append(`<option value="__quiet__" ${!settings.useSTProfile ? 'selected' : ''}>рџ”„ ST</option>`);
    
    getSTProfiles().forEach(p => {
        const selected = settings.useSTProfile && settings.activeProfile === p.name ? 'selected' : '';
        const shortName = p.name.length > 12 ? p.name.substring(0, 12) + 'вЂ¦' : p.name;
        sel.append(`<option value="${p.name}" ${selected}>${shortName}</option>`);
    });

    import('./SettingsUI.js').then(m => {
        if(m.renderSettingsProfileSelect) m.renderSettingsProfileSelect();
    }).catch(()=>{});
    
    if (typeof renderMiniConn === 'function') renderMiniConn();
}

export function renderInfoBlocks() {
    const live = getLive();
    const dtBar = $("#nhud-datetime-bar");
    if (!dtBar.length) return;
    
    const time = live.infoBlocks.datetime || "";
    const loc = live.infoBlocks.location || "";
    const weath = live.infoBlocks.weather || "";
    
    // РћС‚СЂРёСЃРѕРІС‹РІР°РµРј РєР°СЂС‚РѕС‡РєСѓ
    if (time || loc || weath) {
        let html = `<div style="display:flex; flex-direction:column; gap:6px; font-size:12px; padding:4px 0;">`;
        if (loc) html += `<div style="color:#e0d0a0; font-weight:bold; text-transform:uppercase; letter-spacing:1px; text-shadow:0 0 5px rgba(224,208,160,0.2);">рџ“Ќ ${loc}</div>`;
        
        let subHtml = [];
        if (weath) subHtml.push(`рџЊ¤пёЏ <span style="color:#b0c0e0;">${weath}</span>`);
        if (time) subHtml.push(`рџ•°пёЏ <span style="color:#c0a0b0;">${time}</span>`);
        
        if (subHtml.length > 0) {
            html += `<div style="font-size:11px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">${subHtml.join('')}</div>`;
        }
        html += `</div>`;
        
        dtBar.html(html).show();
        
        // Р—Р°РїСѓСЃРєР°РµРј СЃРјРµРЅСѓ Р°С‚РјРѕСЃС„РµСЂС‹ РїР°РЅРµР»Рё
        applyAtmosphere(weath, time);
    } else { 
        dtBar.hide(); 
    }

    const popup = $("#nhud-infoblock-popup");
    if (popup.is(":visible")) {
        const current = popup.attr("data-current");
        if (current) $("#nhud-infoblock-popup-content").html(formatPopupText(live.infoBlocks[current]));
    }
}

// === Р¤СѓРЅРєС†РёСЏ РґР»СЏ Р°С‚РјРѕСЃС„РµСЂРЅРѕР№ РїРµСЂРµРєСЂР°СЃРєРё РїР°РЅРµР»Рё ===
function applyAtmosphere(weather, time) {
    const sidebar = $("#narrative-hud-sidebar");
    if (!sidebar.length) return;
    
    const w = (weather + " " + time).toLowerCase();
    let shadow = "none";
    let borderColor = "var(--nhud-border)";
    
    if (w.includes("РґРѕР¶РґСЊ") || w.includes("rain") || w.includes("С€С‚РѕСЂРј") || w.includes("Р»РёРІРµРЅСЊ")) {
        shadow = "inset 0 0 70px rgba(20, 40, 70, 0.4)"; 
        borderColor = "#2a4a6a";
    } else if (w.includes("РЅРѕС‡СЊ") || w.includes("night") || w.includes("РїРѕР»РЅРѕС‡СЊ") || w.includes("dark")) {
        shadow = "inset 0 0 90px rgba(0, 0, 0, 0.85)"; 
        borderColor = "#1a1a25";
    } else if (w.includes("СЃРѕР»РЅС†") || w.includes("sun") || w.includes("РґРµРЅСЊ") || w.includes("СЏСЃРЅРѕ")) {
        shadow = "inset 0 0 50px rgba(255, 180, 80, 0.08)"; 
        borderColor = "#6a3a2a";
    } else if (w.includes("СЃРЅРµРі") || w.includes("snow") || w.includes("Р·РёРјР°") || w.includes("РјРѕСЂРѕР·")) {
        shadow = "inset 0 0 60px rgba(200, 220, 255, 0.15)"; 
        borderColor = "#4a6a8a";
    }
    
    sidebar.css({
        "box-shadow": shadow + ", -5px 0 25px rgba(0,0,0,0.8)",
        "border-left-color": borderColor,
        "transition": "box-shadow 2.5s ease, border-color 2.5s ease"
    });
}

// в”Ђв”Ђв”Ђ Trackers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
export function renderTrackers() {
    const trackers = getChatTrackers();
    const container = $("#nhud-trackers-list");
    container.empty();
    const settings = getSettings();
    const isDynamic = settings.design?.barDynamic !== false;

    trackers.forEach(tracker => {
        const value = getTrackerValue(tracker.id);
        const pct = Math.round((value / tracker.max) * 100);
        const barStyle = isDynamic 
            ? `width:${pct}%; background: color-mix(in srgb, var(--nhud-bar-start) ${pct}%, var(--nhud-bar-end));`
            : `width:${pct}%; background: ${tracker.color};`;

        container.append(`
            <div class="nhud-tracker-row" data-id="${tracker.id}">
                <div class="nhud-tracker-label" title="${tracker.label}">${tracker.label}</div>
                <div class="nhud-tracker-bar-wrap"><div class="nhud-tracker-bar" style="${barStyle}"></div></div>
                <div class="nhud-tracker-value">${value}/${tracker.max}</div>
            </div>
        `);
    });
}

export function renderRelationships() {
    const live = getLive();
    const settings = getSettings();
    let container = $("#nhud-relationships-list");
    
    if (!container.length) {
        $("#nhud-trackers-section").css({"max-height": "30vh", "overflow-y": "auto", "padding-right": "4px"});
        $("#nhud-trackers-section").after(`
            <div class="nhud-divider"></div>
            <div id="nhud-relationships-section" style="max-height: 25vh; overflow-y: auto; padding-right:4px;">
                <div id="nhud-relationships-list" style="display: flex; flex-direction: column; gap: 7px;"></div>
            </div>
        `);
        container = $("#nhud-relationships-list");
    }

    container.empty();
    const userName = getUserName();
    const charNames = Object.keys(live.characters).filter(name => 
        name.toLowerCase() !== userName.toLowerCase() && 
        !name.toLowerCase().includes('system') && 
        !live.characters[name].ignoreRelationship &&
        !live.characters[name].isHiddenFromScene
    );

    if (!charNames.length) return;

    container.append('<div style="font-size:0.65em; color:#8060a0; font-weight:bold; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px;">РўСЂРµРєРµСЂ РѕС‚РЅРѕС€РµРЅРёР№</div>');

    charNames.forEach(name => {
        const char = live.characters[name];
        const rel = char.relationship !== undefined ? char.relationship : 50;
        const pct = Math.max(0, Math.min(100, rel));

        let color = "#a090c0";
        if (pct < 30) color = "#e05252";
        else if (pct < 45) color = "#e0a352";
        else if (pct >= 80) color = "#e052a8";
        else if (pct >= 60) color = "#52e0a3";

        const isDynamic = settings.design?.barDynamic !== false;
        const barStyle = isDynamic 
            ? `width:${pct}%; background: color-mix(in srgb, var(--nhud-bar-start) ${pct}%, var(--nhud-bar-end));`
            : `width:${pct}%; background: ${color};`;

        container.append(`
            <div class="nhud-tracker-row">
                <div class="nhud-tracker-label" title="${name}">${name}</div>
                <div class="nhud-tracker-bar-wrap"><div class="nhud-tracker-bar" style="${barStyle}"></div></div>
                <div class="nhud-tracker-value">${pct}/100</div>
            </div>
        `);
    }); 
    if (typeof renderMiniSims === 'function') renderMiniSims(); 
}

// в”Ђв”Ђв”Ђ Characters в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
export function renderCharacters() {
    const settings = getSettings();
    const live = getLive();
    const container = $("#nhud-characters-list");
    container.empty();
    
    const userName = getUserName();
    const charName = getCharName();

    const normalizedChars = {};
    Object.entries(live.characters).forEach(([key, value]) => {
        const normalizedKey = findCharacterKey(normalizedChars, key) || key;
        if (!normalizedChars[normalizedKey]) normalizedChars[normalizedKey] = value;
        else normalizedChars[normalizedKey] = { ...normalizedChars[normalizedKey], ...value };
    });
    
    if (Object.keys(normalizedChars).length !== Object.keys(live.characters).length) {
        live.characters = normalizedChars;
        saveSettingsDebounced();
    }

    const charNames = Object.keys(live.characters).filter(name => 
        name.toLowerCase() !== userName.toLowerCase() && 
        !name.toLowerCase().includes('system') &&
        !live.characters[name].isHiddenFromScene
    );

    if (!charNames.length) {
        container.append(`<div class="nhud-no-chars" style="color:#a08080; font-size:11px; text-align:center;">РќРµС‚ РїРµСЂСЃРѕРЅР°Р¶РµР№ РІ СЌС‚РѕРј С‡Р°С‚Рµ</div>`);
        return;
    }

    const sorted = charNames.sort((a, b) => {
        if (a.toLowerCase() === charName.toLowerCase()) return -1;
        if (b.toLowerCase() === charName.toLowerCase()) return 1;
        return a.localeCompare(b);
    });

    const tMode = settings.ui?.thoughtsMode || "individual";
    let unifiedThoughtsContent = "";

    sorted.forEach((name, idx) => {
        const liveData = live.characters[name];
        const globalChar = settings.characters.find(c => c.name && c.name.toLowerCase() === name.toLowerCase()) || {};
        
        const avatarHtml = globalChar.avatar 
            ? `<img src="${globalChar.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'"/>`
            : `<div style="width:100%;height:100%;background:#1a1628;color:#6060a0;display:flex;align-items:center;justify-content:center;font-weight:bold;border-radius:4px;">${name[0].toUpperCase()}</div>`;

        const showEmoji = settings.design?.showStatusEmojis !== false;
        const outfit = liveData.outfit ? `<div style="font-size:0.75em; color:#8080a0; margin-top:2px;">${showEmoji ? 'рџ‘— ' : ''}${liveData.outfit}</div>` : '';
        const state = liveData.state ? `<div style="font-size:0.75em; color:#a0a090; margin-top:2px;">${showEmoji ? 'рџЋ­ ' : ''}${liveData.state}</div>` : '';
        const formattedThoughts = liveData.thoughts ? formatPopupText(liveData.thoughts) : '';

        if (tMode === "unified" && liveData.thoughts) {
             unifiedThoughtsContent += `
                <div style="margin-bottom:12px; border-left:2px solid var(--nhud-accent); padding-left:8px;">
                    <div style="color:var(--nhud-text-main); font-weight:bold; margin-bottom:4px;">${name}</div>
                    <div style="font-size:0.9em; color:var(--nhud-text-muted);">${formattedThoughts}</div>
                </div>`;
        }

        const individualThoughtsHtml = (tMode === "individual" && liveData.thoughts) 
            ? `<div style="margin-top:6px; font-size:0.8em; color:#52a8e0; background:rgba(16,16,21,0.6); border:1px solid #203050; padding:6px; border-radius:4px; border-left:2px solid #52a8e0;">
                 <div style="font-weight:bold; font-size:0.85em; margin-bottom:2px; color:#4288b0;">рџ’­ РњС‹СЃР»Рё:</div>
                 ${formattedThoughts}
               </div>`
            : '';

        const card = $(`
            <div style="display:flex; gap:8px; background:rgba(0,0,0,0.2); border:1px solid var(--nhud-border); border-radius:6px; padding:6px;">
                <div style="width:36px; height:36px; flex-shrink:0;">${avatarHtml}</div>
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; font-weight:bold; color:var(--nhud-text-main); font-size:0.9em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${name}
                    </div>
                    ${outfit}
                    ${state}
                    ${individualThoughtsHtml}
                </div>
            </div>
        `);
        container.append(card);
    });

    if (tMode === "unified" && unifiedThoughtsContent) {
        const unifiedBtn = $(`<button class="nhud-info-btn" style="width:100%; margin-bottom:8px; background:rgba(82, 168, 224, 0.15); border:1px solid #3a5a80; color:#80b0e0; border-radius:4px; padding:4px; cursor:pointer; font-weight:bold; transition:0.2s;">рџ’­ РЎРІРѕРґРєР° РјС‹СЃР»РµР№</button>`);
        
        unifiedBtn.hover(
            function() { $(this).css("background", "rgba(82, 168, 224, 0.3)"); },
            function() { $(this).css("background", "rgba(82, 168, 224, 0.15)"); }
        );

        unifiedBtn.on('click', function(e) {
            e.stopPropagation();
            const popup = $("#nhud-infoblock-popup");
            const isSame = popup.is(":visible") && popup.attr("data-current") === "unified_thoughts";
            
            const sidebarRect = $("#narrative-hud-sidebar")[0].getBoundingClientRect();
            const btnRect = $(this)[0].getBoundingClientRect();
            popup.css({ top: btnRect.top + "px", left: (sidebarRect.left - parseInt(getComputedStyle(document.body).getPropertyValue('--nhud-prompt-width') || 300) - 10) + "px" });

            if (isSame) {
                popup.fadeOut(150).removeAttr("data-current"); $(".nhud-info-btn").removeClass("active");
            } else {
                $(".nhud-info-btn").removeClass("active"); $(this).addClass("active");
                $("#nhud-infoblock-popup-title").text("РЎРІРѕРґРєР° РјС‹СЃР»РµР№");
                $("#nhud-infoblock-popup-content").html(unifiedThoughtsContent);
                popup.attr("data-current", "unified_thoughts").fadeIn(150);
            }
        });
        container.prepend(unifiedBtn);
    }
