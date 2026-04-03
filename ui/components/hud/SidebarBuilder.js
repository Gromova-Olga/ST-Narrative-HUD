// ui/components/hud/SidebarBuilder.js
// Вынесено из _UIManager.internal.js (buildTopbarIcon, buildSidebar)

import { getSettings } from '../../../core/StateManager.js';
import { renderInfoBlocks, renderTrackers, renderCharacters, renderInfoBlockButtons, renderProfileSelect, renderRelationships } from '../../_UIManager.internal.js';
import { makeWindowDraggable } from '../../interactions/DragHandler.js';
import { formatPopupText } from '../../../utils/formatting/PopupFormatter.js';

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

// в”Ђв”Ђв”Ђ Sidebar в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
export function buildSidebar() {
    if ($("#narrative-hud-sidebar").length) return;

    const settings = getSettings();
    if (!settings.ui) settings.ui = { widgetPos: { left: "20px", top: "80px" }, hudMode: "screen", hudWidth: 300 };
    const w = settings.ui.hudWidth || 300;

    $("body").append(`
        <div id="narrative-hud-sidebar" style="position:fixed; top:40px; bottom:0; right:0; width:${w}px; z-index:9990; background:var(--nhud-bg, #151220); border-left:1px solid var(--nhud-border, #3a1525); display:flex; flex-direction:column; box-shadow:-5px 0 25px rgba(0,0,0,0.8); padding-top:30px; transition: width 0.3s ease;">
            <button id="nhud-mode-toggle" style="position:absolute; top:8px; left:8px; background:none; border:none; color:var(--nhud-accent, #d05070); font-size:16px; font-weight:bold; cursor:pointer; padding:0; z-index:100; transition:0.2s;">в—§</button>
            
            <div style="position:absolute; top:8px; right:8px; z-index:100;">
                <button id="nhud-sidebar-menu-btn" title="РњРµРЅСЋ HUD" style="background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer; font-size:18px; transition:0.2s; padding: 0 8px;">в‹®</button>
                <div id="nhud-sidebar-dropdown" style="display:none; position:absolute; top:24px; right:0; background:var(--nhud-prompt-bg, #1a1015); border:1px solid var(--nhud-border); border-radius:6px; flex-direction:column; padding:4px; gap:2px; box-shadow:0 5px 15px rgba(0,0,0,0.8); width:170px;">
                    <button id="nhud-manual-send" class="nhud-dropdown-item" style="text-align:left; background:none; border:none; color:var(--nhud-text-main); padding:6px 10px; cursor:pointer; font-size:12px; border-radius:4px;"><span style="color:#52a8e0;">в–¶</span> РћР±РЅРѕРІРёС‚СЊ РґР°РЅРЅС‹Рµ</button>
                    <button id="nhud-toggle-widget-btn" class="nhud-dropdown-item" style="text-align:left; background:none; border:none; color:var(--nhud-text-main); padding:6px 10px; cursor:pointer; font-size:12px; border-radius:4px;"><span style="color:#e0a352;">рџ§Љ</span> РЎРєСЂС‹С‚СЊ/РџРѕРєР°Р·Р°С‚СЊ РІРёРґР¶РµС‚</button>
                    <button id="nhud-open-settings" class="nhud-dropdown-item" style="text-align:left; background:none; border:none; color:var(--nhud-text-main); padding:6px 10px; cursor:pointer; font-size:12px; border-radius:4px;"><span style="color:#d05070;">вљ™пёЏ</span> Narrative HUD</button>
                    <button id="nhud-open-global-settings" class="nhud-dropdown-item" style="text-align:left; background:none; border:none; color:var(--nhud-text-main); padding:6px 10px; cursor:pointer; font-size:12px; border-radius:4px;"><span style="color:#b080e0;">рџЋЁ</span> Р’РЅРµС€РЅРёР№ РІРёРґ Рё РЎРёСЃС‚РµРјР°</button>
                    <div style="border-top:1px solid var(--nhud-border); margin:2px 0;"></div>
                    <button id="nhud-sidebar-close" class="nhud-dropdown-item" style="text-align:left; background:none; border:none; color:var(--nhud-text-main); padding:6px 10px; cursor:pointer; font-size:12px; border-radius:4px;"><span style="color:#e05252;">вњ•</span> Р—Р°РєСЂС‹С‚СЊ РїР°РЅРµР»СЊ</button>
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
            <div id="nhud-characters-section" style="padding:0 10px 10px 10px; flex:1; overflow-y:auto;"><div id="nhud-characters-list" style="display:flex; flex-direction:column; gap:8px;"></div></div>
            <div id="nhud-resize-handle" style="position:absolute; left:-4px; top:0; bottom:0; width:8px; cursor:ew-resize; z-index:10; background:transparent;"></div>
        </div>
        <div id="nhud-infoblock-popup" style="display:none; position:fixed; top:${settings.design?.promptPos?.top || '100px'}; left:${settings.design?.promptPos?.left || '100px'}; z-index:9995; background:var(--nhud-prompt-bg); border:var(--nhud-prompt-border); border-radius:8px; box-shadow:0 5px 20px rgba(0,0,0,0.9); width:var(--nhud-prompt-width); resize:both; overflow:hidden;">
            <div id="nhud-infoblock-popup-header" style="cursor:grab; display:flex; justify-content:space-between; padding:8px 10px; background:var(--nhud-prompt-header); border-bottom:var(--nhud-prompt-border); font-weight:bold; color:var(--nhud-text-main); border-radius:8px 8px 0 0;">
                <span id="nhud-infoblock-popup-title"></span>
                <button id="nhud-infoblock-popup-close" style="background:none; border:none; color:var(--nhud-accent); cursor:pointer;">вњ•</button>
            </div>
            <div id="nhud-infoblock-popup-content" style="padding:10px; color:var(--nhud-prompt-text-color); font-size:var(--nhud-prompt-font-size); max-height:50vh; overflow-y:auto;"></div>
        </div>
    `);

    // Р›РѕРіРёРєР° РІС‹РїР°РґР°СЋС‰РµРіРѕ РјРµРЅСЋ
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
            $("#nhud-mode-toggle").html("в—§").attr("title", "Р СѓС‡РЅР°СЏ С€РёСЂРёРЅР°");
        } else if (mode === "chat") {
            const chatEl = document.getElementById("chat");
            if (chatEl) {
                const rect = chatEl.getBoundingClientRect();
                const gapWidth = window.innerWidth - rect.right;
                sidebar.css({ width: Math.max(220, gapWidth) + "px" });
            }
            handle.hide();
            $("#nhud-mode-toggle").html("в—Ё").attr("title", "Р—Р°РїРѕР»РЅРµРЅРёРµ РґРѕ С‡Р°С‚Р°");
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
            
            // --- РќРћР’РђРЇ РљР РђРЎРћРўРђ Р”Р›РЇ РћРљРќРђ ---
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
    
    // Р‘РёРЅРґС‹ РєРЅРѕРїРѕРє РёР· РґСЂРѕРїРґР°СѓРЅР°
    $("#nhud-manual-send").on("click", () => { import('../index.js').then(m => m.sendToAPI(true)); $("#nhud-sidebar-dropdown").fadeOut(150); });
    $("#nhud-open-settings").on("click", () => { import('./SettingsUI.js').then(m => m.openSettingsPanel()); $("#nhud-sidebar-dropdown").fadeOut(150); });
    $("#nhud-open-global-settings").on("click", () => { openGlobalSettings(); $("#nhud-sidebar-dropdown").fadeOut(150); });
    $("#nhud-toggle-widget-btn").on("click", () => { $("#nhud-widget").fadeToggle(200); $("#nhud-sidebar-dropdown").fadeOut(150); });
    $("#nhud-sidebar-close").on("click", () => { $("#narrative-hud-sidebar").fadeOut(200); $("#nhud-sidebar-dropdown").fadeOut(150); });

    renderTrackers(); renderCharacters(); renderInfoBlocks();
    renderInfoBlockButtons(); renderProfileSelect();
    if (typeof makeWindowDraggable === "function") makeWindowDraggable("nhud-infoblock-popup", "nhud-infoblock-popup-header");
}

