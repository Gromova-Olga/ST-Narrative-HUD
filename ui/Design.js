// ui/Design.js
import { extensionName } from "../core/constants.js";

// Базовые пресеты тем
// Базовые пресеты тем
export const themePresets = {
    classic: { name: "Классика" },
    glass: { name: "Жидкое стекло" },
    cyber: { name: "Aether Terminal (Sci-Fi)" },
    fantasy: { name: "Древний свиток (Fantasy)" },
    neon: { name: "Solo System (Neon)" }
};

export function applyTheme(themeName) {
    document.documentElement.classList.forEach(cls => {
        if (cls.startsWith('theme-')) {
            document.documentElement.classList.remove(cls);
        }
    });
    
    if (themePresets[themeName]) {
        document.documentElement.classList.add(`theme-${themeName}`);
        try {
            import('../core/StateManager.js').then(m => {
                const settings = m.getSettings();
                settings.ui = settings.ui || {};
                settings.ui.activeTheme = themeName;
            });
        } catch (e) {
            console.warn('[Design] Could not save theme preference:', e);
        }
    }
}

// --- ВОССТАНОВЛЕННЫЕ ФУНКЦИИ-ПОМОЩНИКИ (ИИ их удалил!) ---
function hexToRgba(hex, alpha) {
    if (!hex || hex.length < 7) return `rgba(0,0,0,${alpha})`;
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getBgString(color, alpha, image) {
    let a = alpha !== undefined ? parseFloat(alpha) : 0.95;
    if (isNaN(a)) a = 0.95;
    
    if (image && image.trim() !== '') {
        // Инвертируем ползунок: чем меньше прозрачность в UI, тем плотнее слой тонировки
        let overlayOpacity = 1 - a; 
        
        // Создаем цветной слой на основе выбранного цвета (или дефолтного темного)
        let overlayColor = hexToRgba(color, overlayOpacity);
        
        // Накладываем цветной полупрозрачный градиент ПОВЕРХ картинки
        return `linear-gradient(${overlayColor}, ${overlayColor}), url('${image}') center / cover no-repeat`;
    }
    
    return hexToRgba(color, a);
}
// ---------------------------------------------------------

export function applyDesignTheme() {
    import('../core/StateManager.js').then(m => {
        const settings = m.getSettings();
        const d = settings.design || {};
        const ui = settings.ui || {}; 

        const hudBg = getBgString(d.hudBgC || d.hudBgColor, d.hudBgO ?? d.hudBgOpacity, d.hudBgI || d.hudBgImage);
        const setBg = getBgString(d.leftBgC || d.setBgColor, d.leftBgO ?? d.setBgOpacity, d.leftBgI || d.setBgImage);
        const widBg = getBgString(d.widBgColor, d.widBgOpacity, d.widBgImage);
        const cenBg = getBgString(d.cenBgC || d.cenBgColor, d.cenBgO ?? d.cenBgOpacity, d.cenBgI || d.cenBgImage);
        const popBg = getBgString(d.popBgC || d.popBgColor, d.popBgO ?? d.popBgOpacity, d.popBgI || d.popBgImage);

        const leftAcc = hexToRgba(d.leftHeadC || d.leftAccBg || '#000000', d.leftHeadO ?? d.leftAccO ?? 0.2);
        const leftInp = hexToRgba(d.leftInpC || '#000000', d.leftInpO ?? 0.3);
        const cenAcc = hexToRgba(d.cenHeadC || d.cenAccBg || '#000000', d.cenHeadO ?? d.cenAccO ?? 0.3);
        const cenInp = hexToRgba(d.cenInpC || '#000000', d.cenInpO ?? 0.2);
        const hudInp = hexToRgba(d.hudInpC || '#000000', d.hudInpO ?? 0.3);
        const popInp = hexToRgba(d.popInpC || '#000000', d.popInpO ?? 0.3);

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
                /* --- НОВЫЕ СВЯЗКИ ДЛЯ ЖИДКОГО СТЕКЛА --- */
                --nhud-bg-base: ${cenBg} !important;
                --nhud-bg-sidebar: ${hudBg} !important;
                --nhud-bg-panel: ${setBg} !important;
                --nhud-bg-input: ${cenInp} !important;
                
                --nhud-border-base: ${d.borderColor || '#4a1525'} !important;
                --nhud-border: ${d.borderColor || '#4a1525'} !important;
                
                --nhud-text-primary: ${d.cenTxtC || '#e0c0c0'} !important;
                --nhud-text-secondary: ${d.hudTxtC || '#e0b0b0'} !important;
                
                --nhud-accent-color: ${d.accent || '#d05070'} !important;
                --nhud-accent: ${d.accent || '#d05070'} !important;
                
                --nhud-bar-start: ${d.barColorStart || '#52e0a3'} !important;
                --nhud-bar-end: ${d.barColorEnd || '#e05252'} !important;

                /* --- СТАРЫЕ ПЕРЕМЕННЫЕ (Для обратной совместимости) --- */
                --nhud-left-bg: ${setBg};
                --nhud-left-text: ${d.leftTxtC || '#e0c0c0'};
                --nhud-left-text-size: ${d.leftTxtS || 12}px;
                --nhud-left-head-bg: ${leftAcc};
                --nhud-left-head-text: ${d.leftHeadTxtC || d.accent || '#d05070'};
                --nhud-left-head-size: ${d.leftHeadS || 13}px;
                --nhud-left-inp: ${leftInp};

                --nhud-hud-bg: ${hudBg};
                --nhud-hud-text: ${d.hudTxtC || '#e0b0b0'};
                --nhud-hud-text-size: ${d.hudTxtS || 12}px;
                --nhud-hud-inp: ${hudInp};

                --nhud-cen-bg: ${cenBg};
                --nhud-cen-text: ${d.cenTxtC || '#e0c0c0'};
                --nhud-cen-text-size: ${d.cenTxtS || 12}px;
                --nhud-cen-head-bg: ${cenAcc};
                --nhud-cen-head-text: ${d.cenHeadTxtC || '#e0c0c0'};
                --nhud-cen-head-size: ${d.cenHeadS || 14}px;
                --nhud-cen-inp: ${cenInp};
                
                --nhud-prompt-bg: ${popBg};
                --nhud-prompt-header: ${d.promptMerged ? 'transparent' : hexToRgba(d.popHeadC || '#2a101a', d.popHeadO ?? 1)};
                --nhud-prompt-border: ${d.promptMerged ? 'none' : '1px solid var(--nhud-border)'};
                --nhud-prompt-width: ${window.innerWidth < 768 ? '95vw' : (d.promptWidth || 300) + 'px'};
                --nhud-prompt-text-color: ${d.popTxtC || '#e0b0b0'};
                --nhud-prompt-font-size: ${d.popTxtS || 14}px;
                --nhud-pop-inp: ${popInp};

                --nhud-wid-text: ${d.widTxtC || '#ffffff'};
                --nhud-wid-text-size: ${d.widTxtS || 14}px;
            }
            ${tabsCss}
            ${hideModulesCss}
            
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
            }
        `;

        $("#nhud-design-styles").remove();
        $("<style>").attr("id", "nhud-design-styles").html(cssText).appendTo("head");
    });
}
