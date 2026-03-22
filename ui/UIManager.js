// ui/UIManager.js
import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../../script.js";
import { extensionName } from "../core/constants.js";
import { NarrativeStorage } from "../storage/NarrativeStorage.js";
import { getSTContext, getUserName, getCharName, showStatus, findCharacterKey, getSTProfiles, formatPopupText } from "../utils/helpers.js";
import { getSettings, getLive, getChatTrackers, getTrackerValue, updateGlobalAvatar } from "../core/StateManager.js";
import { openRelationshipJournal, openAnalyticsPopup } from "./Modals.js";

// === Дизайн-функция: Смешивание цвета, прозрачности и картинки URL ===
function getBgString(hex, alpha, imgUrl) {
    let rgba = `rgba(20, 10, 15, ${alpha})`;
    if (hex && hex.startsWith('#')) {
        let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (imgUrl && imgUrl.trim() !== '') {
        return `linear-gradient(${rgba}, ${rgba}), url('${imgUrl}') center/cover no-repeat`;
    }
    return rgba;
}

// ─── Topbar Icon ─────────────────────────────────────────────────────────
export function buildTopbarIcon() {
    if ($("#nhud-topbar-btn").length) return;
    const btn = $(`<div id="nhud-topbar-btn" class="drawer-icon fa-solid fa-scroll interactable closedIcon" title="Narrative HUD" style="font-size:1.4em;padding:4px 6px;cursor:pointer;"></div>`);
    
    btn.on("click", () => {
        const sidebar = $("#narrative-hud-sidebar");
        if (sidebar.is(":visible")) sidebar.fadeOut(200);
        else sidebar.fadeIn(200);
    });
    
    $("#extensions-settings-button").before(btn);
}

// ─── Sidebar ─────────────────────────────────────────────────────────────
export function buildSidebar() {
    if ($("#narrative-hud-sidebar").length) return;

    const settings = getSettings();
    if (!settings.ui) settings.ui = { widgetPos: { left: "20px", top: "80px" }, hudMode: "screen", hudWidth: 300 };
    const w = settings.ui.hudWidth || 300;

    $("body").append(`
        <div id="narrative-hud-sidebar" style="position:fixed; top:40px; bottom:0; right:0; width:${w}px; z-index:9990; background:var(--nhud-bg, #151220); border-left:1px solid var(--nhud-border, #3a1525); display:flex; flex-direction:column; box-shadow:-5px 0 25px rgba(0,0,0,0.8); padding-top:30px; transition: width 0.3s ease;">
            <button id="nhud-mode-toggle" style="position:absolute; top:8px; left:8px; background:none; border:none; color:var(--nhud-accent, #d05070); font-size:16px; font-weight:bold; cursor:pointer; padding:0; z-index:100; transition:0.2s;">◧</button>
            
            <div style="position:absolute; top:8px; right:8px; z-index:100;">
                <button id="nhud-sidebar-menu-btn" title="Меню HUD" style="background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer; font-size:18px; transition:0.2s; padding: 0 8px;">⋮</button>
                <div id="nhud-sidebar-dropdown" style="display:none; position:absolute; top:24px; right:0; background:var(--nhud-prompt-bg, #1a1015); border:1px solid var(--nhud-border); border-radius:6px; flex-direction:column; padding:4px; gap:2px; box-shadow:0 5px 15px rgba(0,0,0,0.8); width:170px;">
                    <button id="nhud-manual-send" class="nhud-dropdown-item" style="text-align:left; background:none; border:none; color:var(--nhud-text-main); padding:6px 10px; cursor:pointer; font-size:12px; border-radius:4px;"><span style="color:#52a8e0;">▶</span> Обновить данные</button>
                    <button id="nhud-toggle-widget-btn" class="nhud-dropdown-item" style="text-align:left; background:none; border:none; color:var(--nhud-text-main); padding:6px 10px; cursor:pointer; font-size:12px; border-radius:4px;"><span style="color:#e0a352;">🧊</span> Скрыть/Показать виджет</button>
                    <button id="nhud-open-settings" class="nhud-dropdown-item" style="text-align:left; background:none; border:none; color:var(--nhud-text-main); padding:6px 10px; cursor:pointer; font-size:12px; border-radius:4px;"><span style="color:#d05070;">⚙️</span> Narrative HUD</button>
                    <button id="nhud-open-global-settings" class="nhud-dropdown-item" style="text-align:left; background:none; border:none; color:var(--nhud-text-main); padding:6px 10px; cursor:pointer; font-size:12px; border-radius:4px;"><span style="color:#b080e0;">🎨</span> Внешний вид и Система</button>
                    <div style="border-top:1px solid var(--nhud-border); margin:2px 0;"></div>
                    <button id="nhud-sidebar-close" class="nhud-dropdown-item" style="text-align:left; background:none; border:none; color:var(--nhud-text-main); padding:6px 10px; cursor:pointer; font-size:12px; border-radius:4px;"><span style="color:#e05252;">✕</span> Закрыть панель</button>
                </div>
            </div>

            <style>
                .nhud-dropdown-item:hover { background: rgba(255,255,255,0.05) !important; }
            </style>

            <div id="nhud-api-status" style="padding:0 10px; font-size:11px; color:#a08080; text-align:center;"></div>
            <div id="nhud-datetime-bar" style="padding:5px 10px; text-align:center; font-weight:bold; color:#e0b0b0; background:linear-gradient(90deg, transparent, rgba(120,20,40,0.3), transparent);"></div>
            <div class="nhud-divider" style="height:1px; background:var(--nhud-border, #3a1525); margin:5px 0;"></div>
            <div id="nhud-trackers-section" style="padding:0 10px; max-height:30vh; overflow-y:auto;"><div id="nhud-trackers-list"></div></div>
            <div class="nhud-divider" style="height:1px; background:var(--nhud-border, #3a1525); margin:5px 0;"></div>
            <div id="nhud-infoblock-buttons" style="padding:0 10px; display:flex; flex-wrap:wrap; gap:4px; justify-content:center;"></div>
            <div class="nhud-divider" style="height:1px; background:var(--nhud-border, #3a1525); margin:5px 0;"></div>
            <div id="nhud-settings-content" style="flex:1; overflow-y:auto; padding:15px; background:rgba(0,0,0,0.2);">
            <div id="nhud-resize-handle" style="position:absolute; left:-4px; top:0; bottom:0; width:8px; cursor:ew-resize; z-index:10; background:transparent;"></div>
        </div>
        <div id="nhud-infoblock-popup" style="display:none; position:fixed; top:${settings.design?.promptPos?.top || '100px'}; left:${settings.design?.promptPos?.left || '100px'}; z-index:9995; background:var(--nhud-prompt-bg); border:var(--nhud-prompt-border); border-radius:8px; box-shadow:0 5px 20px rgba(0,0,0,0.9); width:var(--nhud-prompt-width); resize:both; overflow:hidden;">
            <div id="nhud-infoblock-popup-header" style="cursor:grab; display:flex; justify-content:space-between; padding:8px 10px; background:var(--nhud-prompt-header); border-bottom:var(--nhud-prompt-border); font-weight:bold; color:var(--nhud-text-main); border-radius:8px 8px 0 0;">
                <span id="nhud-infoblock-popup-title"></span>
                <button id="nhud-infoblock-popup-close" style="background:none; border:none; color:var(--nhud-accent); cursor:pointer;">✕</button>
            </div>
            <div id="nhud-infoblock-popup-content" style="padding:10px; color:var(--nhud-prompt-text-color); font-size:var(--nhud-prompt-font-size); max-height:50vh; overflow-y:auto;"></div>
        </div>
    `);

    // Логика выпадающего меню
    $("#nhud-sidebar-menu-btn").on("click", (e) => {
        e.stopPropagation();
        $("#nhud-sidebar-dropdown").fadeToggle(150);
    });
    $(document).on("click.nhudDropdown", (e) => {
        if (!$(e.target).closest("#nhud-sidebar-menu-btn, #nhud-sidebar-dropdown").length) {
            $("#nhud-sidebar-dropdown").fadeOut(150);
        }
    });

    function updateHudPosition() {
        const mode = settings.ui.hudMode || "screen";
        const sidebar = $("#narrative-hud-sidebar");
        const handle = $("#nhud-resize-handle");
        
        if (mode === "screen") {
            const w = settings.ui.hudWidth || 300;
            sidebar.css({ width: w + "px" });
            handle.show();
            $("#nhud-mode-toggle").html("◧").attr("title", "Ручная ширина");
        } else if (mode === "chat") {
            const chatEl = document.getElementById("chat");
            if (chatEl) {
                const rect = chatEl.getBoundingClientRect();
                const gapWidth = window.innerWidth - rect.right;
                sidebar.css({ width: Math.max(220, gapWidth) + "px" });
            }
            handle.hide();
            $("#nhud-mode-toggle").html("◨").attr("title", "Заполнение до чата");
        }
    }

    $("#nhud-mode-toggle").on("click", () => {
        settings.ui.hudMode = settings.ui.hudMode === "screen" ? "chat" : "screen";
        import('../../../../../script.js').then(m => m.saveSettingsDebounced()); updateHudPosition();
    });

    const chatObserver = new ResizeObserver(() => { if (getSettings().ui?.hudMode === "chat") updateHudPosition(); });
    const chatEl = document.getElementById("chat");
    if (chatEl) chatObserver.observe(chatEl);
    updateHudPosition();

    let isResizing = false, startX, startWidth;
    $("#nhud-resize-handle").on("mousedown", function(e) {
        if (getSettings().ui?.hudMode === "chat") return;
        isResizing = true; startX = e.clientX; startWidth = $("#narrative-hud-sidebar").width();
        $("body").css("user-select", "none"); e.preventDefault();
    });
    
    $(document).on("mousemove.nhudresize", function(e) {
        if (!isResizing) return;
        const newWidth = startWidth + (startX - e.clientX);
        const finalWidth = Math.min(Math.max(220, newWidth), window.innerWidth / 1.5);
        $("#narrative-hud-sidebar").css("width", finalWidth + "px");
    });
    
    $(document).on("mouseup.nhudresize", () => {
        if (isResizing) { 
            isResizing = false; $("body").css("user-select", ""); 
            getSettings().ui.hudWidth = $("#narrative-hud-sidebar").width();
            import('../../../../../script.js').then(m => m.saveSettingsDebounced()); 
            if (typeof makeWindowDraggable === "function") makeWindowDraggable("nhud-infoblock-popup", "nhud-infoblock-popup-header");
        }
    });

    $("#nhud-infoblock-buttons").on("click", ".nhud-info-btn", function() {
        const block = $(this).data("block");
        const live = getLive();
        const popup = $("#nhud-infoblock-popup");
        const isSame = popup.is(":visible") && popup.attr("data-current") === block;
        const sidebarRect = $("#narrative-hud-sidebar")[0].getBoundingClientRect();
        popup.css({ top: sidebarRect.top + 50 + "px", left: (sidebarRect.left - parseInt(getComputedStyle(document.body).getPropertyValue('--nhud-prompt-width') || 300) - 10) + "px" });

        if (isSame) {
            popup.fadeOut(150).removeAttr("data-current"); $(this).removeClass("active");
        } else {
            $(".nhud-info-btn").removeClass("active"); $(this).addClass("active");
            
            // --- НОВАЯ КРАСОТА ДЛЯ ОКНА ---
            let themeBg = "var(--nhud-prompt-header)";
            let themeColor = "var(--nhud-accent)";
            if (block.includes('monolog')) { themeBg = "linear-gradient(90deg, rgba(90, 42, 58, 0.5), transparent)"; themeColor = "#d07080"; }
            else if (block.includes('comment')) { themeBg = "linear-gradient(90deg, rgba(42, 58, 90, 0.5), transparent)"; themeColor = "#7090d0"; }
            else if (block.includes('diar')) { themeBg = "linear-gradient(90deg, rgba(90, 74, 42, 0.5), transparent)"; themeColor = "#d0b070"; }
            else if (block.includes('skill')) { themeBg = "linear-gradient(90deg, rgba(42, 90, 58, 0.5), transparent)"; themeColor = "#70d090"; }

            $("#nhud-infoblock-popup-header").css("background", themeBg);
            $("#nhud-infoblock-popup-title").css("color", themeColor).text($(this).text());
            // ---------------------------------

            $("#nhud-infoblock-popup-content").html(formatPopupText(live.infoBlocks[block]));
            popup.attr("data-current", block).fadeIn(150);
        }
    });

    $("#nhud-infoblock-popup-close").on("click", () => { $("#nhud-infoblock-popup").hide(); $(".nhud-info-btn").removeClass("active"); });
    
    // Бинды кнопок из дропдауна
    $("#nhud-manual-send").on("click", () => { import('../index.js').then(m => m.sendToAPI(true)); $("#nhud-sidebar-dropdown").fadeOut(150); });
    $("#nhud-open-settings").on("click", () => { import('./SettingsUI.js').then(m => m.openSettingsPanel()); $("#nhud-sidebar-dropdown").fadeOut(150); });
    $("#nhud-open-global-settings").on("click", () => { openGlobalSettings(); $("#nhud-sidebar-dropdown").fadeOut(150); });
    $("#nhud-toggle-widget-btn").on("click", () => { $("#nhud-widget").fadeToggle(200); $("#nhud-sidebar-dropdown").fadeOut(150); });
    $("#nhud-sidebar-close").on("click", () => { $("#narrative-hud-sidebar").fadeOut(200); $("#nhud-sidebar-dropdown").fadeOut(150); });

    renderTrackers(); renderCharacters(); renderInfoBlocks();
    renderInfoBlockButtons(); renderProfileSelect();
    if (typeof makeWindowDraggable === "function") makeWindowDraggable("nhud-infoblock-popup", "nhud-infoblock-popup-header");
}

// ─── Info Blocks ────────────────────────────────────────────────────────
export function renderInfoBlockButtons() {
    const settings = getSettings();
    const container = $("#nhud-infoblock-buttons");
    container.empty();
    settings.promptBlocks.filter(b => b.enabled).forEach(block => {
        container.append(`<button class="nhud-info-btn" data-block="${block.id}">${block.label}</button>`);
    });
    
    const live = getLive();
    const hasNewBlocks = settings.promptBlocks.some(b => b.enabled && live.infoBlocks[b.id] === undefined);
    if (hasNewBlocks) showStatus("⚠️ Новые блоки — нажми ▶", "info");
}

export function renderProfileSelect() {
    const settings = getSettings();
    const sel = $("#nhud-profile-select");
    sel.empty();
    const isLight = settings.requestSettings?.lightMode;
    
    if (isLight) sel.append(`<option value="__quiet__" disabled>❌ ST (Блок)</option>`);
    else sel.append(`<option value="__quiet__" ${!settings.useSTProfile ? 'selected' : ''}>🔄 ST</option>`);
    
    getSTProfiles().forEach(p => {
        const selected = settings.useSTProfile && settings.activeProfile === p.name ? 'selected' : '';
        const shortName = p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name;
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
    
    // Отрисовываем карточку
    if (time || loc || weath) {
        let html = `<div style="display:flex; flex-direction:column; gap:6px; font-size:12px; padding:4px 0;">`;
        if (loc) html += `<div style="color:#e0d0a0; font-weight:bold; text-transform:uppercase; letter-spacing:1px; text-shadow:0 0 5px rgba(224,208,160,0.2);">📍 ${loc}</div>`;
        
        let subHtml = [];
        if (weath) subHtml.push(`🌤️ <span style="color:#b0c0e0;">${weath}</span>`);
        if (time) subHtml.push(`🕰️ <span style="color:#c0a0b0;">${time}</span>`);
        
        if (subHtml.length > 0) {
            html += `<div style="font-size:11px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">${subHtml.join('')}</div>`;
        }
        html += `</div>`;
        
        dtBar.html(html).show();
        
        // Запускаем смену атмосферы панели
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

// === Функция для атмосферной перекраски панели ===
function applyAtmosphere(weather, time) {
    const sidebar = $("#narrative-hud-sidebar");
    if (!sidebar.length) return;
    
    const w = (weather + " " + time).toLowerCase();
    let shadow = "none";
    let borderColor = "var(--nhud-border)";
    
    if (w.includes("дождь") || w.includes("rain") || w.includes("шторм") || w.includes("ливень")) {
        shadow = "inset 0 0 70px rgba(20, 40, 70, 0.4)"; 
        borderColor = "#2a4a6a";
    } else if (w.includes("ночь") || w.includes("night") || w.includes("полночь") || w.includes("dark")) {
        shadow = "inset 0 0 90px rgba(0, 0, 0, 0.85)"; 
        borderColor = "#1a1a25";
    } else if (w.includes("солнц") || w.includes("sun") || w.includes("день") || w.includes("ясно")) {
        shadow = "inset 0 0 50px rgba(255, 180, 80, 0.08)"; 
        borderColor = "#6a3a2a";
    } else if (w.includes("снег") || w.includes("snow") || w.includes("зима") || w.includes("мороз")) {
        shadow = "inset 0 0 60px rgba(200, 220, 255, 0.15)"; 
        borderColor = "#4a6a8a";
    }
    
    sidebar.css({
        "box-shadow": shadow + ", -5px 0 25px rgba(0,0,0,0.8)",
        "border-left-color": borderColor,
        "transition": "box-shadow 2.5s ease, border-color 2.5s ease"
    });
}

// ─── Trackers ───────────────────────────────────────────────────────────
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
        name.toLowerCase() !== userName.toLowerCase() && !name.toLowerCase().includes('system') && !live.characters[name].ignoreRelationship
    );

    if (!charNames.length) return;

    container.append('<div style="font-size:0.65em; color:#8060a0; font-weight:bold; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px;">Трекер отношений</div>');

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

// ─── Characters ─────────────────────────────────────────────────────────
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
        name.toLowerCase() !== userName.toLowerCase() && !name.toLowerCase().includes('system')
    );

    if (!charNames.length) {
        container.append(`<div class="nhud-no-chars" style="color:#a08080; font-size:11px; text-align:center;">Нет персонажей в этом чате</div>`);
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
        const outfit = liveData.outfit ? `<div style="font-size:0.75em; color:#8080a0; margin-top:2px;">${showEmoji ? '👗 ' : ''}${liveData.outfit}</div>` : '';
        const state = liveData.state ? `<div style="font-size:0.75em; color:#a0a090; margin-top:2px;">${showEmoji ? '🎭 ' : ''}${liveData.state}</div>` : '';
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
                 <div style="font-weight:bold; font-size:0.85em; margin-bottom:2px; color:#4288b0;">💭 Мысли:</div>
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
        const unifiedBtn = $(`<button class="nhud-info-btn" style="width:100%; margin-bottom:8px; background:rgba(82, 168, 224, 0.15); border:1px solid #3a5a80; color:#80b0e0; border-radius:4px; padding:4px; cursor:pointer; font-weight:bold; transition:0.2s;">💭 Сводка мыслей</button>`);
        
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
                $("#nhud-infoblock-popup-title").text("Сводка мыслей");
                $("#nhud-infoblock-popup-content").html(unifiedThoughtsContent);
                popup.attr("data-current", "unified_thoughts").fadeIn(150);
            }
        });
        container.prepend(unifiedBtn);
    }

    $(document).off('click.thoughts').on('click.thoughts', () => $('.nhud-thoughts-popup').hide());
}

// ─── Фаза 1: Управление и Виджеты ─────────────────────────────────────────

export function buildFloatingWidget() {
    if ($("#nhud-widget").length) return;
    
    const settings = getSettings();
    const pos = settings.ui?.widgetPos || { left: "20px", top: "80px" };
    const wLayout = settings.ui?.widgetLayout || "square"; // "square", "vertical", "horizontal"
    
    $("body").append(`
        <div id="nhud-widget-container" style="position:fixed; left:${pos.left}; top:${pos.top}; z-index:9999; display:flex; flex-direction:column; gap:4px; cursor:grab;">
            <div id="nhud-widget" class="nhud-layout-${wLayout}" style="background:var(--nhud-bg, rgba(20, 10, 15, 0.95)); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; padding:3px; box-shadow: 0 4px 15px rgba(0,0,0,0.8), 0 0 8px rgba(150, 20, 40, 0.4); display:grid; gap:2px; transition:0.3s;">
                <div class="nhud-w-btn" id="nhud-w-settings" title="Настройки" style="background:#2a101a; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; padding:6px 0; transition:0.2s;">⚙️</div>
                <div class="nhud-w-btn" id="nhud-w-hud" title="HUD" style="background:#2a101a; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; transition:0.2s;">📊</div>
                <div class="nhud-w-btn" id="nhud-w-sims" title="Отношения" style="background:#2a101a; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; padding:6px 0; transition:0.2s;">❤️</div>
                <div class="nhud-w-btn" id="nhud-w-conn" title="Подключение" style="background:#2a101a; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; transition:0.2s;">🔌</div>
                <div class="nhud-w-btn" id="nhud-w-hero" title="Прокачка" style="background:#1a2035; color:#52a8e0; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:13px; padding:4px 0; transition:0.2s;">🧬</div>
                <div class="nhud-w-btn" id="nhud-w-inv" title="Инвентарь" style="background:#201a10; color:#e0a352; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:13px; padding:4px 0; transition:0.2s;">🎒</div>
                <div class="nhud-w-btn" id="nhud-w-quests" title="Квесты" style="background:#1a2520; color:#52e0a3; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:13px; padding:4px 0; transition:0.2s;">📜</div>
                <div class="nhud-w-btn" id="nhud-w-calendar" title="Календарь" style="background:#201015; color:#e080b0; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:13px; padding:4px 0; transition:0.2s;">📅</div>
                <div class="nhud-w-btn" id="nhud-w-codex" title="Кодекс" style="background:#251a25; color:#b080e0; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:13px; padding:4px 0; transition:0.2s;">📖</div>
            </div>
            <button id="nhud-w-rotate" title="Сменить раскладку" style="background:rgba(0,0,0,0.5); border:1px solid var(--nhud-border); border-radius:10px; color:#a08080; font-size:10px; cursor:pointer; padding:2px; margin:0 auto; width:30px; position:relative; z-index:10; flex-shrink:0;">⟳</button>
        </div>
    `);
    
    let styleTag = document.getElementById("nhud-widget-styles");
    if (!styleTag) {
        $("<style id='nhud-widget-styles'>").text(`
            .nhud-w-btn:hover { background: var(--nhud-border, #501020) !important; box-shadow: inset 0 0 5px rgba(255,100,100,0.3); }
            #nhud-widget-container:active { cursor: grabbing !important; }
            .nhud-layout-square { grid-template-columns: 1fr 1fr; width:60px; }
            .nhud-layout-vertical { grid-template-columns: 1fr; width:30px; }
            .nhud-layout-horizontal { grid-template-columns: repeat(9, 1fr); width:270px; }
        `).appendTo("head");
    }

    $("#nhud-w-rotate").on("click", (e) => {
        e.stopPropagation();
        const widget = $("#nhud-widget");
        let newLayout = "square";
        if (widget.hasClass("nhud-layout-square")) newLayout = "vertical";
        else if (widget.hasClass("nhud-layout-vertical")) newLayout = "horizontal";
        
        widget.removeClass("nhud-layout-square nhud-layout-vertical nhud-layout-horizontal").addClass(`nhud-layout-${newLayout}`);
        getSettings().ui.widgetLayout = newLayout;
        import('../../../../../script.js').then(m => m.saveSettingsDebounced());
    });

    $("#nhud-w-settings").on("click", (e) => { e.stopPropagation(); import('./SettingsUI.js').then(m => m.openSettingsPanel()); });
    $("#nhud-w-hud").on("click", (e) => { e.stopPropagation(); $("#narrative-hud-sidebar").fadeToggle(200); });
    $("#nhud-w-sims").on("click", (e) => { e.stopPropagation(); import('./UIManager.js').then(m => { if(m.toggleMiniSims) m.toggleMiniSims(); }); });
    $("#nhud-w-conn").on("click", (e) => { e.stopPropagation(); import('./UIManager.js').then(m => { if(m.toggleMiniConn) m.toggleMiniConn(); }); });
    $("#nhud-w-hero").on("click", (e) => { e.stopPropagation(); import('./UIManager.js').then(m => { if(m.toggleHeroSheet) m.toggleHeroSheet(); }); });
    $("#nhud-w-inv").on("click", (e) => { e.stopPropagation(); import('./UIManager.js').then(m => { if(m.toggleInventory) m.toggleInventory(); }); });
    $("#nhud-w-quests").on("click", (e) => { e.stopPropagation(); import('./UIManager.js').then(m => { if(m.toggleQuestLog) m.toggleQuestLog(); }); });
    $("#nhud-w-codex").on("click", (e) => { e.stopPropagation(); import('./UIManager.js').then(m => { if(m.toggleCodex) m.toggleCodex(); }); });
    $("#nhud-w-calendar").on("click", (e) => { e.stopPropagation(); import('./UIManager.js').then(m => { if(m.toggleCalendar) m.toggleCalendar(); }); });
    
    makeWindowDraggable("nhud-widget-container", "nhud-widget-container");
}

// ─── ГЛОБАЛЬНЫЕ НАСТРОЙКИ (ЦЕНТР ЧАТА) ──────────────────────────────────
export function buildGlobalSettingsModal() {
    if ($("#nhud-global-settings").length) return;
    
    const settings = getSettings();
    const d = settings.design || {};
    const ui = settings.ui || {};
    const m = settings.modules || {};
    const p = settings.prompts || {};

    $("body").append(`
        <div id="nhud-global-settings" style="display:none; position:fixed; top:40px; bottom:20px; z-index:9992; background:var(--nhud-cen-bg, #151220); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--nhud-cen-head, linear-gradient(180deg, #2a101a, #1a0a10)); padding:10px 15px; border-bottom:1px solid var(--nhud-border, #4a1525);">
                <span style="font-weight:bold; color:var(--nhud-cen-text, #e0c0c0);">🎨 Внешний вид и Система</span>
                <button id="nhud-global-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); font-size:18px; cursor:pointer; padding:0;">✕</button>
            </div>
            
            <div style="display:flex; flex-wrap:wrap; background:rgba(0,0,0,0.4); border-bottom:1px solid var(--nhud-border, #3a1525); flex-shrink:0;">
                <button class="nhud-g-tab active" data-tab="visuals" style="flex:1; padding:8px; background:none; border:none; color:var(--nhud-cen-text, #e0c0c0); font-weight:bold; cursor:pointer;">🎨 Внешний вид</button>
                <button class="nhud-g-tab" data-tab="system" style="flex:1; padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">⚙️ Система</button>
                <button class="nhud-g-tab" data-tab="faq" style="flex:1; padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">❓ FAQ & Обучение</button>
            </div>
            
            <div id="nhud-global-content" style="flex:1; overflow-y:auto; padding:15px; background:rgba(0,0,0,0.2);">
                <div class="nhud-g-tab-content active" data-tab="visuals" style="display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <button id="nhud-theme-mimic" class="nhud-send-btn" style="flex:1; padding:8px; background:#2a101a; border:1px solid #5a2035; color:#e0c0c0; border-radius:4px; cursor:pointer;">🎭 Мимикрировать под ST</button>
                        <button id="nhud-theme-reset" class="nhud-send-btn" style="flex:1; padding:8px; background:#2a101a; border:1px solid #5a2035; color:#e0c0c0; border-radius:4px; cursor:pointer;">🔄 Сбросить дизайн</button>
                    </div>

                    <details class="nhud-design-acc" style="background:var(--nhud-cen-inp, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;"><summary class="nhud-cen-head" style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">⚙️ 1. Левая панель (Настройки)</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                            <div class="nhud-field-group">
                                <label>Режим вкладок</label>
                                <select id="nhud-d-tabsMode" class="nhud-select" style="width:100%;">
                                    <option value="top-text" ${ui.tabsMode === 'top-text' ? 'selected' : ''}>Сверху (Иконка + Текст)</option>
                                    <option value="top-icon" ${ui.tabsMode === 'top-icon' ? 'selected' : ''}>Сверху (Только иконки)</option>
                                    <option value="side-icon" ${ui.tabsMode === 'side-icon' ? 'selected' : ''}>Сбоку (Только иконки)</option>
                                </select>
                            </div>
                            
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <div><label style="font-size:11px; color:#a08080;">Цвет фона</label><input id="nhud-d-leftBgC" type="color" value="${d.leftBgC || '#140a0f'}" style="width:100%; height:30px;"/></div>
                                <div><label style="font-size:11px; color:#a08080;">Прозрачность фона</label><input id="nhud-d-leftBgO" type="range" min="0" max="1" step="0.05" value="${d.leftBgO ?? 0.95}" style="width:100%;"/></div>
                                <div style="grid-column: span 2;"><input id="nhud-d-leftBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.leftBgI || ''}" /></div>

                                <div><label style="font-size:11px; color:#a08080;">Цвет границ</label><input id="nhud-d-border" type="color" value="${d.borderColor || '#4a1525'}" style="width:100%; height:30px;"/></div>
                                <div><label style="font-size:11px; color:#a08080;">Тус. текст</label><input id="nhud-d-textMu" type="color" value="${d.textMuted || '#a08080'}" style="width:100%; height:30px;"/></div>

                                <div><label style="font-size:11px; color:#a08080;">Цвет текста</label><input id="nhud-d-leftTxtC" type="color" value="${d.leftTxtC || '#e0b0b0'}" style="width:100%; height:30px;"/></div>
                                <div><label style="font-size:11px; color:#a08080;">Размер текста (px)</label><input id="nhud-d-leftTxtS" type="number" value="${d.leftTxtS || 12}" class="nhud-input" style="width:100%;"/></div>
                            </div>

                            <div style="border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Заголовки и Гармошки</div>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                    <div><label style="font-size:10px; color:#a08080;">Цвет текста заг.</label><input id="nhud-d-leftHeadTxtC" type="color" value="${d.leftHeadTxtC || d.accent || '#d05070'}" style="width:100%; height:25px;"/></div>
                                    <div><label style="font-size:10px; color:#a08080;">Размер заг. (px)</label><input id="nhud-d-leftHeadS" type="number" value="${d.leftHeadS || 13}" class="nhud-input" style="width:100%;"/></div>
                                    <div><label style="font-size:10px; color:#a08080;">Цвет фона (шапки)</label><input id="nhud-d-leftHeadC" type="color" value="${d.leftHeadC || '#000000'}" style="width:100%; height:25px;"/></div>
                                    <div><label style="font-size:10px; color:#a08080;">Прозрачность шапки</label><input id="nhud-d-leftHeadO" type="range" min="0" max="1" step="0.05" value="${d.leftHeadO ?? 0.2}" style="width:100%;"/></div>
                                </div>
                            </div>

                            <div style="border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Поля ввода (Inputs)</div>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                    <div><label style="font-size:10px; color:#a08080;">Цвет полей</label><input id="nhud-d-leftInpC" type="color" value="${d.leftInpC || '#000000'}" style="width:100%; height:25px;"/></div>
                                    <div><label style="font-size:10px; color:#a08080;">Прозрачность</label><input id="nhud-d-leftInpO" type="range" min="0" max="1" step="0.05" value="${d.leftInpO ?? 0.3}" style="width:100%;"/></div>
                                </div>
                            </div>
                        </div>
                    </details>
                    
                    <details class="nhud-design-acc" style="background:var(--nhud-cen-inp, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;"><summary class="nhud-cen-head" style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">📊 2. Правая панель (HUD)</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                            <div class="nhud-field-group">
                                <label>Отображение мыслей (💭)</label>
                                <select id="nhud-d-thoughtsMode" class="nhud-select" style="width:100%;">
                                    <option value="individual" ${ui.thoughtsMode === 'individual' ? 'selected' : ''}>У каждого персонажа</option>
                                    <option value="unified" ${ui.thoughtsMode === 'unified' ? 'selected' : ''}>Единым окном (Кнопка)</option>
                                </select>
                            </div>
                            <label style="display:flex; align-items:center; gap:8px; color:var(--nhud-cen-text); cursor:pointer;">
                                <input type="checkbox" id="nhud-d-showEmoji" ${d.showStatusEmojis !== false ? 'checked' : ''}> Показывать смайлики (👗, 🎭)
                            </label>
                            <div style="border-top: 1px dashed var(--nhud-border); padding-top: 8px;">
                                <label style="display:flex; align-items:center; gap:8px; color:var(--nhud-cen-text); cursor:pointer; margin-bottom:8px;">
                                    <input type="checkbox" id="nhud-d-barDyn" ${d.barDynamic !== false ? 'checked' : ''}> Градиент полосок (от %%)
                                </label>
                                <div style="display:flex; gap:10px; align-items:center;">
                                    <input id="nhud-d-barS" type="color" value="${d.barColorStart || '#52e0a3'}" style="width:30px; height:25px;"/> <span style="font-size:11px;">100%</span>
                                    <input id="nhud-d-barE" type="color" value="${d.barColorEnd || '#e05252'}" style="width:30px; height:25px;"/> <span style="font-size:11px;">0%</span>
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <div><label style="font-size:11px; color:#a08080;">Цвет фона</label><input id="nhud-d-hudBgC" type="color" value="${d.hudBgC || '#140a0f'}" style="width:100%; height:30px;"/></div>
                                <div><label style="font-size:11px; color:#a08080;">Прозрачность фона</label><input id="nhud-d-hudBgO" type="range" min="0" max="1" step="0.05" value="${d.hudBgO ?? 0.95}" style="width:100%;"/></div>
                                <div style="grid-column: span 2;"><input id="nhud-d-hudBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.hudBgI || ''}" /></div>
                                
                                <div><label style="font-size:11px; color:#a08080;">Цвет текста</label><input id="nhud-d-hudTxtC" type="color" value="${d.hudTxtC || '#e0b0b0'}" style="width:100%; height:30px;"/></div>
                                <div><label style="font-size:11px; color:#a08080;">Размер текста (px)</label><input id="nhud-d-hudTxtS" type="number" value="${d.hudTxtS || 12}" class="nhud-input" style="width:100%;"/></div>
                            </div>

                            <div style="border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Поля ввода (Inputs)</div>
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                                    <div><label style="font-size:10px; color:#a08080;">Цвет полей</label><input id="nhud-d-hudInpC" type="color" value="${d.hudInpC || '#000000'}" style="width:100%; height:25px;"/></div>
                                    <div><label style="font-size:10px; color:#a08080;">Прозрачность</label><input id="nhud-d-hudInpO" type="range" min="0" max="1" step="0.05" value="${d.hudInpO ?? 0.3}" style="width:100%;"/></div>
                                </div>
                            </div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:var(--nhud-cen-inp, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;"><summary class="nhud-cen-head" style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">🎨 3. Центральное окно (Где мы сейчас)</summary>
                        <div style="padding:10px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <div><label style="font-size:11px; color:#a08080;">Цвет фона</label><input id="nhud-d-cenBgC" type="color" value="${d.cenBgC || '#151220'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:11px; color:#a08080;">Прозрачность фона</label><input id="nhud-d-cenBgO" type="range" min="0" max="1" step="0.05" value="${d.cenBgO ?? 0.98}" style="width:100%;"/></div>
                            <div style="grid-column: span 2;"><input id="nhud-d-cenBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.cenBgI || ''}" /></div>
                            
                            <div><label style="font-size:11px; color:#a08080;">Цвет текста</label><input id="nhud-d-cenTxtC" type="color" value="${d.cenTxtC || '#e0c0c0'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:11px; color:#a08080;">Размер текста (px)</label><input id="nhud-d-cenTxtS" type="number" value="${d.cenTxtS || 12}" class="nhud-input" style="width:100%;"/></div>
                            
                            <div style="grid-column: span 2; border-top:1px dashed var(--nhud-border); padding-top:10px; margin-top:5px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Заголовки и Гармошки</div>
                            </div>
                            <div><label style="font-size:10px; color:#a08080;">Цвет текста заг.</label><input id="nhud-d-cenHeadTxtC" type="color" value="${d.cenHeadTxtC || '#e0c0c0'}" style="width:100%; height:25px;"/></div>
                            <div><label style="font-size:10px; color:#a08080;">Размер заг. (px)</label><input id="nhud-d-cenHeadS" type="number" value="${d.cenHeadS || 14}" class="nhud-input" style="width:100%;"/></div>
                            <div><label style="font-size:10px; color:#a08080;">Цвет фона (шапки)</label><input id="nhud-d-cenHeadC" type="color" value="${d.cenHeadC || '#2a101a'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:10px; color:#a08080;">Прозрачность шапки</label><input id="nhud-d-cenHeadO" type="range" min="0" max="1" step="0.05" value="${d.cenHeadO ?? 0.3}" style="width:100%;"/></div>

                            <div style="grid-column: span 2; border-top:1px dashed var(--nhud-border); padding-top:10px; margin-top:5px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Поля ввода (Inputs)</div>
                            </div>
                            <div><label style="font-size:10px; color:#a08080;">Цвет полей</label><input id="nhud-d-cenInpC" type="color" value="${d.cenInpC || '#000000'}" style="width:100%; height:25px;"/></div>
                            <div><label style="font-size:10px; color:#a08080;">Прозрачность</label><input id="nhud-d-cenInpO" type="range" min="0" max="1" step="0.05" value="${d.cenInpO ?? 0.2}" style="width:100%;"/></div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:var(--nhud-cen-inp, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;"><summary class="nhud-cen-head" style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">💬 4. Всплывающие окна (Инвентарь, Промпты...)</summary>
                        <div style="padding:10px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <div class="nhud-field-group" style="grid-column: span 2;"><label>Ширина окна промптов (px)</label><input id="nhud-d-prmW" class="nhud-input" type="number" min="200" max="800" value="${d.promptWidth || 300}" /></div>
                            
                            <label style="grid-column: span 2; display:flex; align-items:center; gap:8px; color:var(--nhud-cen-text); cursor:pointer;">
                                <input type="checkbox" id="nhud-d-prmMerge" ${d.promptMerged ? 'checked' : ''}> Слить шапку с фоном (Монолит)
                            </label>
                            
                            <div><label style="font-size:11px; color:#a08080;">Цвет шапки окна</label><input id="nhud-d-popHeadC" type="color" value="${d.popHeadC || '#2a101a'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:11px; color:#a08080;">Прозр. шапки окна</label><input id="nhud-d-popHeadO" type="range" min="0" max="1" step="0.05" value="${d.popHeadO ?? 1}" style="width:100%;"/></div>

                            <div><label style="font-size:11px; color:#a08080;">Цвет фона</label><input id="nhud-d-popBgC" type="color" value="${d.popBgC || '#1a0a10'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:11px; color:#a08080;">Прозрачность фона</label><input id="nhud-d-popBgO" type="range" min="0" max="1" step="0.05" value="${d.popBgO ?? 0.95}" style="width:100%;"/></div>
                            <div style="grid-column: span 2;"><input id="nhud-d-popBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.popBgI || ''}" /></div>
                            
                            <div><label style="font-size:11px; color:#a08080;">Цвет текста</label><input id="nhud-d-popTxtC" type="color" value="${d.popTxtC || '#e0b0b0'}" style="width:100%; height:30px;"/></div>
                            <div><label style="font-size:11px; color:#a08080;">Размер текста (px)</label><input id="nhud-d-popTxtS" type="number" value="${d.popTxtS || 14}" class="nhud-input" style="width:100%;"/></div>

                            <div style="grid-column: span 2; border-top:1px dashed var(--nhud-border); padding-top:10px; margin-top:5px;">
                                <div style="font-size:11px; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">Поля ввода (Inputs)</div>
                            </div>
                            <div><label style="font-size:10px; color:#a08080;">Цвет полей</label><input id="nhud-d-popInpC" type="color" value="${d.popInpC || '#000000'}" style="width:100%; height:25px;"/></div>
                            <div><label style="font-size:10px; color:#a08080;">Прозрачность</label><input id="nhud-d-popInpO" type="range" min="0" max="1" step="0.05" value="${d.popInpO ?? 0.3}" style="width:100%;"/></div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:var(--nhud-cen-inp, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;"><summary class="nhud-cen-head" style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">🧊 5. Плавающий виджет и CSS</summary>
                        <div style="padding:10px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <div><label style="font-size:12px; color:#a08080;">Фон кубика</label><input id="nhud-d-widC" type="color" value="${d.widBgColor || '#140a0f'}" style="width:100%; height:30px; cursor:pointer;"/></div>
                            <div><label style="font-size:12px; color:#a08080;">Прозрачность кубика</label><input id="nhud-d-widO" type="range" min="0" max="1" step="0.05" value="${d.widBgOpacity ?? 0.95}" style="width:100%;"/></div>
                            <div style="grid-column: span 2;"><input id="nhud-d-widI" class="nhud-input" type="text" placeholder="URL картинки для кубика..." value="${d.widBgImage || ''}" /></div>
                            
                            <div><label style="font-size:12px; color:#a08080;">Цвет текста/иконок</label><input id="nhud-d-widTxtC" type="color" value="${d.widTxtC || '#ffffff'}" style="width:100%; height:30px; cursor:pointer;"/></div>
                            <div><label style="font-size:12px; color:#a08080;">Размер иконок (px)</label><input id="nhud-d-widTxtS" type="number" value="${d.widTxtS || 14}" class="nhud-input" style="width:100%;"/></div>

                            <div style="grid-column: span 2; display:flex; gap:10px; align-items:center; border-top:1px dashed var(--nhud-border); padding-top:10px;">
                                <input id="nhud-d-accent" type="color" value="${d.accent || '#d05070'}" style="width:30px; height:30px;"/>
                                <label style="font-size:12px; color:#a08080;">Основной акцентный цвет (Кнопки, иконки)</label>
                            </div>
                            <textarea id="nhud-d-css" class="nhud-textarea" rows="4" placeholder="/* Твой CSS код */" style="grid-column: span 2; box-sizing:border-box; font-family:monospace; font-size:11px; margin-top:5px;">${d.customCss || ''}</textarea>
                        </div>
                    </details>
                </div>

                <div class="nhud-g-tab-content" data-tab="system" style="display:none; flex-direction:column; gap:10px;">
                <details class="nhud-design-acc" style="background:rgba(20,0,0,0.4); border:1px solid #802030; border-radius:4px; padding:5px; margin-bottom:10px;" open>
                        <summary class="nhud-cen-head" style="cursor:pointer; color:#e05252; font-weight:bold; outline:none; padding:5px;">📊 Расход токенов (Примерная оценка)</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--nhud-cen-text);">
                            <div style="display:flex; justify-content:space-between;"><span>Системные инструкции:</span><span id="nhud-tokens-sys">0</span></div>
                            <div style="display:flex; justify-content:space-between;"><span>Кастомные блоки:</span><span id="nhud-tokens-custom">0</span></div>
                            <div style="display:flex; justify-content:space-between;"><span>Структура JSON (Скелет):</span><span>190</span></div>
                            <div style="border-top:1px dashed #802030; margin:4px 0;"></div>
                            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px; color:#e0c0c0;"><span>Итого к запросу:</span><span><span id="nhud-tokens-total">0</span> токенов</span></div>
                            <div style="font-size:9px; color:#a08080; margin-top:4px;">* Оценка примерная. 1 токен ≈ 4 англ. символа или 2 рус. символа. Зависит от модели.</div>
                        </div>
                    </details>
                    <div style="background: rgba(200,50,80,0.1); padding: 10px; border: 1px solid var(--nhud-border); border-radius: 4px; margin-bottom:10px;">
                        <label style="color:#d0d0a0; font-weight:bold; font-size:12px;">🌐 Язык ответов (Language)</label>
                        <input id="nhud-p-lang" class="nhud-input" type="text" value="${p.language || 'Russian'}" style="margin-top:4px;" />
                        <label style="color:#d0d0a0; font-weight:bold; font-size:12px; display:block; margin-top:10px;">🧠 Главный системный промпт</label>
                        <textarea id="nhud-p-sys" class="nhud-textarea" rows="3" style="margin-top:4px;">${p.system}</textarea>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#52a8e0;"><input type="checkbox" id="nhud-m-trackers" ${m.trackers?'checked':''}> 📊 Трекеры (Здоровье и др.)</label>
                            <textarea id="nhud-p-trackers" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.trackersPrompt}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#e080b0;"><input type="checkbox" id="nhud-m-calendar" ${m.calendar !== false ? 'checked' : ''}> 📅 Календарь событий</label>
                            <textarea id="nhud-p-calendar" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.calendarPrompt || ''}</textarea>
                        </div>
                        
                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#b080e0;"><input type="checkbox" id="nhud-m-chars" ${m.characters?'checked':''}> 👥 Персонажи (Одежда/Мысли)</label>
                            <textarea id="nhud-p-chars" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.charsPrompt}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#e0d0a0;"><input type="checkbox" id="nhud-m-date" ${m.datetime?'checked':''}> 🌤️ Дата, время и погода</label>
                            <textarea id="nhud-p-date" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.datetimePrompt}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#52e0a3;"><input type="checkbox" id="nhud-m-achievements" ${m.achievements?'checked':''}> 🏆 Ачивки (Зал Славы)</label>
                            <textarea id="nhud-p-ach" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.achievementsPrompt}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#52a8e0;"><input type="checkbox" id="nhud-m-hero" ${m.hero !== false ? 'checked' : ''}> 🧬 Герой (Опыт и Статы)</label>
                            <textarea id="nhud-p-hero" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.heroPrompt}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#e0c0a0;"><input type="checkbox" id="nhud-m-quests" ${m.quests !== false ? 'checked' : ''}> 📜 Журнал квестов</label>
                            <textarea id="nhud-p-quests" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.questsPrompt || 'If a new quest starts or an active one updates/finishes, generate a "quests" array containing objects with "title", "desc", and "status" (active/completed/failed).'}</textarea>
                        </div>

                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#b080e0;"><input type="checkbox" id="nhud-m-codex" ${m.codex !== false ? 'checked' : ''}> 📖 Сюжетный Кодекс</label>
                            <textarea id="nhud-p-codex" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.codexPrompt || "If you introduce new important lore, factions, secrets, or concepts, unlock a lorebook entry using the JSON field 'codex_unlocked' containing 'title' and 'text'."}</textarea>
                        </div>
                        
                        <div style="border:1px solid var(--nhud-border); padding:8px; border-radius:4px; background:var(--nhud-cen-inp, rgba(0,0,0,0.2));">
                            <label class="nhud-checkbox-group" style="color:#e05252;"><input type="checkbox" id="nhud-m-factions" ${m.factions !== false ? 'checked' : ''}> 🏴‍☠️ Фракции (Репутация)</label>
                            <textarea id="nhud-p-factions" class="nhud-textarea" rows="2" style="margin-top:5px; font-size:11px;" placeholder="Промпт...">${p.factionsPrompt || 'If the user interacts with factions, update their reputation using the JSON object "factions" (e.g. {"Faction Name": 60}).'}</textarea>
                        </div>
                    </div>

                    <div style="margin-top:10px; border:1px dashed var(--nhud-border); padding:10px; border-radius:4px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <div style="grid-column: span 2; font-size:11px; color:#a08080; margin-bottom:5px;">Модули без промптов (работают локально или вшиты):</div>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-rel" ${m.relationships?'checked':''}> ❤️ Отношения (Трекер)</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-inv" ${m.inventory !== false ? 'checked' : ''}> 🎒 Имущество (Инвентарь/Деньги)</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-thoughts" ${m.thoughts?'checked':''}> 💭 Мысли персонажей</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-blocks" ${m.customBlocks?'checked':''}> 🧩 Кастомные блоки</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-analytics" ${m.analytics !== false ? 'checked':''}> 📈 Графики аналитики</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-blocksUI" ${m.beautifulBlocks !== false ? 'checked' : ''}> ✨ Красивые инфоблоки внутри чата (БЕЗ токенов)</label>
                        
                        <div style="grid-column: span 2; border-top:1px solid var(--nhud-border); margin-top:5px; padding-top:10px;">
                            <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-lore" ${m.loreInjection?'checked':''}> 🧠 Динамическая память (Вшивка лора)</label>
                            <div class="nhud-field-group" style="display: flex; align-items: center; gap: 10px; padding-left: 25px; margin-top: 5px;">
                                <span style="color:var(--nhud-text-muted); font-size: 11px;">Куда вшивать память:</span>
                                <select id="nhud-m-lore-mode" class="nhud-select" style="flex:1; padding:4px;">
                                    <option value="system" ${m.loreMode === 'system' || !m.loreMode ? 'selected' : ''}>⚙️ В Системный промпт (Надежно)</option>
                                    <option value="user" ${m.loreMode === 'user' ? 'selected' : ''}>👤 В последнее сообщение</option>
                                    <option value="note" ${m.loreMode === 'note' ? 'selected' : ''}>📝 Как Заметку Автора</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="nhud-g-tab-content" data-tab="faq" style="display:none; flex-direction:column; gap:10px; align-items:center; justify-content:center; padding:20px; text-align:center;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎓</div>
                    <h3 style="color:var(--nhud-accent); margin-top:0;">Добро пожаловать в Narrative HUD!</h3>
                    <p style="color:var(--nhud-text-main); font-size:14px; margin-bottom:20px;">Пройдите краткий интерактивный тур, чтобы узнать, как пользоваться всеми панелями.</p>
                    <button id="nhud-start-tour-btn" class="nhud-send-btn" style="padding:10px 20px; font-size:14px; background:var(--nhud-accent); border:none; border-radius:8px; cursor:pointer; color:#fff; font-weight:bold; box-shadow:0 4px 15px rgba(208, 80, 112, 0.4);">🚀 Запустить обучение</button>
                </div>

            </div>
    `);

    function updateGlobalTokenTracker() {
        const s = getSettings();
        const m = s.modules || {};
        const p = s.prompts || {};
        
        let sysText = p.system || "";
        if(m.trackers) sysText += p.trackersPrompt || "";
        if(m.characters) sysText += p.charsPrompt || "";
        if(m.datetime) sysText += p.datetimePrompt || "";
        if(m.achievements) sysText += p.achievementsPrompt || "";
        if(m.hero !== false) sysText += p.heroPrompt || "";
        if(m.quests !== false) sysText += p.questsPrompt || "";
        if(m.codex !== false) sysText += p.codexPrompt || "";
        if(m.factions !== false) sysText += p.factionsPrompt || "";

        let customText = (s.promptBlocks || []).filter(b => b.enabled).map(b => b.prompt).join(" ");

        const calc = (text) => {
            if (!text) return 0;
            let t = 0;
            for(let i=0; i<text.length; i++) {
                const c = text.charCodeAt(i);
                if(c >= 1024 && c <= 1279) t += 0.5; else t += 0.25;
            }
            return Math.ceil(t);
        };

        const sysTokens = calc(sysText);
        const customTokens = calc(customText);
        const jsonTokens = 190;
        
        $("#nhud-tokens-sys").text(sysTokens);
        $("#nhud-tokens-custom").text(customTokens);
        $("#nhud-tokens-total").text(sysTokens + customTokens + jsonTokens);
    }

    function saveAndApply() { saveSettingsDebounced(); applyDesignTheme(); updateGlobalTokenTracker(); }
    updateGlobalTokenTracker(); // Запускаем при открытии

    const modBinds = { trackers: '#nhud-m-trackers', relationships: '#nhud-m-rel', characters: '#nhud-m-chars', thoughts: '#nhud-m-thoughts', customBlocks: '#nhud-m-blocks', datetime: '#nhud-m-date', analytics: '#nhud-m-analytics', loreInjection: '#nhud-m-lore', achievements: '#nhud-m-achievements', hero: '#nhud-m-hero', inventory: '#nhud-m-inv', quests: '#nhud-m-quests', codex: '#nhud-m-codex', factions: '#nhud-m-factions', calendar: '#nhud-m-calendar' };
    for (const [key, id] of Object.entries(modBinds)) {
        $(id).on("change", e => { getSettings().modules[key] = e.target.checked; saveAndApply(); });
    }

    $("#nhud-p-lang").on("input", e => { getSettings().prompts.language = e.target.value; saveAndApply(); }); 
    $("#nhud-p-sys").on("input", e => { getSettings().prompts.system = e.target.value; saveAndApply(); });
    $("#nhud-p-trackers").on("input", e => { getSettings().prompts.trackersPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-chars").on("input", e => { getSettings().prompts.charsPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-date").on("input", e => { getSettings().prompts.datetimePrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-ach").on("input", e => { getSettings().prompts.achievementsPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-hero").on("input", e => { getSettings().prompts.heroPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-quests").on("input", e => { getSettings().prompts.questsPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-codex").on("input", e => { getSettings().prompts.codexPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-factions").on("input", e => { getSettings().prompts.factionsPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-calendar").on("input", e => { getSettings().prompts.calendarPrompt = e.target.value; saveAndApply(); });

    $("#nhud-d-tabsMode").on("change", e => { getSettings().ui.tabsMode = e.target.value; saveAndApply(); });
    $("#nhud-d-thoughtsMode").on("change", e => { getSettings().ui.thoughtsMode = e.target.value; saveAndApply(); renderCharacters(); });
    
    // ДОБАВИЛ СЮДА ВСЕ НОВЫЕ ПОЛЯ ДЛЯ КРАСИВОГО СЕЙВА
    const binds = {
        borderColor: '#nhud-d-border', textMuted: '#nhud-d-textMu', accent: '#nhud-d-accent', customCss: '#nhud-d-css',
        
        leftBgC: '#nhud-d-leftBgC', leftBgO: '#nhud-d-leftBgO', leftBgI: '#nhud-d-leftBgI', 
        leftTxtC: '#nhud-d-leftTxtC', leftTxtS: '#nhud-d-leftTxtS',
        leftHeadC: '#nhud-d-leftHeadC', leftHeadO: '#nhud-d-leftHeadO', leftHeadTxtC: '#nhud-d-leftHeadTxtC', leftHeadS: '#nhud-d-leftHeadS',
        leftInpC: '#nhud-d-leftInpC', leftInpO: '#nhud-d-leftInpO',
        
        hudBgC: '#nhud-d-hudBgC', hudBgO: '#nhud-d-hudBgO', hudBgI: '#nhud-d-hudBgI', 
        hudTxtC: '#nhud-d-hudTxtC', hudTxtS: '#nhud-d-hudTxtS',
        hudInpC: '#nhud-d-hudInpC', hudInpO: '#nhud-d-hudInpO',
        
        cenBgC: '#nhud-d-cenBgC', cenBgO: '#nhud-d-cenBgO', cenBgI: '#nhud-d-cenBgI', 
        cenTxtC: '#nhud-d-cenTxtC', cenTxtS: '#nhud-d-cenTxtS',
        cenHeadC: '#nhud-d-cenHeadC', cenHeadO: '#nhud-d-cenHeadO', cenHeadTxtC: '#nhud-d-cenHeadTxtC', cenHeadS: '#nhud-d-cenHeadS',
        cenInpC: '#nhud-d-cenInpC', cenInpO: '#nhud-d-cenInpO',
        
        popBgC: '#nhud-d-popBgC', popBgO: '#nhud-d-popBgO', popBgI: '#nhud-d-popBgI', 
        popTxtC: '#nhud-d-popTxtC', popTxtS: '#nhud-d-popTxtS',
        popHeadC: '#nhud-d-popHeadC', popHeadO: '#nhud-d-popHeadO',
        popInpC: '#nhud-d-popInpC', popInpO: '#nhud-d-popInpO', promptWidth: '#nhud-d-prmW',
        
        widBgColor: '#nhud-d-widC', widBgOpacity: '#nhud-d-widO', widBgImage: '#nhud-d-widI', 
        widTxtC: '#nhud-d-widTxtC', widTxtS: '#nhud-d-widTxtS',
        
        barColorStart: '#nhud-d-barS', barColorEnd: '#nhud-d-barE'
    };

    for (const [key, id] of Object.entries(binds)) {
        $(id).on("input", e => { 
            const val = (e.target.type === 'range' || e.target.type === 'number') ? parseFloat(e.target.value) : e.target.value;
            getSettings().design[key] = val; saveAndApply(); 
        });
    }

    $("#nhud-d-prmMerge").on("change", e => { getSettings().design.promptMerged = e.target.checked; saveAndApply(); });
    $("#nhud-d-showEmoji").on("change", e => { getSettings().design.showStatusEmojis = e.target.checked; saveAndApply(); renderCharacters(); });
    $("#nhud-d-barDyn").on("change", e => { 
        getSettings().design.barDynamic = e.target.checked; saveAndApply(); 
        renderRelationships(); renderTrackers(); 
        import('./SettingsUI.js').then(m => { if(m.renderSettingsTrackers) m.renderSettingsTrackers(); });
    });

    $(document).off("click", "#nhud-theme-mimic").on("click", "#nhud-theme-mimic", () => {
        if (!confirm("Попытаться скопировать цвета из текущей темы SillyTavern?")) return;
        const rs = getComputedStyle(document.documentElement);
        const bg = rs.getPropertyValue('--SmartThemeBodyColor').trim() || '#151220';
        const txt = rs.getPropertyValue('--SmartThemeQuoteColor').trim() || '#e0c0c0';
        const border = rs.getPropertyValue('--SmartThemeBorderColor').trim() || '#4a1525';
        const accent = rs.getPropertyValue('--SmartThemeUserMesColor').trim() || '#d05070';
        
        const d = getSettings().design;
        d.leftBgC = d.hudBgC = d.cenBgC = d.popBgC = d.widBgColor = bg;
        d.leftTxtC = d.hudTxtC = d.cenTxtC = d.popTxtC = txt;
        d.borderColor = border;
        d.accent = accent;
        
        import('../../../../../script.js').then(s => s.saveSettingsDebounced());
        applyDesignTheme();
        closeGlobalSettings(); 
        setTimeout(() => openGlobalSettings(), 200);
    });

    $(document).off("click", "#nhud-theme-reset").on("click", "#nhud-theme-reset", () => {
        if (!confirm("Сбросить дизайн до заводских настроек?")) return;
        getSettings().design = { hudBgColor: "#140a0f", hudBgOpacity: 0.95, setBgColor: "#140a0f", setBgOpacity: 0.95, cenBgColor: "#151220", cenBgOpacity: 0.98, inputBgColor: "#000000", inputBgOpacity: 0.3, borderColor: "#4a1525", textMain: "#e0b0b0", textMuted: "#a08080", accent: "#d05070", customCss: "" };
        import('../../../../../script.js').then(s => s.saveSettingsDebounced());
        applyDesignTheme();
        closeGlobalSettings(); 
        setTimeout(() => openGlobalSettings(), 200);
    });

    $("#nhud-global-settings").off("click", ".nhud-g-tab").on("click", ".nhud-g-tab", function() {
        const tab = $(this).data("tab");
        $(".nhud-g-tab").css({ color: "var(--nhud-text-muted, #a08080)", fontWeight: "normal" });
        $(this).css({ color: "var(--nhud-cen-text, #e0c0c0)", fontWeight: "bold" });
        $(".nhud-g-tab-content").hide();
        $(`.nhud-g-tab-content[data-tab="${tab}"]`).css("display", "flex").hide().fadeIn(200);
    });
    
    $(document).off("click", "#nhud-global-close").on("click", "#nhud-global-close", closeGlobalSettings);
    
    $(document).off("click", "#nhud-start-tour-btn").on("click", "#nhud-start-tour-btn", () => {
        startInteractiveTour();
    });
}

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
        name.toLowerCase() !== userName.toLowerCase() && !name.toLowerCase().includes('system') && !live.characters[name].ignoreRelationship
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
            saveSettingsDebounced(); renderRelationships();
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

export function showAchievementPopup(ach) {
    // Создаем невидимый контейнер-стек для уведомлений, если его еще нет
    let container = $("#nhud-popup-container");
    if (!container.length) {
        $("body").append('<div id="nhud-popup-container" style="position:fixed; bottom:20px; right:20px; z-index:2147483647; display:flex; flex-direction:column; gap:10px; pointer-events:none;"></div>');
        container = $("#nhud-popup-container");
    }

    const id = 'ach-' + Date.now() + Math.floor(Math.random() * 1000);
    const html = $(`
        <div id="${id}" class="nhud-achievement-popup" style="position:relative !important; bottom:auto !important; right:auto !important; pointer-events:auto; box-shadow: 0 5px 15px rgba(0,0,0,0.8);">
            <div class="nhud-ach-icon">${ach.icon || '🏆'}</div>
            <div class="nhud-ach-text">
                <div style="font-size:9px; color:var(--nhud-text-muted, #a08080); text-transform:uppercase; font-weight:bold; margin-bottom:2px;">УВЕДОМЛЕНИЕ HUD</div>
                <div class="nhud-ach-title">${ach.title}</div>
                <div class="nhud-ach-desc">${ach.desc}</div>
            </div>
        </div>
    `);
    
    container.append(html);
    
    // Плавное появление и скрытие
    setTimeout(() => html.addClass('show'), 50);
    setTimeout(() => {
        html.removeClass('show');
        setTimeout(() => html.remove(), 600); 
    }, 12000); // Висит 12 секунд
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

// =========================================================================
// УТИЛИТЫ ДЛЯ ПЕРЕТАСКИВАНИЯ ОКОН (DRAG & DROP)
// =========================================================================

export function makeWindowDraggable(elementId, handleId) {
    const el = document.getElementById(elementId);
    const handle = document.getElementById(handleId) || el;
    if (!el || !handle) return;

    // Убираем старые обработчики если были
    handle.onmousedown = null;
    handle.onpointerdown = null;

    let isDragging = false, startX, startY, initX, initY, pointerId;

    const onPointerDown = (e) => {
        if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'].includes(e.target.tagName)) return;
        // Только левая кнопка мыши или тач
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        isDragging = true;
        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        const rect = el.getBoundingClientRect();
        initX = rect.left;
        initY = rect.top;

        handle.setPointerCapture(e.pointerId);
        handle.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    };

    const onPointerMove = (e) => {
        if (!isDragging || e.pointerId !== pointerId) return;
        let newLeft = initX + (e.clientX - startX);
        let newTop  = initY + (e.clientY - startY);
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth  - el.offsetWidth));
        newTop  = Math.max(0, Math.min(newTop,  window.innerHeight - el.offsetHeight));
        el.style.left = newLeft + 'px';
        el.style.top  = newTop  + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.transform = 'none';
    };

    const onPointerUp = (e) => {
        if (!isDragging || e.pointerId !== pointerId) return;
        isDragging = false;
        handle.style.cursor = 'grab';
        document.body.style.userSelect = '';

        import('../core/StateManager.js').then(m => {
            const settings = m.getSettings();
            if (elementId === 'nhud-infoblock-popup') {
                settings.design.promptPos = { left: el.style.left, top: el.style.top };
            } else if (elementId === 'nhud-widget-container') {
                if (!settings.ui) settings.ui = {};
                settings.ui.widgetPos = { left: el.style.left, top: el.style.top };
            } else {
                if (!settings.ui) settings.ui = {};
                settings.ui[elementId + 'Pos'] = { left: el.style.left, top: el.style.top };
            }
            import('../../../../../script.js').then(s => s.saveSettingsDebounced());
        });
    };

    handle.addEventListener('pointerdown', onPointerDown, { passive: false });
    handle.addEventListener('pointermove', onPointerMove, { passive: true });
    handle.addEventListener('pointerup',   onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
}

// =========================================================================
// УПРАВЛЕНИЕ ГЛОБАЛЬНЫМИ НАСТРОЙКАМИ И ИНТЕРАКТИВНЫЙ ТУР
// =========================================================================

export function updateGlobalSettingsPosition() {
    const panel = $("#nhud-global-settings");
    if (!panel.length) return;
    if (panel.parent().prop("tagName") !== "BODY") panel.appendTo("body");

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        panel.css({
            position: "fixed", top: "5%", left: "5%", right: "5%", bottom: "5%",
            width: "90%", height: "90%", maxWidth: "none", maxHeight: "none",
            transform: "none", zIndex: 100000,
            display: "flex", flexDirection: "column", margin: 0,
            borderRadius: "8px", boxSizing: "border-box"
        });
    } else {
        panel.css({
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: "750px", maxWidth: "95vw", height: "85vh", maxHeight: "850px",
            bottom: "auto", right: "auto", zIndex: 100000,
            display: "flex", flexDirection: "column", margin: 0,
            borderRadius: "8px", boxSizing: "border-box"
        });
    }
}

export function openGlobalSettings() {
    $("#nhud-global-settings").remove(); // Жестко убиваем кэш окна
    import('./UIManager.js').then(m => {
        if (m.buildGlobalSettingsModal) m.buildGlobalSettingsModal();
        updateGlobalSettingsPosition();

        $(".nhud-g-tab-content").hide();
        $(".nhud-g-tab-content[data-tab='visuals']").css("display", "flex").show();
        $(".nhud-g-tab").css({ color: "var(--nhud-text-muted, #a08080)", fontWeight: "normal" });
        $(".nhud-g-tab[data-tab='visuals']").css({ color: "var(--nhud-cen-text, #e0c0c0)", fontWeight: "bold" });

        $("#nhud-global-settings").stop(true, true).css({ display: "flex", opacity: 0 }).animate({ opacity: 1 }, 200);
    });
}

export function closeGlobalSettings() {
    $("#nhud-global-settings").fadeOut(200);
}

// === ДОБАВЛЕНЫ НОВЫЕ ПЕРЕМЕННЫЕ ДЛЯ CSS ===
export function applyDesignTheme() {
    import('../core/StateManager.js').then(m => {
        const settings = m.getSettings();
        const d = settings.design || {};
        const ui = settings.ui || {}; 

        const getBgStringLocal = (hex, alpha, imgUrl) => {
            let rgba = `rgba(20, 10, 15, ${alpha})`;
            if (hex && hex.startsWith('#')) {
                let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
                rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            if (imgUrl && imgUrl.trim() !== '') {
                return `linear-gradient(${rgba}, ${rgba}), url('${imgUrl}') center/cover no-repeat`;
            }
            return rgba;
        };

        const hudBg = getBgStringLocal(d.hudBgC || d.hudBgColor, d.hudBgO ?? d.hudBgOpacity, d.hudBgI || d.hudBgImage);
        const setBg = getBgStringLocal(d.leftBgC || d.setBgColor, d.leftBgO ?? d.setBgOpacity, d.leftBgI || d.setBgImage);
        const widBg = getBgStringLocal(d.widBgColor, d.widBgOpacity, d.widBgImage);
        const cenBg = getBgStringLocal(d.cenBgC || d.cenBgColor, d.cenBgO ?? d.cenBgOpacity, d.cenBgI || d.cenBgImage);
        const popBg = getBgStringLocal(d.popBgC || d.popBgColor, d.popBgO ?? d.popBgOpacity, d.popBgI || d.popBgImage);
        
        const hexToRgbaLocal = (hex, alpha) => {
            if (!hex || !hex.startsWith('#')) return `rgba(0,0,0,${alpha})`;
            let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        // Обрабатываем цвета полей и гармошек
        const leftAcc = hexToRgbaLocal(d.leftHeadC || d.leftAccBg || '#000000', d.leftHeadO ?? d.leftAccO ?? 0.2);
        const leftInp = hexToRgbaLocal(d.leftInpC || '#000000', d.leftInpO ?? 0.3);
        const cenAcc = hexToRgbaLocal(d.cenHeadC || d.cenAccBg || '#000000', d.cenHeadO ?? d.cenAccO ?? 0.3);
        const cenInp = hexToRgbaLocal(d.cenInpC || '#000000', d.cenInpO ?? 0.2);
        const hudInp = hexToRgbaLocal(d.hudInpC || '#000000', d.hudInpO ?? 0.3);
        const popInp = hexToRgbaLocal(d.popInpC || '#000000', d.popInpO ?? 0.3);

        let tabsCss = "";
        const tabsMode = ui.tabsMode || "top-text";
        if (tabsMode === "top-text") tabsCss = `#nhud-settings-body { flex-direction: column !important; } #nhud-settings-tabs { flex-direction: row !important; border-bottom: 1px solid var(--nhud-border) !important; border-right: none !important; width: 100% !important; } .nhud-tab-text { display: inline; } .nhud-tab { font-size: 13px; flex: 1; }`;
        else if (tabsMode === "top-icon") tabsCss = `#nhud-settings-body { flex-direction: column !important; } #nhud-settings-tabs { flex-direction: row !important; border-bottom: 1px solid var(--nhud-border) !important; border-right: none !important; width: 100% !important; } .nhud-tab-text { display: none; } .nhud-tab { font-size: 16px; padding: 8px 0 !important; flex: 1; }`;
        else if (tabsMode === "side-icon") tabsCss = `#nhud-settings-body { flex-direction: row !important; } #nhud-settings-tabs { flex-direction: column !important; width: 44px !important; border-right: 1px solid var(--nhud-border) !important; border-bottom: none !important; } .nhud-tab-text { display: none; } .nhud-tab { font-size: 16px; padding: 12px 0 !important; flex: none !important; width: 100%; }`;

        const mod = settings.modules || {};
        let hideModulesCss = "";
        if (!mod.trackers) hideModulesCss += "#nhud-trackers-section { display: none !important; } ";
        if (!mod.relationships) hideModulesCss += "#nhud-relationships-section { display: none !important; } ";
        if (!mod.characters) hideModulesCss += "#nhud-characters-section { display: none !important; } ";
        if (!mod.customBlocks) hideModulesCss += "#nhud-infoblock-buttons { display: none !important; } ";
        if (!mod.datetime) hideModulesCss += "#nhud-datetime-bar { display: none !important; } ";

        const cssText = `
            :root {
                --nhud-border: ${d.borderColor || '#4a1525'};
                
                --nhud-bar-start: ${d.barColorStart || '#52e0a3'};
                --nhud-bar-end: ${d.barColorEnd || '#e05252'};
                --nhud-accent: ${d.accent || '#d05070'};
                
                /* Left Panel */
                --nhud-left-bg: ${setBg};
                --nhud-left-text: ${d.leftTxtC || '#e0c0c0'};
                --nhud-left-text-size: ${d.leftTxtS || 12}px;
                --nhud-left-head-bg: ${leftAcc};
                --nhud-left-head-text: ${d.leftHeadTxtC || d.accent || '#d05070'};
                --nhud-left-head-size: ${d.leftHeadS || 13}px;
                --nhud-left-inp: ${leftInp};

                /* HUD */
                --nhud-hud-bg: ${hudBg};
                --nhud-hud-text: ${d.hudTxtC || '#e0b0b0'};
                --nhud-hud-text-size: ${d.hudTxtS || 12}px;
                --nhud-hud-inp: ${hudInp};

                /* Center */
                --nhud-cen-bg: ${cenBg};
                --nhud-cen-text: ${d.cenTxtC || '#e0c0c0'};
                --nhud-cen-text-size: ${d.cenTxtS || 12}px;
                --nhud-cen-head-bg: ${cenAcc};
                --nhud-cen-head-text: ${d.cenHeadTxtC || '#e0c0c0'};
                --nhud-cen-head-size: ${d.cenHeadS || 14}px;
                --nhud-cen-inp: ${cenInp};
                
                /* Popups */
                --nhud-prompt-bg: ${popBg};
                --nhud-prompt-header: ${d.promptMerged ? 'transparent' : hexToRgbaLocal(d.popHeadC || '#2a101a', d.popHeadO ?? 1)};
                --nhud-prompt-border: ${d.promptMerged ? 'none' : '1px solid var(--nhud-border)'};
                --nhud-prompt-width: ${window.innerWidth < 768 ? '95vw' : (d.promptWidth || 300) + 'px'};
                --nhud-prompt-text-color: ${d.popTxtC || '#e0b0b0'};
                --nhud-prompt-font-size: ${d.popTxtS || 14}px;
                --nhud-pop-inp: ${popInp};

                /* Widget */
                --nhud-wid-text: ${d.widTxtC || '#ffffff'};
                --nhud-wid-text-size: ${d.widTxtS || 14}px;
            }
            ${tabsCss}
            ${hideModulesCss}
            
            /* ПРИМЕНЕНИЕ НОВЫХ ШРИФТОВ И ЦВЕТОВ */
            #narrative-hud-sidebar { background: var(--nhud-hud-bg) !important; color: var(--nhud-hud-text) !important; font-size: var(--nhud-hud-text-size); background-blend-mode: overlay; }
            #narrative-hud-sidebar .nhud-char-name, #narrative-hud-sidebar .nhud-tracker-label { color: var(--nhud-hud-text) !important; }
            #narrative-hud-sidebar .nhud-input, #narrative-hud-sidebar .nhud-textarea { background-color: var(--nhud-hud-inp) !important; color: var(--nhud-hud-text) !important; }

            #nhud-settings-panel { background: var(--nhud-left-bg) !important; color: var(--nhud-left-text) !important; font-size: var(--nhud-left-text-size); background-blend-mode: overlay; }
            #nhud-settings-panel .nhud-input, #nhud-settings-panel .nhud-textarea, #nhud-settings-panel .nhud-select, #nhud-settings-panel .nhud-settings-tracker-row { background-color: var(--nhud-left-inp) !important; color: var(--nhud-left-text) !important; }
            #nhud-settings-panel details summary, #nhud-settings-panel .nhud-accordion-header { background: var(--nhud-left-head-bg) !important; font-size: var(--nhud-left-head-size) !important; color: var(--nhud-left-head-text) !important; }

            #nhud-global-settings { background: var(--nhud-cen-bg) !important; color: var(--nhud-cen-text) !important; font-size: var(--nhud-cen-text-size); background-blend-mode: overlay; }
            #nhud-global-settings .nhud-input, #nhud-global-settings .nhud-textarea, #nhud-global-settings .nhud-select { background-color: var(--nhud-cen-inp) !important; color: var(--nhud-cen-text) !important; }
            #nhud-global-settings details summary, #nhud-global-settings .nhud-cen-head { background: var(--nhud-cen-head-bg) !important; font-size: var(--nhud-cen-head-size) !important; color: var(--nhud-cen-head-text) !important; }

            #nhud-infoblock-popup, #nhud-analytics-popup, #nhud-rel-journal, #nhud-mini-sims, #nhud-mini-conn, #nhud-hero-sheet, #nhud-inventory-modal, #nhud-quest-log, #nhud-codex-modal { background: var(--nhud-prompt-bg) !important; color: var(--nhud-prompt-text-color) !important; font-size: var(--nhud-prompt-font-size); background-blend-mode: overlay; }
            .nhud-json-editor-textarea { background: var(--nhud-pop-inp) !important; color: var(--nhud-prompt-text-color) !important; border: 1px solid var(--nhud-border) !important; }

            #nhud-infoblock-popup .nhud-input, #nhud-infoblock-popup .nhud-textarea, 
            #nhud-hero-sheet .nhud-input, #nhud-inventory-modal .nhud-input,
            #nhud-quest-log .nhud-input, #nhud-quest-log .nhud-textarea, #nhud-quest-log .nhud-select,
            #nhud-codex-modal .nhud-input, #nhud-codex-modal .nhud-textarea,
            #nhud-mini-sims .nhud-input { background-color: var(--nhud-pop-inp) !important; color: var(--nhud-prompt-text-color) !important; border-color: var(--nhud-border) !important; }

            #nhud-widget { background: ${widBg} !important; border-color: var(--nhud-border) !important; background-blend-mode: overlay; }
            #nhud-widget .nhud-w-btn { font-size: var(--nhud-wid-text-size) !important; color: var(--nhud-wid-text) !important; }
            
            ${d.customCss || ''}

           @media screen and (max-width: 1000px) {
                #narrative-hud-sidebar { width: 100% !important; max-width: 100vw !important; left: 0 !important; right: 0 !important; border-left: none !important; z-index: 10001 !important; }
                #nhud-infoblock-popup, #nhud-analytics-popup, #nhud-rel-journal, #nhud-mini-sims, #nhud-mini-conn, #nhud-smart-cleaner-modal { position: fixed !important; left: 2vw !important; width: 96vw !important; top: 5vh !important; max-height: 90vh !important; transform: none !important; box-sizing: border-box !important; margin: 0 !important; z-index: 10005 !important; }
                #nhud-analytics-canvas { width: 100% !important; height: auto !important; }
                #nhud-widget { transform: scale(1.2); }
                #nhud-settings-panel { width: 100% !important; max-width: 100vw !important; left: 0 !important; border-right: none !important; z-index: 10001 !important; }
                
                #nhud-global-settings { width: 95vw !important; height: 90vh !important; top: 5vh !important; left: 2.5vw !important; transform: none !important; }
                #nhud-global-content div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; display: flex !important; flex-direction: column !important; gap: 8px !important; }
                .nhud-g-tab { font-size: 11px !important; padding: 6px !important; flex-basis: 30% !important; flex-grow: 1; text-align: center; }
            }
        `;

        let styleTag = document.getElementById("nhud-dynamic-theme");
        if (!styleTag) { styleTag = document.createElement("style"); styleTag.id = "nhud-dynamic-theme"; document.head.appendChild(styleTag); }
        styleTag.innerHTML = cssText;
    });
}

// ─── CALENDAR UI ───
export function toggleCalendar() {
    let popup = $("#nhud-calendar-modal");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-calendar-modal" style="display:none; position:fixed; top:20vh; left:calc(50% - 200px); width:400px; z-index:9995; background:var(--nhud-prompt-bg, #151220); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-calendar-header" style="display:flex; justify-content:space-between; align-items:center; background:var(--nhud-prompt-header, #2a101a); padding:10px; border-bottom:1px solid var(--nhud-border); cursor:grab;">
                    <span style="font-weight:bold; color:#e080b0; font-size:14px;">📅 Календарь событий</span>
                    <button id="nhud-calendar-close" style="background:none; border:none; color:var(--nhud-accent); cursor:pointer; padding:0; font-size:16px;">✕</button>
                </div>
                <div id="nhud-calendar-content" style="padding:15px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.3); max-height:60vh; overflow-y:auto;"></div>
            </div>
        `);
        makeWindowDraggable("nhud-calendar-modal", "nhud-calendar-header");
        $("#nhud-calendar-close").on("click", () => $("#nhud-calendar-modal").fadeOut(150));
        popup = $("#nhud-calendar-modal");
    }
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderCalendar(); popup.fadeIn(150); }
}

export function renderCalendar() {
    import('../core/StateManager.js').then(m => {
        const calendar = m.getCalendar();
        const content = $("#nhud-calendar-content");
        content.empty();

        content.append(`
            <div style="display:flex; gap:6px; margin-bottom:10px;">
                <input id="nhud-cal-add-date" class="nhud-input" style="width:100px;" placeholder="Дата..." value="${new Date().toLocaleDateString()}" />
                <input id="nhud-cal-add-desc" class="nhud-input" style="flex:1;" placeholder="Что произошло..." />
                <button id="nhud-cal-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
            </div>
            <div style="font-size:11px; color:#a08080; margin-bottom:10px;">События автоматически отправляются в память ИИ (если включено в Системе). ИИ сам может добавлять сюда важные записи.</div>
        `);

        if (!calendar || calendar.length === 0) {
            content.append('<div style="color:#606080; text-align:center; font-size:12px; padding:20px;">Пока ничего не произошло...</div>');
        } else {
            const timeline = $('<div style="border-left:2px solid #e080b0; margin-left:10px; padding-left:15px; display:flex; flex-direction:column; gap:12px;"></div>');
            
            calendar.forEach((ev, idx) => {
                const card = $(`
                    <div style="position:relative; background:rgba(224, 128, 176, 0.05); border:1px solid rgba(224, 128, 176, 0.2); border-radius:6px; padding:8px;">
                        <div style="position:absolute; left:-22px; top:12px; width:10px; height:10px; background:#e080b0; border-radius:50%; border:2px solid #151220;"></div>
                        <button class="nhud-cal-del" data-idx="${idx}" style="position:absolute; top:4px; right:4px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">✕</button>
                        <input class="nhud-input nhud-cal-date" data-idx="${idx}" value="${ev.date}" style="font-weight:bold; color:#e080b0; font-size:12px; margin-bottom:4px; background:transparent; border:none; padding:0; width:100px;" />
                        <textarea class="nhud-textarea nhud-cal-desc" data-idx="${idx}" rows="2" style="font-size:12px; border:none; background:transparent; color:#d0c0c0; padding:0; width:100%; box-sizing:border-box;">${ev.desc}</textarea>
                    </div>
                `);
                
                card.find('.nhud-cal-del').on('click', function() {
                    calendar.splice(parseInt($(this).data('idx')), 1);
                    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                    renderCalendar();
                });
                card.find('.nhud-cal-date').on('change', function() {
                    calendar[parseInt($(this).data('idx'))].date = $(this).val();
                    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                });
                card.find('.nhud-cal-desc').on('change', function() {
                    calendar[parseInt($(this).data('idx'))].desc = $(this).val();
                    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                });
                
                timeline.append(card);
            });
            content.append(timeline);
        }

        $("#nhud-cal-add-btn").off("click").on("click", () => {
            const date = $("#nhud-cal-add-date").val().trim();
            const desc = $("#nhud-cal-add-desc").val().trim();
            if (desc) {
                m.addCalendarEvent({ date: date, desc: desc });
                renderCalendar();
            }
        });
    });
}

export function startInteractiveTour() {
    if ($("#nhud-tour-overlay").length) return;

    $("#nhud-global-close").trigger("click");
    import('./SettingsUI.js').then(m => { if(m.closeSettingsPanel) m.closeSettingsPanel(); });
    $("#narrative-hud-sidebar").fadeOut(100);

    const steps = [
        { 
            title: "👋 Добро пожаловать в Narrative HUD!", 
            text: "Привет! Я разработала этот мод, чтобы превратить обычный текстовый чат в настоящую RPG с живым миром, экономикой и классным интерфейсом.<br><br>Сейчас я проведу самую подробную экскурсию по всем функциям. Устраивайся поудобнее, мы начинаем!", 
            target: null 
        },
        { 
            title: "🧊 Плавающий виджет (Кубик)", 
            text: "Это твой карманный пульт управления. Его можно свободно перетаскивать мышкой за края.<br><br>Здесь спрятаны кнопки быстрого доступа к мини-окошкам: Инвентарю, Журналу, Отношениям и Настройкам. Кнопка со стрелочками (⟳) внизу меняет форму виджета: квадрат, вертикальная полоса или горизонтальная панель.", 
            target: "#nhud-widget-container", 
            before: () => $("#nhud-widget-container").fadeIn() 
        },
        { 
            title: "📊 Правое окно (HUD)", 
            text: "Главная информационная панель. Она показывает текущее состояние игры в реальном времени: статус твоего персонажа, окружающий мир и тех, кто находится рядом.", 
            target: "#narrative-hud-sidebar", 
            before: () => { $("#narrative-hud-sidebar").fadeIn(); } 
        },
        { 
            title: "🌤️ Шапка, Погода и Кнопки", 
            text: "Сверху отображается текущая локация, время и погода. <b>Фишка:</b> Панель сама меняет цвет свечения (теней) в зависимости от погоды! Для дождя — синий, для солнца — золотой.<br><br>Под иконкой с тремя точками (⋮) скрыто меню принудительного обновления данных и быстрые переходы в настройки.", 
            target: "#nhud-sidebar-menu-btn" 
        },
        { 
            title: "❤️ Бары здоровья и отношений", 
            text: "Здесь выводятся все динамические полоски: Здоровье, Мана, Отношения с персонажами. Если значение падает, цвет плавно меняется с зеленого на красный (это можно выключить в дизайне).", 
            target: "#nhud-trackers-section" 
        },
        { 
            title: "💬 Кнопки Инфоблоков", 
            text: "Когда ИИ сгенерировал Скиллчеки, Дневники или Комментарии, здесь появятся кнопки. Нажав на них, ты откроешь стильное всплывающее окошко с текстом.", 
            target: "#nhud-infoblock-buttons" 
        },
        { 
            title: "👥 Персонажи в сцене", 
            text: "В самом низу — список всех активных персонажей сцены. Здесь видны их аватарки, во что они одеты (👗), какие эмоции испытывают (🎭).<br><br>А кнопка <b>💭 Сводка мыслей</b> позволяет заглянуть им в голову и узнать, что они на самом деле о тебе думают!", 
            target: "#nhud-characters-section" 
        },
        { 
            title: "⚙️ Левое окно (Мастерская)", 
            text: "А теперь переходим к самому главному — настройкам текущего чата. Именно здесь происходит вся магия управления твоей игрой.", 
            target: "#nhud-settings-panel", 
            before: () => { import('./SettingsUI.js').then(m => { if(m.openSettingsPanel) m.openSettingsPanel(); }); } 
        },
        { 
            title: "📝 Вкладка: Промты и Токены", 
            text: "Здесь настраиваются промпты для <b>кастомных инфоблоков</b>. Можно добавлять любые (комментарии, комментаторов, дневники и т.д) — только впиши промпт, и они появятся в виде кнопок в правом окошке!<br><br>А сверху есть <b>Калькулятор Токенов</b>, который считает, сколько памяти съедает всё твое имущество, лор и квесты.", 
            target: ".nhud-tab-content[data-tab='prompts']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='prompts']").trigger('click'); } 
        },
        { 
            title: "📈 Вкладка: Трекеры", 
            text: "Тут находятся: <b>Трекер Отношений</b> (можно менять статусы, смотреть график аналитики и отдельно открыть <b>Журнал связей</b> по кнопке 📜), <b>Фракции</b> и <b>Статы Героя</b>.", 
            target: ".nhud-tab-content[data-tab='trackers']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='trackers']").trigger('click'); } 
        },
        { 
            title: "🏴‍☠️ Оформление Фракций", 
            text: "Раскрой любую фракцию, нажми на шестеренку ⚙️. Ты увидишь поле <b>URL фона</b>. Найди красивую картинку в интернете, вставь ссылку, и карточка фракции обретет крутой фон!<br><br>Кнопка <b>👁️ Описание / 👁️‍🗨️ Без описания</b> позволяет экономить токены. Если глазик горит, ИИ читает лор фракции. Если выключен — знает только репутацию.", 
            target: ".nhud-tab-content[data-tab='trackers']",
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='trackers']").trigger('click'); } 
        },
        { 
            title: "🎒 Вкладка: Имущество", 
            text: "Твой кошелек, обычный рюкзак (где можно добавлять предметы), Недвижимость и Транспорт. Бары сверху (Здоровье и Мана) настраиваются именно здесь! Можешь добавить кастомные!", 
            target: ".nhud-tab-content[data-tab='property']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='property']").trigger('click'); } 
        },
        { 
            title: "🏠 Недвижимость и Транспорт", 
            text: "У каждого дома или машины есть кнопка <b>👁️ В памяти / 👁️‍🗨️ Скрыто</b>. Их описание незаметно вшивается в контекст. Не держи все дома включенными, ИИ должен помнить только то, что нужно прямо сейчас.<br><br>А нажав на шестеренку ⚙️, можно вставить <b>URL картинки дома или машины</b> из интернета, чтобы сделать карточку красивой!", 
            target: ".nhud-tab-content[data-tab='property']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='property']").trigger('click'); } 
        },
        { 
            title: "📜 Вкладка: Журнал", 
            text: "<b>Квесты:</b> ИИ сам обновляет их статусы, но и ты как игрок можешь вручную добавлять новые записи и менять статусы квестов (Активные, Выполненные, Проваленные).<br><br><b>Кодекс:</b> энциклопедия мира. Не забывай выключать глазики 👁️ у старых статей, чтобы беречь токены!", 
            target: ".nhud-tab-content[data-tab='journal']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='journal']").trigger('click'); } 
        },
        { 
            title: "📅 Вкладка: Летопись (Календарь)", 
            text: "Записи сюда может делать и ИИ, и сам игрок. События включаются в контекст при включенном глазике у каждой записи (а даты с записями подсвечиваются в самом календаре зелёным цветом).", 
            target: ".nhud-tab-content[data-tab='calendar']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='calendar']").trigger('click'); } 
        },
        { 
            title: "🏆 Вкладка: Зал Славы", 
            text: "Сделал что-то безумное, смешное, невероятное? ИИ наградит тебя достижением, выдаст иконку и навсегда запишет это событие в твой личный Зал Славы. Все награды хранятся здесь.", 
            target: ".nhud-tab-content[data-tab='halloffame']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='halloffame']").trigger('click'); } 
        },
        { 
            title: "👥 Вкладка: Персонажи", 
            text: "Список всех встреченных персонажей во всех чатах. Кнопка Призрака 👻 <b>вырезает персонажа из контекста</b>, чтобы ИИ больше не мог добавлять его в отслеживание (но его можно вернуть). А красная иконка крестика ✕ — полностью удаляет данные персонажа из памяти (но если ИИ снова о нем заговорит, он вернется).", 
            target: ".nhud-tab-content[data-tab='characters']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='characters']").trigger('click'); } 
        },
        { 
            title: "🔌 Вкладка: API (Режимы запросов)", 
            text: "Здесь настраивается, как мод собирает данные:<br>1. <b>Вместе с основным запросом:</b> Вшивается в ответ (1 запрос, совместный).<br>2. <b>Запрос после ответа:</b> Генерирует второй запрос сразу после ответа (контекст настраивается чуть ниже).<br>3. <b>Лайт-режим:</b> Для слабых моделей. Делает второй 'тихий' запрос с облегченным контекстом.", 
            target: ".nhud-tab-content[data-tab='api']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='api']").trigger('click'); } 
        },
        { 
            title: "🗄️ Вкладка: База данных", 
            text: "Делай бэкапы (Экспорт/Импорт). Бэкапы сохраняют память кастомных инфоблоков и все текущие статы чата. А <b>Умная очистка</b> удаляет 'мусорные' данные от старых свайпов (рероллов), чтобы чат не тормозил.", 
            target: ".nhud-tab-content[data-tab='storage']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='storage']").trigger('click'); } 
        },
        { 
            title: "🎨 Центральное окно (Глобальные)", 
            text: "А теперь переходим к настройкам самого мода, которые работают для ВСЕХ чатов сразу.", 
            target: "#nhud-global-settings", 
            before: () => { import('./SettingsUI.js').then(m => { if(m.closeSettingsPanel) m.closeSettingsPanel(); }); openGlobalSettings(); } 
        },
        { 
            title: "🎭 Внешний вид", 
            text: "Здесь можно красить всё: прозрачность, обводку, цвета окон. <b>Важно:</b> Для всех фонов можно поставить кастомный фон, просто вставив URL картинки из интернета! А кнопка 'Мимикрировать под ST' скопирует цвета твоей текущей темы Таверны.", 
            target: ".nhud-g-tab-content[data-tab='visuals']", 
            before: () => { $("#nhud-global-settings .nhud-g-tab[data-tab='visuals']").trigger('click'); } 
        },
        { 
            title: "⚙️ Система (Управление движком)", 
            text: "Включение и выключение модулей. Выключение модуля полностью вырезает его из текстового промпта, экономя токены (и удаляются визуально). Промпты модулей тоже можно менять, но делай это вдумчиво!", 
            target: ".nhud-g-tab-content[data-tab='system']", 
            before: () => { $("#nhud-global-settings .nhud-g-tab[data-tab='system']").trigger('click'); } 
        },
        { 
            title: "🧠 Куда вшивать память", 
            text: "В самом низу Системы есть важная настройка: как отправлять ИИ данные о мире.<br><b>Системный промпт:</b> Надежно.<br><b>Последнее сообщение (👤):</b> ИИ реагирует моментально, так как видит статусы прямо перед глазами.", 
            target: ".nhud-g-tab-content[data-tab='system']", 
            before: () => { $("#nhud-global-settings .nhud-g-tab[data-tab='system']").trigger('click'); } 
        },
        { 
            title: "🦇 Конец экскурсии", 
            text: "На этом всё. Помни главные правила: следи за токенами, выключай глазики 👁️‍🗨️ у ненужных объектов и лора. Удачи  в твоих историях!", 
            target: null, 
            before: () => { closeGlobalSettings(); } 
        }
    ];

    let currentStep = 0;

    $("body").append(`
        <div id="nhud-tour-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:100005; backdrop-filter:blur(3px);"></div>
        <div id="nhud-tour-highlight-box" style="position:fixed; border:2px solid var(--nhud-accent, #d05070); border-radius:6px; box-shadow:0 0 0 2px rgba(0,0,0,0.5), 0 0 20px var(--nhud-accent, #d05070); z-index:100010; pointer-events:none; transition:all 0.3s ease-in-out; opacity:0;"></div>
        
        <div id="nhud-tour-box" style="position:fixed; z-index:100015; pointer-events:auto; background:var(--nhud-prompt-bg, #151220); border:1px solid var(--nhud-accent, #d05070); border-radius:8px; padding:20px; box-shadow:0 15px 50px rgba(0,0,0,0.9), inset 0 0 20px rgba(208,80,112,0.1); box-sizing:border-box; transition: opacity 0.3s ease; opacity: 0;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:10px; border-bottom:1px dashed var(--nhud-border);">
                <h3 id="nhud-tour-title" style="margin:0; color:var(--nhud-text-main, #e0c0c0); font-size:18px; line-height:1.3;"></h3>
                <button id="nhud-tour-skip" style="background:none; border:none; color:#a08080; cursor:pointer; font-size:22px; padding:0; margin-top:-4px; margin-left:15px; transition:0.2s; line-height:1;" title="Пропустить">✕</button>
            </div>
            <div style="padding:15px 0;">
                <p id="nhud-tour-text" style="color:var(--nhud-text-muted, #a08080); font-size:14px; line-height:1.6; margin:0;"></p>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:15px; border-top:1px solid rgba(255,255,255,0.05);">
                <span id="nhud-tour-counter" style="color:#606080; font-size:12px; font-weight:bold; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:4px;"></span>
                <div style="display:flex; gap:10px;">
                    <button id="nhud-tour-prev" class="nhud-send-btn" style="background:#2a101a; border-color:#5a2035; padding:8px 16px;">Назад</button>
                    <button id="nhud-tour-next" class="nhud-send-btn" style="background:var(--nhud-accent, #d05070); color:#fff; font-weight:bold; border-color:#fff; padding:8px 16px; box-shadow:0 4px 10px rgba(208,80,112,0.4);">Далее</button>
                </div>
            </div>
        </div>
    `);

    function renderStep() {
        const step = steps[currentStep];
        
        if (step.before) step.before();

        $("#nhud-tour-title").text(step.title);
        $("#nhud-tour-text").html(step.text);
        $("#nhud-tour-counter").text(`Шаг ${currentStep + 1} из ${steps.length}`);
        $("#nhud-tour-prev").toggle(currentStep > 0);
        $("#nhud-tour-next").text(currentStep === steps.length - 1 ? "Завершить" : "Далее");

        const isMobile = window.innerWidth <= 768;
        const box = $("#nhud-tour-box");
        const hlBox = $("#nhud-tour-highlight-box");

        // Задаем ширину до вычисления координат
        let boxWidth = isMobile ? window.innerWidth * 0.9 : 450;
        box.css({ width: boxWidth + 'px' });

        setTimeout(() => {
            // Центр экрана по умолчанию (если нет таргета)
            let ttTop = (window.innerHeight - box.outerHeight()) / 2;
            let ttLeft = (window.innerWidth - boxWidth) / 2;

            if (step.target && $(step.target).length && $(step.target).is(":visible")) {
                const targetEl = $(step.target)[0];
                const rect = targetEl.getBoundingClientRect();

                // 1. Рисуем рамку
                hlBox.css({
                    opacity: 1,
                    top: rect.top - 4 + "px",
                    left: rect.left - 4 + "px",
                    width: rect.width + 8 + "px",
                    height: rect.height + 8 + "px"
                });

                // 2. Умное позиционирование ИЗ СТАРОГО КОДА
                ttTop = rect.bottom + 15;
                ttLeft = rect.left + (rect.width / 2) - (boxWidth / 2);

                let boxHeight = box.outerHeight() || 200;

                // Если панель во весь экран, ставим тултип внутри неё сверху
                if (rect.height > window.innerHeight * 0.5) {
                    ttTop = Math.max(20, rect.top + window.innerHeight * 0.15);
                } 
                // Ставим НАД элементом, если не влезает снизу
                else if (ttTop + boxHeight > window.innerHeight) {
                    ttTop = rect.top - boxHeight - 15; 
                }
            } else {
                hlBox.css({ opacity: 0 }); 
            }

            // 3. ЖЕСТКИЕ ОГРАНИЧИТЕЛИ (чтобы никогда не улетало за экран)
            if (ttTop < 10) ttTop = 10;
            if (ttLeft < 10) ttLeft = 10;
            if (ttTop + box.outerHeight() > window.innerHeight) ttTop = window.innerHeight - box.outerHeight() - 10;
            if (ttLeft + boxWidth > window.innerWidth) ttLeft = window.innerWidth - boxWidth - 10;

            // 4. Применяем ТОЛЬКО пиксельные координаты без центровки средствами CSS
            box.css({
                top: ttTop + "px",
                left: ttLeft + "px",
                bottom: "auto",
                transform: "none",
                margin: "0",
                opacity: 1
            });

        }, 150); 
    }

    function endTour() {
        $("#nhud-tour-overlay, #nhud-tour-box, #nhud-tour-highlight-box").fadeOut(300, function() { $(this).remove(); });
        if (typeof closeGlobalSettings === 'function') closeGlobalSettings(); 
        import('./SettingsUI.js').then(m => { if(m.closeSettingsPanel) m.closeSettingsPanel(); }).catch(() => {});
    }

    $("#nhud-tour-next").off("click").on("click", () => { if (currentStep < steps.length - 1) { currentStep++; renderStep(); } else endTour(); });
    $("#nhud-tour-prev").off("click").on("click", () => { if (currentStep > 0) { currentStep--; renderStep(); } });
    $("#nhud-tour-skip").off("click").on("click", endTour);

    renderStep();
}
