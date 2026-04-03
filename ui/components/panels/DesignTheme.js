// ui/components/panels/DesignTheme.js
// Вынесено из _UIManager.internal.js (applyDesignTheme)

import { getSettings } from '../../../core/StateManager.js';

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

        // РћР±СЂР°Р±Р°С‚С‹РІР°РµРј С†РІРµС‚Р° РїРѕР»РµР№ Рё РіР°СЂРјРѕС€РµРє
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
            
            /* РџР РРњР•РќР•РќРР• РќРћР’Р«РҐ РЁР РР¤РўРћР’ Р Р¦Р’Р•РўРћР’ */
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

