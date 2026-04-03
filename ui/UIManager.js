// ui/UIManager.js
import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../../script.js";
import { extensionName } from "../core/constants.js";
import { NarrativeStorage } from "../storage/NarrativeStorage.js";
import { getSTContext, getUserName, getCharName, showStatus, findCharacterKey, getSTProfiles, formatPopupText } from "../utils/helpers.js";
import { getSettings, getLive, getChatTrackers, getTrackerValue, updateGlobalAvatar } from "../core/StateManager.js";
import { openRelationshipJournal, openAnalyticsPopup } from "./Modals.js";
import { showAchievementPopup, makeWindowDraggable } from "./Popups.js";
import { applyDesignTheme } from "./Design.js";
import { startInteractiveTour } from "./Tour.js";
import { toggleMiniSims, toggleMiniConn, toggleHeroSheet, toggleInventory, toggleQuestLog, toggleCodex, toggleCalendar, toggleNotifs } from "./_UIManager.internal.js";

// Re-export для обратной совместимости (index.js импортирует * as UI)
export { showAchievementPopup, makeWindowDraggable, applyDesignTheme, startInteractiveTour };
export { toggleMiniSims, renderMiniSims, toggleMiniConn, renderMiniConn, toggleHeroSheet, renderHeroSheet, toggleInventory, renderInventory, toggleQuestLog, renderQuestLog, toggleCodex, renderCodex } from "./Modules.js";

// ─── Topbar Icon ─────────────────────────────────────────────────────────
export function buildTopbarIcon() {
    if ($("#nhud-topbar-btn").length) return;
    const btn = $(`<div id="nhud-topbar-btn" class="drawer-icon fa-solid fa-scroll interactable closedIcon nhud-topbar-btn" title="Narrative HUD"></div>`);
    
    btn.on("click", () => {
        const sidebar = $("#narrative-hud-sidebar");
        if (sidebar.is(":visible")) sidebar.fadeOut(200);
        else sidebar.fadeIn(200);
    });
    
    $("#extensions-settings-button").before(btn);
}

// ─── Sidebar ─────────────────────────────────────────────────────────────
export function buildSidebar() {
    // 🔄 МАГИЯ ЗАГРУЗКИ: Вытаскиваем тему при старте
    const savedTheme = localStorage.getItem('nhud_saved_theme');
    if (savedTheme) {
        import('./Design.js').then(m => {
            if (m.applyTheme) m.applyTheme(savedTheme);
        });
    }

    if ($("#narrative-hud-sidebar").length) return;

    const settings = getSettings();
    if (!settings.ui) settings.ui = { widgetPos: { left: "20px", top: "80px" }, hudMode: "screen", hudWidth: 300 };
    const w = settings.ui.hudWidth || 300;

    $("body").append(`
        <div id="narrative-hud-sidebar" class="nhud-sidebar" style="width:${w}px;">
            <button id="nhud-mode-toggle" class="nhud-sidebar-mode-toggle">◧</button>
            
            <div class="nhud-sidebar-menu-container">
                <button id="nhud-sidebar-menu-btn" class="nhud-sidebar-menu-btn" title="Меню HUD">⋮</button>
                <div id="nhud-sidebar-dropdown" class="nhud-sidebar-dropdown">
                    <button id="nhud-manual-send" class="nhud-dropdown-item"><span class="nhud-icon-send">▶</span> Обновить данные</button>
                    <button id="nhud-toggle-widget-btn" class="nhud-dropdown-item"><span class="nhud-icon-widget">🧊</span> Скрыть/Показать виджет</button>
                    <button id="nhud-open-settings" class="nhud-dropdown-item"><span class="nhud-icon-settings">⚙️</span> Narrative HUD</button>
                    <button id="nhud-open-global-settings" class="nhud-dropdown-item"><span class="nhud-icon-global">🎨</span> Внешний вид и Система</button>
                    <button id="nhud-open-map" class="nhud-dropdown-item"><span class="nhud-icon-map">🗺️</span> Интерактивная карта</button>
                    <div class="nhud-dropdown-divider"></div>
                    <button id="nhud-sidebar-close" class="nhud-dropdown-item"><span class="nhud-icon-close">✕</span> Закрыть панель</button>
                </div>
            </div>

            <style>
                .nhud-dropdown-item:hover { background: rgba(255,255,255,0.05) !important; }
            </style>

            <div id="nhud-api-status" class="nhud-api-status"></div>
            <div id="nhud-datetime-bar" class="nhud-datetime-bar"></div>
            <div class="nhud-divider"></div>
            <div id="nhud-trackers-section" class="nhud-trackers-section"><div id="nhud-trackers-list"></div></div>
            <div class="nhud-divider"></div>
            <div id="nhud-infoblock-buttons" class="nhud-infoblock-buttons"></div>
            <div class="nhud-divider"></div>
            <div id="nhud-characters-section" class="nhud-characters-section"><div id="nhud-characters-list" class="nhud-characters-list"></div></div>
            <div id="nhud-resize-handle" class="nhud-resize-handle"></div>
        </div>
        <div id="nhud-infoblock-popup" class="nhud-infoblock-popup" style="top:${settings.design?.promptPos?.top || '100px'}; left:${settings.design?.promptPos?.left || '100px'};">
            <div id="nhud-infoblock-popup-header" class="nhud-infoblock-popup-header">
                <span id="nhud-infoblock-popup-title"></span>
                <button id="nhud-infoblock-popup-close" class="nhud-infoblock-popup-close">✕</button>
            </div>
            <div id="nhud-infoblock-popup-content" class="nhud-infoblock-popup-content"></div>
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
            let themeClass = "nhud-theme-default";
            if (block.includes('monolog')) { themeClass = "nhud-theme-monolog"; }
            else if (block.includes('comment')) { themeClass = "nhud-theme-comment"; }
            else if (block.includes('diar')) { themeClass = "nhud-theme-diar"; }
            else if (block.includes('skill')) { themeClass = "nhud-theme-skill"; }

            $("#nhud-infoblock-popup-header").attr("class", `nhud-infoblock-popup-header ${themeClass}`);
            $("#nhud-infoblock-popup-title").text($(this).text());
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
    $("#nhud-open-map").on("click", () => { import('../map/MapRenderer.js').then(m => m.toggleMap(true)); $("#nhud-sidebar-dropdown").fadeOut(150); });
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
        let html = `<div class="nhud-datetime-content">`;
        if (loc) html += `<div class="nhud-datetime-location">📍 ${loc}</div>`;
        
        let subHtml = [];
        if (weath) subHtml.push(`🌤️ <span class="nhud-datetime-weather">${weath}</span>`);
        if (time) subHtml.push(`🕰️ <span class="nhud-datetime-time">${time}</span>`);
        
        if (subHtml.length > 0) {
            html += `<div class="nhud-datetime-sub">${subHtml.join('')}</div>`;
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
            <div id="nhud-relationships-section" class="nhud-relationships-section">
                <div id="nhud-relationships-list" class="nhud-relationships-list"></div>
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

    container.append('<div class="nhud-relationships-title">Трекер отношений</div>');

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
        name.toLowerCase() !== userName.toLowerCase() && 
        !name.toLowerCase().includes('system') &&
        !live.characters[name].isHiddenFromScene
    );

    if (!charNames.length) {
        container.append(`<div class="nhud-no-chars">Нет персонажей в этом чате</div>`);
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
            ? `<img src="${globalChar.avatar}" class="nhud-character-avatar" onerror="this.style.display='none'"/>`
            : `<div class="nhud-character-avatar-placeholder">${name[0].toUpperCase()}</div>`;

        const showEmoji = settings.design?.showStatusEmojis !== false;
        let outfitStr = '';
        if (liveData.outfit && typeof liveData.outfit === 'object') {
            const slots = [liveData.outfit.head, liveData.outfit.torso, liveData.outfit.legs, liveData.outfit.feet, liveData.outfit.accessories].filter(Boolean);
            outfitStr = slots.join(', ');
        } else if (typeof liveData.outfit === 'string' && liveData.outfit) {
            outfitStr = liveData.outfit;
        }
        const outfit = outfitStr ? `<div class="nhud-character-outfit">${showEmoji ? '👗 ' : ''}${outfitStr}</div>` : '';
        const state = liveData.state ? `<div class="nhud-character-state">${showEmoji ? '🎭 ' : ''}${liveData.state}</div>` : '';
        const formattedThoughts = liveData.thoughts ? formatPopupText(liveData.thoughts) : '';

        if (tMode === "unified" && liveData.thoughts) {
             unifiedThoughtsContent += `
                <div class="nhud-unified-thought-item">
                    <div class="nhud-unified-thought-name">${name}</div>
                    <div class="nhud-unified-thought-content">${formattedThoughts}</div>
                </div>`;
        }

        const individualThoughtsHtml = (tMode === "individual" && liveData.thoughts) 
            ? `<div class="nhud-character-thoughts">
                 <div class="nhud-character-thoughts-title">💭 Мысли:</div>
                 ${formattedThoughts}
               </div>`
            : '';

        const card = $(`
            <div class="nhud-character-card">
                <div class="nhud-character-avatar-wrapper">${avatarHtml}</div>
                <div class="nhud-character-info">
                    <div class="nhud-character-name">
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
        const unifiedBtn = $(`<button class="nhud-info-btn nhud-unified-thoughts-btn">💭 Сводка мыслей</button>`);
        
        unifiedBtn.hover(
            function() { $(this).addClass("nhud-unified-thoughts-btn-hover"); },
            function() { $(this).removeClass("nhud-unified-thoughts-btn-hover"); }
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
        <div id="nhud-widget-container" class="nhud-widget-container" style="left:${pos.left}; top:${pos.top};">
            <div id="nhud-widget" class="nhud-widget nhud-layout-${wLayout}">
                <div class="nhud-w-btn" id="nhud-w-settings" title="Настройки">⚙️</div>
                <div class="nhud-w-btn" id="nhud-w-hud" title="HUD">📊</div>
                <div class="nhud-w-btn" id="nhud-w-sims" title="Отношения">❤️</div>
                <div class="nhud-w-btn" id="nhud-w-conn" title="Подключение">🔌</div>
                <div class="nhud-w-btn nhud-w-btn-hero" id="nhud-w-hero" title="Прокачка">🧬</div>
                <div class="nhud-w-btn nhud-w-btn-inv" id="nhud-w-inv" title="Инвентарь">🎒</div>
                <div class="nhud-w-btn nhud-w-btn-quests" id="nhud-w-quests" title="Квесты">📜</div>
                <div class="nhud-w-btn nhud-w-btn-calendar" id="nhud-w-calendar" title="Календарь">📅</div>
                <div class="nhud-w-btn nhud-w-btn-codex" id="nhud-w-codex" title="Кодекс">📖</div>
                <div class="nhud-w-btn nhud-w-btn-notifs" id="nhud-w-notifs" title="Уведомления">🔔</div>
            </div>
            <button id="nhud-w-rotate" class="nhud-w-rotate" title="Сменить раскладку">⟳</button>
        </div>
    `);
    
    let styleTag = document.getElementById("nhud-widget-styles");
    if (!styleTag) {
        $("<style id='nhud-widget-styles'>").text(`
            .nhud-w-btn:hover { background: var(--nhud-border, #501020) !important; box-shadow: inset 0 0 5px rgba(255,100,100,0.3); }
            #nhud-widget-container:active { cursor: grabbing !important; }
            .nhud-layout-square { grid-template-columns: 1fr 1fr; width:60px; }
            .nhud-layout-vertical { grid-template-columns: 1fr; width:30px; }
            .nhud-layout-horizontal { grid-template-columns: repeat(10, 1fr); width:300px; }
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

    $("#nhud-w-settings").on("click", (e) => { e.stopPropagation(); import('./SettingsUI.js').then(m => $("#nhud-settings-panel").is(":visible") ? m.closeSettingsPanel?.() : m.openSettingsPanel?.()); });
    $("#nhud-w-hud").on("click", (e) => { e.stopPropagation(); $("#narrative-hud-sidebar").fadeToggle(200); });
    $("#nhud-w-sims").on("click", (e) => { e.stopPropagation(); toggleMiniSims(); });
    $("#nhud-w-conn").on("click", (e) => { e.stopPropagation(); toggleMiniConn(); });
    $("#nhud-w-hero").on("click", (e) => { e.stopPropagation(); toggleHeroSheet(); });
    $("#nhud-w-inv").on("click", (e) => { e.stopPropagation(); toggleInventory(); });
    $("#nhud-w-quests").on("click", (e) => { e.stopPropagation(); toggleQuestLog(); });
    $("#nhud-w-codex").on("click", (e) => { e.stopPropagation(); toggleCodex(); });
    $("#nhud-w-notifs").on("click", (e) => { e.stopPropagation(); $("#nhud-notif-panel").fadeToggle(200); });
    $("#nhud-w-calendar").on("click", (e) => { e.stopPropagation(); toggleCalendar(); });
    
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
        <div id="nhud-global-settings" class="nhud-global-settings">
            <div class="nhud-global-header">
                <span class="nhud-global-title">🎨 Внешний вид и Система</span>
                <button id="nhud-global-close" class="nhud-global-close">✕</button>
            </div>
            
            <div class="nhud-g-tabs">
                <button class="nhud-g-tab active" data-tab="visuals">🎨 Внешний вид</button>
                <button class="nhud-g-tab" data-tab="system">⚙️ Система</button>
                <button class="nhud-g-tab" data-tab="faq">❓ FAQ & Обучение</button>
            </div>
            
            <div id="nhud-global-content" class="nhud-global-content">
                <div class="nhud-g-tab-content active" data-tab="visuals">
                    <div class="nhud-design-section" style="padding: 0 0 15px 0;">
                        <div class="nhud-subsection-title" style="font-size: 14px; text-align: center; margin-bottom: 10px;">✨ Пресеты Дизайна</div>
                        <div id="nhud-theme-selector" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 15px;">
                            <button class="nhud-theme-btn" data-theme="classic">🟣 Классика (ST)</button>
                            <button class="nhud-theme-btn" data-theme="glass">🧊 Жидкое стекло</button>
                            <button class="nhud-theme-btn" data-theme="cyber">🤖 Aether Terminal</button>
                            <button class="nhud-theme-btn" data-theme="fantasy">📜 Древний свиток</button>
                        </div>
                        <div class="nhud-theme-actions" style="display: flex; gap: 8px;">
                            <button id="nhud-theme-mimic" class="nhud-send-btn" style="font-size: 11px; padding: 6px;">🎭 Копировать цвета ST</button>
                            <button id="nhud-theme-reset" class="nhud-send-btn" style="font-size: 11px; padding: 6px; background: rgba(200, 50, 80, 0.2); border-color: #802030; color: #e08080;">🔄 Сброс ручных настроек</button>
                        </div>
                    </div>

                    <details class="nhud-design-acc" open>
                        <summary class="nhud-cen-head">⚙️ 1. Левая панель (Настройки)</summary>
                        <div class="nhud-design-section">
                            <div class="nhud-field-group">
                                <label>Режим вкладок</label>
                                <select id="nhud-d-tabsMode" class="nhud-select">
                                    <option value="top-text" ${ui.tabsMode === 'top-text' ? 'selected' : ''}>Сверху (Иконка + Текст)</option>
                                    <option value="top-icon" ${ui.tabsMode === 'top-icon' ? 'selected' : ''}>Сверху (Только иконки)</option>
                                    <option value="side-icon" ${ui.tabsMode === 'side-icon' ? 'selected' : ''}>Сбоку (Только иконки)</option>
                                </select>
                            </div>
                            
                            <div class="nhud-color-grid">
                                <div><label class="nhud-label-small">Цвет фона</label><input id="nhud-d-leftBgC" type="color" value="${d.leftBgC || '#140a0f'}" class="nhud-color-input"/></div>
                                <div><label class="nhud-label-small">Прозрачность фона</label><input id="nhud-d-leftBgO" type="range" min="0" max="1" step="0.05" value="${d.leftBgO ?? 0.95}" class="nhud-range-input"/></div>
                                <div class="nhud-full-width"><input id="nhud-d-leftBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.leftBgI || ''}" /></div>

                                <div><label class="nhud-label-small">Цвет границ</label><input id="nhud-d-border" type="color" value="${d.borderColor || '#4a1525'}" class="nhud-color-input"/></div>
                                <div><label class="nhud-label-small">Тус. текст</label><input id="nhud-d-textMu" type="color" value="${d.textMuted || '#a08080'}" class="nhud-color-input"/></div>

                                <div><label class="nhud-label-small">Цвет текста</label><input id="nhud-d-leftTxtC" type="color" value="${d.leftTxtC || '#e0b0b0'}" class="nhud-color-input"/></div>
                                <div><label class="nhud-label-small">Размер текста (px)</label><input id="nhud-d-leftTxtS" type="number" value="${d.leftTxtS || 12}" class="nhud-input nhud-number-input"/></div>
                            </div>

                            <div class="nhud-design-subsection">
                                <div class="nhud-subsection-title">Заголовки и Гармошки</div>
                                <div class="nhud-color-grid">
                                    <div><label class="nhud-label-tiny">Цвет текста заг.</label><input id="nhud-d-leftHeadTxtC" type="color" value="${d.leftHeadTxtC || d.accent || '#d05070'}" class="nhud-color-input-small"/></div>
                                    <div><label class="nhud-label-tiny">Размер заг. (px)</label><input id="nhud-d-leftHeadS" type="number" value="${d.leftHeadS || 13}" class="nhud-input nhud-number-input-small"/></div>
                                    <div><label class="nhud-label-tiny">Цвет фона (шапки)</label><input id="nhud-d-leftHeadC" type="color" value="${d.leftHeadC || '#000000'}" class="nhud-color-input-small"/></div>
                                    <div><label class="nhud-label-tiny">Прозрачность шапки</label><input id="nhud-d-leftHeadO" type="range" min="0" max="1" step="0.05" value="${d.leftHeadO ?? 0.2}" class="nhud-range-input"/></div>
                                </div>
                            </div>

                            <div class="nhud-design-subsection">
                                <div class="nhud-subsection-title">Поля ввода (Inputs)</div>
                                <div class="nhud-color-grid">
                                    <div><label class="nhud-label-tiny">Цвет полей</label><input id="nhud-d-leftInpC" type="color" value="${d.leftInpC || '#000000'}" class="nhud-color-input-small"/></div>
                                    <div><label class="nhud-label-tiny">Прозрачность</label><input id="nhud-d-leftInpO" type="range" min="0" max="1" step="0.05" value="${d.leftInpO ?? 0.3}" class="nhud-range-input"/></div>
                                </div>
                            </div>
                        </div>
                    </details>
                    
                    <details class="nhud-design-acc" open>
                        <summary class="nhud-cen-head">📊 2. Правая панель (HUD)</summary>
                        <div class="nhud-design-section">
                            <div class="nhud-field-group">
                                <label>Отображение мыслей (💭)</label>
                                <select id="nhud-d-thoughtsMode" class="nhud-select">
                                    <option value="individual" ${ui.thoughtsMode === 'individual' ? 'selected' : ''}>У каждого персонажа</option>
                                    <option value="unified" ${ui.thoughtsMode === 'unified' ? 'selected' : ''}>Единым окном (Кнопка)</option>
                                </select>
                            </div>
                            <label class="nhud-checkbox-label">
                                <input type="checkbox" id="nhud-d-showEmoji" ${d.showStatusEmojis !== false ? 'checked' : ''}> Показывать смайлики (👗, 🎭)
                            </label>
                            <div class="nhud-design-subsection">
                                <label class="nhud-checkbox-label nhud-checkbox-label-block">
                                    <input type="checkbox" id="nhud-d-barDyn" ${d.barDynamic !== false ? 'checked' : ''}> Градиент полосок (от %%)
                                </label>
                                <div class="nhud-bar-colors">
                                    <input id="nhud-d-barS" type="color" value="${d.barColorStart || '#52e0a3'}" class="nhud-color-input-tiny"/> <span class="nhud-bar-label">100%</span>
                                    <input id="nhud-d-barE" type="color" value="${d.barColorEnd || '#e05252'}" class="nhud-color-input-tiny"/> <span class="nhud-bar-label">0%</span>
                                </div>
                            </div>
                            <div class="nhud-color-grid">
                                <div><label class="nhud-label-small">Цвет фона</label><input id="nhud-d-hudBgC" type="color" value="${d.hudBgC || '#140a0f'}" class="nhud-color-input"/></div>
                                <div><label class="nhud-label-small">Прозрачность фона</label><input id="nhud-d-hudBgO" type="range" min="0" max="1" step="0.05" value="${d.hudBgO ?? 0.95}" class="nhud-range-input"/></div>
                                <div class="nhud-full-width"><input id="nhud-d-hudBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.hudBgI || ''}" /></div>
                                
                                <div><label class="nhud-label-small">Цвет текста</label><input id="nhud-d-hudTxtC" type="color" value="${d.hudTxtC || '#e0b0b0'}" class="nhud-color-input"/></div>
                                <div><label class="nhud-label-small">Размер текста (px)</label><input id="nhud-d-hudTxtS" type="number" value="${d.hudTxtS || 12}" class="nhud-input nhud-number-input"/></div>
                            </div>

                            <div class="nhud-design-subsection">
                                <div class="nhud-subsection-title">Поля ввода (Inputs)</div>
                                <div class="nhud-color-grid">
                                    <div><label class="nhud-label-tiny">Цвет полей</label><input id="nhud-d-hudInpC" type="color" value="${d.hudInpC || '#000000'}" class="nhud-color-input-small"/></div>
                                    <div><label class="nhud-label-tiny">Прозрачность</label><input id="nhud-d-hudInpO" type="range" min="0" max="1" step="0.05" value="${d.hudInpO ?? 0.3}" class="nhud-range-input"/></div>
                                </div>
                            </div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" open>
                        <summary class="nhud-cen-head">🎨 3. Центральное окно (Где мы сейчас)</summary>
                        <div class="nhud-design-section nhud-color-grid">
                            <div><label class="nhud-label-small">Цвет фона</label><input id="nhud-d-cenBgC" type="color" value="${d.cenBgC || '#151220'}" class="nhud-color-input"/></div>
                            <div><label class="nhud-label-small">Прозрачность фона</label><input id="nhud-d-cenBgO" type="range" min="0" max="1" step="0.05" value="${d.cenBgO ?? 0.98}" class="nhud-range-input"/></div>
                            <div class="nhud-full-width"><input id="nhud-d-cenBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.cenBgI || ''}" /></div>
                            
                            <div><label class="nhud-label-small">Цвет текста</label><input id="nhud-d-cenTxtC" type="color" value="${d.cenTxtC || '#e0c0c0'}" class="nhud-color-input"/></div>
                            <div><label class="nhud-label-small">Размер текста (px)</label><input id="nhud-d-cenTxtS" type="number" value="${d.cenTxtS || 12}" class="nhud-input nhud-number-input"/></div>
                            
                            <div class="nhud-full-width nhud-subsection-divider">
                                <div class="nhud-subsection-title">Заголовки и Гармошки</div>
                            </div>
                            <div><label class="nhud-label-tiny">Цвет текста заг.</label><input id="nhud-d-cenHeadTxtC" type="color" value="${d.cenHeadTxtC || '#e0c0c0'}" class="nhud-color-input-small"/></div>
                            <div><label class="nhud-label-tiny">Размер заг. (px)</label><input id="nhud-d-cenHeadS" type="number" value="${d.cenHeadS || 14}" class="nhud-input nhud-number-input-small"/></div>
                            <div><label class="nhud-label-tiny">Цвет фона (шапки)</label><input id="nhud-d-cenHeadC" type="color" value="${d.cenHeadC || '#2a101a'}" class="nhud-color-input-small"/></div>
                            <div><label class="nhud-label-tiny">Прозрачность шапки</label><input id="nhud-d-cenHeadO" type="range" min="0" max="1" step="0.05" value="${d.cenHeadO ?? 0.3}" class="nhud-range-input"/></div>

                            <div class="nhud-full-width nhud-subsection-divider">
                                <div class="nhud-subsection-title">Поля ввода (Inputs)</div>
                            </div>
                            <div><label class="nhud-label-tiny">Цвет полей</label><input id="nhud-d-cenInpC" type="color" value="${d.cenInpC || '#000000'}" class="nhud-color-input-small"/></div>
                            <div><label class="nhud-label-tiny">Прозрачность</label><input id="nhud-d-cenInpO" type="range" min="0" max="1" step="0.05" value="${d.cenInpO ?? 0.2}" class="nhud-range-input"/></div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" open>
                        <summary class="nhud-cen-head">💬 4. Всплывающие окна (Инвентарь, Промпты...)</summary>
                        <div class="nhud-design-section nhud-color-grid">
                            <div class="nhud-field-group nhud-full-width"><label>Ширина окна промптов (px)</label><input id="nhud-d-prmW" class="nhud-input nhud-number-input" type="number" min="200" max="800" value="${d.promptWidth || 300}" /></div>
                            
                            <label class="nhud-checkbox-label nhud-full-width">
                                <input type="checkbox" id="nhud-d-prmMerge" ${d.promptMerged ? 'checked' : ''}> Слить шапку с фоном (Монолит)
                            </label>
                            
                            <div><label class="nhud-label-small">Цвет шапки окна</label><input id="nhud-d-popHeadC" type="color" value="${d.popHeadC || '#2a101a'}" class="nhud-color-input"/></div>
                            <div><label class="nhud-label-small">Прозр. шапки окна</label><input id="nhud-d-popHeadO" type="range" min="0" max="1" step="0.05" value="${d.popHeadO ?? 1}" class="nhud-range-input"/></div>

                            <div><label class="nhud-label-small">Цвет фона</label><input id="nhud-d-popBgC" type="color" value="${d.popBgC || '#1a0a10'}" class="nhud-color-input"/></div>
                            <div><label class="nhud-label-small">Прозрачность фона</label><input id="nhud-d-popBgO" type="range" min="0" max="1" step="0.05" value="${d.popBgO ?? 0.95}" class="nhud-range-input"/></div>
                            <div class="nhud-full-width"><input id="nhud-d-popBgI" class="nhud-input" type="text" placeholder="URL картинки фона..." value="${d.popBgI || ''}" /></div>
                            
                            <div><label class="nhud-label-small">Цвет текста</label><input id="nhud-d-popTxtC" type="color" value="${d.popTxtC || '#e0b0b0'}" class="nhud-color-input"/></div>
                            <div><label class="nhud-label-small">Размер текста (px)</label><input id="nhud-d-popTxtS" type="number" value="${d.popTxtS || 14}" class="nhud-input nhud-number-input"/></div>

                            <div class="nhud-full-width nhud-subsection-divider">
                                <div class="nhud-subsection-title">Поля ввода (Inputs)</div>
                            </div>
                            <div><label class="nhud-label-tiny">Цвет полей</label><input id="nhud-d-popInpC" type="color" value="${d.popInpC || '#000000'}" class="nhud-color-input-small"/></div>
                            <div><label class="nhud-label-tiny">Прозрачность</label><input id="nhud-d-popInpO" type="range" min="0" max="1" step="0.05" value="${d.popInpO ?? 0.3}" class="nhud-range-input"/></div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" open>
                        <summary class="nhud-cen-head">🧊 5. Плавающий виджет и CSS</summary>
                        <div class="nhud-design-section nhud-color-grid">
                            <div><label class="nhud-label-medium">Фон кубика</label><input id="nhud-d-widC" type="color" value="${d.widBgColor || '#140a0f'}" class="nhud-color-input"/></div>
                            <div><label class="nhud-label-medium">Прозрачность кубика</label><input id="nhud-d-widO" type="range" min="0" max="1" step="0.05" value="${d.widBgOpacity ?? 0.95}" class="nhud-range-input"/></div>
                            <div class="nhud-full-width"><input id="nhud-d-widI" class="nhud-input" type="text" placeholder="URL картинки для кубика..." value="${d.widBgImage || ''}" /></div>
                            
                            <div><label class="nhud-label-medium">Цвет текста/иконок</label><input id="nhud-d-widTxtC" type="color" value="${d.widTxtC || '#ffffff'}" class="nhud-color-input"/></div>
                            <div><label class="nhud-label-medium">Размер иконок (px)</label><input id="nhud-d-widTxtS" type="number" value="${d.widTxtS || 14}" class="nhud-input nhud-number-input"/></div>

                            <div class="nhud-full-width nhud-accent-row">
                                <input id="nhud-d-accent" type="color" value="${d.accent || '#d05070'}" class="nhud-color-input-accent"/>
                                <label class="nhud-label-medium">Основной акцентный цвет (Кнопки, иконки)</label>
                            </div>
                            <textarea id="nhud-d-css" class="nhud-textarea" rows="4" placeholder="/* Твой CSS код */" style="grid-column: span 2;">${d.customCss || ''}</textarea>
                        </div>
                    </details>
                </div>

                <div class="nhud-g-tab-content" data-tab="system">
                <details class="nhud-design-acc nhud-tokens-acc" open>
                        <summary class="nhud-cen-head nhud-cen-head-danger">📊 Расход токенов (Примерная оценка)</summary>
                        <div class="nhud-tokens-section">
                            <div class="nhud-token-row"><span>Системные инструкции:</span><span id="nhud-tokens-sys">0</span></div>
                            <div class="nhud-token-row"><span>Кастомные блоки:</span><span id="nhud-tokens-custom">0</span></div>
                            <div class="nhud-token-row"><span>Структура JSON (Скелет):</span><span>190</span></div>
                            <div class="nhud-token-divider"></div>
                            <div class="nhud-token-row nhud-token-total"><span>Итого к запросу:</span><span><span id="nhud-tokens-total">0</span> токенов</span></div>
                            <div class="nhud-token-note">* Оценка примерная. 1 токен ≈ 4 англ. символа или 2 рус. символа. Зависит от модели.</div>
                        </div>
                    </details>
                    <div class="nhud-prompt-section">
                        <label class="nhud-prompt-label">🌐 Язык ответов (Language)</label>
                        <input id="nhud-p-lang" class="nhud-input" type="text" value="${p.language || 'Russian'}" />
                        <label class="nhud-prompt-label">🧠 Главный системный промпт</label>
                        <textarea id="nhud-p-sys" class="nhud-textarea" rows="3">${p.system}</textarea>
                    </div>

                    <div class="nhud-modules-grid">
                        <div class="nhud-module-card">
                            <label class="nhud-checkbox-group nhud-checkbox-blue"><input type="checkbox" id="nhud-m-trackers" ${m.trackers?'checked':''}> 📊 Трекеры (Здоровье и др.)</label>
                            <textarea id="nhud-p-trackers" class="nhud-textarea" rows="2" placeholder="Промпт...">${p.trackersPrompt}</textarea>
                        </div>

                        <div class="nhud-module-card">
                            <label class="nhud-checkbox-group nhud-checkbox-pink"><input type="checkbox" id="nhud-m-calendar" ${m.calendar !== false ? 'checked' : ''}> 📅 Календарь событий</label>
                            <textarea id="nhud-p-calendar" class="nhud-textarea" rows="2" placeholder="Промпт...">${p.calendarPrompt || ''}</textarea>
                        </div>
                        
                        <div class="nhud-module-card">
                            <label class="nhud-checkbox-group nhud-checkbox-purple"><input type="checkbox" id="nhud-m-chars" ${m.characters?'checked':''}> 👥 Персонажи (Одежда/Мысли)</label>
                            <textarea id="nhud-p-chars" class="nhud-textarea" rows="2" placeholder="Промпт...">${p.charsPrompt}</textarea>
                        </div>

                        <div class="nhud-module-card">
                            <label class="nhud-checkbox-group nhud-checkbox-gold"><input type="checkbox" id="nhud-m-date" ${m.datetime?'checked':''}> 🌤️ Дата, время и погода</label>
                            <textarea id="nhud-p-date" class="nhud-textarea" rows="2" placeholder="Промпт...">${p.datetimePrompt}</textarea>
                        </div>

                        <div class="nhud-module-card">
                            <label class="nhud-checkbox-group nhud-checkbox-green"><input type="checkbox" id="nhud-m-achievements" ${m.achievements?'checked':''}> 🏆 Ачивки (Зал Славы)</label>
                            <textarea id="nhud-p-ach" class="nhud-textarea" rows="2" placeholder="Промпт...">${p.achievementsPrompt}</textarea>
                        </div>

                        <div class="nhud-module-card">
                            <label class="nhud-checkbox-group nhud-checkbox-blue"><input type="checkbox" id="nhud-m-hero" ${m.hero !== false ? 'checked' : ''}> 🧬 Герой (Опыт и Статы)</label>
                            <textarea id="nhud-p-hero" class="nhud-textarea" rows="2" placeholder="Промпт...">${p.heroPrompt}</textarea>
                        </div>

                        <div class="nhud-module-card">
                            <label class="nhud-checkbox-group nhud-checkbox-gold"><input type="checkbox" id="nhud-m-quests" ${m.quests !== false ? 'checked' : ''}> 📜 Журнал квестов</label>
                            <textarea id="nhud-p-quests" class="nhud-textarea" rows="2" placeholder="Промпт...">${p.questsPrompt || 'If a new quest starts or an active one updates/finishes, generate a "quests" array containing objects with "title", "desc", and "status" (active/completed/failed).'}</textarea>
                        </div>

                        <div class="nhud-module-card">
                            <label class="nhud-checkbox-group nhud-checkbox-purple"><input type="checkbox" id="nhud-m-codex" ${m.codex !== false ? 'checked' : ''}> 📖 Сюжетный Кодекс</label>
                            <textarea id="nhud-p-codex" class="nhud-textarea" rows="2" placeholder="Промпт...">${p.codexPrompt || "If you introduce new important lore, factions, secrets, or concepts, unlock a lorebook entry using the JSON field 'codex_unlocked' containing 'title' and 'text'."}</textarea>
                        </div>
                        
                        <div class="nhud-module-card">
                            <label class="nhud-checkbox-group nhud-checkbox-danger"><input type="checkbox" id="nhud-m-factions" ${m.factions !== false ? 'checked' : ''}> 🏴‍☠️ Фракции (Репутация)</label>
                            <textarea id="nhud-p-factions" class="nhud-textarea" rows="2" placeholder="Промпт...">${p.factionsPrompt || 'If the user interacts with factions, update their reputation using the JSON object "factions" (e.g. {"Faction Name": 60}).'}</textarea>
                        </div>
                    </div>

                    <div class="nhud-modules-extra">
                        <div class="nhud-modules-extra-title">Модули без промптов (работают локально или вшиты):</div>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-rel" ${m.relationships?'checked':''}> ❤️ Отношения (Трекер)</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-inv" ${m.inventory !== false ? 'checked' : ''}> 🎒 Имущество (Инвентарь/Деньги)</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-thoughts" ${m.thoughts?'checked':''}> 💭 Мысли персонажей</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-blocks" ${m.customBlocks?'checked':''}> 🧩 Кастомные блоки</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-analytics" ${m.analytics !== false ? 'checked':''}> 📈 Графики аналитики</label>
                        <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-blocksUI" ${m.beautifulBlocks !== false ? 'checked' : ''}> ✨ Красивые инфоблоки внутри чата (БЕЗ токенов)</label>

                        <div class="nhud-modules-extra-section">
                            <label class="nhud-checkbox-group nhud-checkbox-pink"><input type="checkbox" id="nhud-m-outfitStats" ${m.enableOutfitStats ? 'checked' : ''}> 👗 Статы одежды (описание + бонусы)</label>
                            <label class="nhud-checkbox-group nhud-checkbox-pink"><input type="checkbox" id="nhud-m-outfitTrack" ${m.enableOutfitTracking !== false ? 'checked' : ''}> 👗 Отслеживание гардероба ИИ</label>
                            <label class="nhud-checkbox-group nhud-checkbox-blue"><input type="checkbox" id="nhud-m-notifications" ${m.notifications !== false ? 'checked' : ''}> 📨 Контекстные уведомления</label>
                            <label class="nhud-checkbox-group nhud-checkbox-green"><input type="checkbox" id="nhud-m-trackPlayer" ${m.trackPlayerInventory !== false ? 'checked' : ''}> 🎒 Авто-инвентарь Игрока</label>
                            <label class="nhud-checkbox-group nhud-checkbox-gold"><input type="checkbox" id="nhud-m-trackBot" ${m.trackBotInventory !== false ? 'checked' : ''}> 🤖 Авто-инвентарь Бота</label>
                            <label class="nhud-checkbox-group nhud-checkbox-purple"><input type="checkbox" id="nhud-m-injectOutfit" ${m.injectPlayerOutfit ? 'checked' : ''}> 👤 Инжекция гардероба Игрока в промпт</label>
                            <div class="nhud-field-inline">
                                <label class="nhud-label-tiny">📱 Название устройства связи</label>
                                <input id="nhud-p-deviceName" class="nhud-input" type="text" value="${p.notificationDeviceName || 'Смартфон'}" />
                            </div>
                            <div class="nhud-field-inline">
                                <label class="nhud-label-tiny">💰 Уровень достатка Бота</label>
                                <textarea id="nhud-p-botWealth" class="nhud-textarea nhud-textarea-small" rows="2">${p.botWealthStatus || ''}</textarea>
                            </div>
                        </div>

                        <div class="nhud-modules-extra-section">
                            <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-lore" ${m.loreInjection?'checked':''}> 🧠 Динамическая память (Вшивка лора)</label>
                            <div class="nhud-field-group nhud-field-inline">
                                <span class="nhud-label-tiny">Куда вшивать память:</span>
                                <select id="nhud-m-lore-mode" class="nhud-select">
                                    <option value="system" ${m.loreMode === 'system' || !m.loreMode ? 'selected' : ''}>⚙️ В Системный промпт (Надежно)</option>
                                    <option value="user" ${m.loreMode === 'user' ? 'selected' : ''}>👤 В последнее сообщение</option>
                                    <option value="note" ${m.loreMode === 'note' ? 'selected' : ''}>📝 Как Заметку Автора</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                 <div class="nhud-g-tab-content" data-tab="faq">
                     <div class="nhud-faq-container">
                         <div class="nhud-faq-icon">🎓</div>
                         <h3 class="nhud-faq-title">Добро пожаловать в Narrative HUD!</h3>
                         <p class="nhud-faq-text">Пройдите краткий интерактивный тур, чтобы узнать, как пользоваться всеми панелями.</p>
                         <button id="nhud-start-tour-btn" class="nhud-send-btn nhud-tour-btn">🚀 Запустить обучение</button>
                     </div>

                     <details class="nhud-design-acc" style="margin-top: 15px;">
                         <summary class="nhud-cen-head">🗺️ FAQ: Интерактивная карта</summary>
                         <div class="nhud-faq-map-content" style="padding: 12px; line-height: 1.6; font-size: 13px; color: inherit;">
                             <p style="margin-bottom: 10px;"><strong>❓ Что делает карта и зачем она нужна?</strong><br>Карта позволяет визуально расставлять локации, ориентиры и персонажей. Все расстояния автоматически переводятся в метры и передаются в промпт ИИ. Благодаря этому бот чуть лучше понимает пространство: кто где находится, насколько близко персонажи, и реагирует на окружение реалистично.</p>
                             
                             <p style="margin-bottom: 10px;"><strong>❓ Как открыть карту?</strong><br>Нажмите на кнопку карты в панели ⋮. Окно можно перетаскивать за шапку и менять размер, потянув за правый нижний угол.</p>
                             
                             <p style="margin-bottom: 10px;"><strong>❓ Как настроить фон и масштаб?</strong><br>Нажмите 🖼️ в шапке, чтобы загрузить изображение карты (какой угодно - она для вас, а не для ИИ). Кликните на надпись 📏 50px/м и введите, сколько пикселей на картинке = 1 метр. ⚠️ Без корректного масштаба ИИ будет неверно оценивать расстояния! Что бы проще представлять масштаб - есть сетка ⊞.</p>
                             
                             <p style="margin-bottom: 10px;"><strong>❓ Как создавать зоны и якоря?</strong><br><b>Зоны (комнаты/локации):</b> Выберите ⬜. Кликайте по углам (хоть буквой Г, хоть как) будущей области. Двойной клик или клик рядом с первой точкой завершит полигон. Введите имя.<br><b>Якоря (мебель, метки, точки интереса):</b> Выберите 📌. Зажмите ЛКМ и потяните, чтобы нарисовать прямоугольник. Отпустите и введите имя. Якоря помогают ИИ точнее привязывать действия к месту.</p>
                             
                             <p style="margin-bottom: 10px;"><strong>❓ Как двигать персонажей и добавлять NPC?</strong><br>Выберите 👆. Перетаскивайте красную метку (Игрок) и синюю (Бот). Чтобы добавить NPC, нажмите 🎭 и кликните в нужное место. Имена и цвета меняются через правый клик по метке.</p>
                             
                             <p style="margin-bottom: 10px;"><strong>❓ Как карта влияет на диалог с ИИ?</strong><br>Когда красная метка (Игрок) находится внутри зоны, в промпт автоматически добавляется блок [ПРОСТРАНСТВЕННЫЙ КОНТЕКСТ]. ИИ получает: текущую локацию, расстояние до бота, ближайших NPC и примерные размеры комнат. Если игрок вне зон, контекст не инжектится.</p>
                             
                             <p style="margin-bottom: 10px;"><strong>❓ Что такое архив карт?</strong><br>💾 сохраняет текущее состояние карты под именем. 📂 открывает список сохранений для загрузки или удаления. Удобно для переключения между сценами или сохранения прогресса.</p>
                             
                             <p style="margin-bottom: 10px;"><strong>❓ Полезные инструменты в панели</strong><br>✏️ Редактирование: перетаскивайте вершины зон или двигайте якоря.<br>👁️ Туман войны: скрывает зоны и якоря (только визуально), оставляя только фон и персонажей.<br>⊞ / 📐: включают сетку (1 клетка = 1 метр) и координатную линейку.<br>🔄: полный сброс карты к начальному состоянию.</p>
                             
                             <p><strong>❓ Может ли ИИ сам двигать персонажей по карте?</strong><br>Да. ИИ может отправлять команды move, spawn, remove. Карта обновится автоматически, а бот сможет менять своё положение или добавлять NPC прямо в процессе ролевой игры.</p>
                         </div>
                     </details>
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

    const modBinds = { trackers: '#nhud-m-trackers', relationships: '#nhud-m-rel', characters: '#nhud-m-chars', thoughts: '#nhud-m-thoughts', customBlocks: '#nhud-m-blocks', datetime: '#nhud-m-date', analytics: '#nhud-m-analytics', loreInjection: '#nhud-m-lore', achievements: '#nhud-m-achievements', hero: '#nhud-m-hero', inventory: '#nhud-m-inv', quests: '#nhud-m-quests', codex: '#nhud-m-codex', factions: '#nhud-m-factions', calendar: '#nhud-m-calendar', enableOutfitStats: '#nhud-m-outfitStats', enableOutfitTracking: '#nhud-m-outfitTrack', notifications: '#nhud-m-notifications', trackPlayerInventory: '#nhud-m-trackPlayer', trackBotInventory: '#nhud-m-trackBot', injectPlayerOutfit: '#nhud-m-injectOutfit' };
    for (const [key, id] of Object.entries(modBinds)) {
        $(id).on("change", e => { getSettings().modules[key] = e.target.checked; saveAndApply(); });
    }

    $("#nhud-p-lang").on("input", e => { getSettings().prompts.language = e.target.value; saveAndApply(); });
    $("#nhud-p-deviceName").on("input", e => { getSettings().prompts.notificationDeviceName = e.target.value; saveAndApply(); });
    $("#nhud-p-botWealth").on("input", e => { getSettings().prompts.botWealthStatus = e.target.value; saveAndApply(); });
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
    // Логика переключения тем
    $("#nhud-global-settings").off("click", ".nhud-theme-btn").on("click", ".nhud-theme-btn", function() {
        const themeName = $(this).data("theme");
        import('./Design.js').then(m => {
            m.applyTheme(themeName);
            toastr.success(`Тема изменена: ${m.themePresets[themeName].name}`);
            
            // 💾 МАГИЯ СОХРАНЕНИЯ: Записываем в память браузера
            localStorage.setItem('nhud_saved_theme', themeName);
        });
    });
    
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
        $(".nhud-g-tab").removeClass("active").addClass("inactive");
        $(this).addClass("active").removeClass("inactive");
        $(".nhud-g-tab-content").hide();
        $(`.nhud-g-tab-content[data-tab="${tab}"]`).css("display", "flex").hide().fadeIn(200);
    });
    
    $(document).off("click", "#nhud-global-close").on("click", "#nhud-global-close", closeGlobalSettings);
    
    $(document).off("click", "#nhud-start-tour-btn").on("click", "#nhud-start-tour-btn", () => {
        startInteractiveTour();
    });
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
        $(".nhud-g-tab").removeClass("active").addClass("inactive");
        $(".nhud-g-tab[data-tab='visuals']").addClass("active").removeClass("inactive");

        $("#nhud-global-settings").stop(true, true).css({ display: "flex", opacity: 0 }).animate({ opacity: 1 }, 200);
    });
}

export function closeGlobalSettings() {
    $("#nhud-global-settings").fadeOut(200);
}