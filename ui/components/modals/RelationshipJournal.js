// ui/components/modals/RelationshipJournal.js
// Вынесено из _Modals.internal.js

import { getSettings, getLive } from '../../../core/StateManager.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { makeWindowDraggable } from '../../_UIManager.internal.js';

export function openRelationshipJournal(charName) {
    let popup = $("#nhud-rel-journal");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-rel-journal" style="display:none; position:fixed; top:20vh; left:calc(50% - 150px); width:320px; max-height:60vh; z-index:9996; background:var(--nhud-bg, #151220); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-rel-journal-header" style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8)); padding:10px 15px; border-bottom:1px solid var(--nhud-border, #4a1525); cursor:grab; flex-shrink:0;">
                    <span style="font-weight:bold; color:var(--nhud-text-main, #e0c0c0); font-size:14px;">рџ“њ Р–СѓСЂРЅР°Р» СЃРІСЏР·РµР№</span>
                    <button id="nhud-rel-journal-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:0; font-size:16px;">вњ•</button>
                </div>
                <div id="nhud-rel-journal-content" style="flex:1; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:8px; background:rgba(0,0,0,0.2);"></div>
            </div>
        `);
        if (typeof makeWindowDraggable === "function") makeWindowDraggable("nhud-rel-journal", "nhud-rel-journal-header");
        $("#nhud-rel-journal-close").on("click", () => $("#nhud-rel-journal").fadeOut(150));
        popup = $("#nhud-rel-journal");
    }

    const content = $("#nhud-rel-journal-content");
    content.empty();
    
    const live = getLive();
    const history = live.relHistory?.[charName] || [];

    content.append(`<div style="text-align:center; color:var(--nhud-accent); font-weight:bold; margin-bottom:5px;">${charName}</div>`);

    if (history.length === 0) {
        content.append(`<div style="color:var(--nhud-text-muted); font-size:12px; text-align:center; padding:20px;">РџРѕРєР° РЅРµС‚ Р·Р°РїРёСЃРµР№ РѕР± РёР·РјРµРЅРµРЅРёРё РѕС‚РЅРѕС€РµРЅРёР№.</div>`);
    } else {
        const reversedHistory = [...history].reverse();
        reversedHistory.forEach((entry, idx) => {
            const actualIndex = history.length - 1 - idx; 
            
            const isPos = entry.delta > 0;
            const sign = isPos ? "+" : "";
            const color = isPos ? "#52e0a3" : "#e05252";
            const borderCol = isPos ? "rgba(82, 224, 163, 0.3)" : "rgba(224, 82, 82, 0.3)";
            
            const entryBlock = $(`
                <div style="background:rgba(0,0,0,0.3); border-left:3px solid ${color}; border-radius:4px; padding:8px; border-top:1px solid ${borderCol}; border-right:1px solid ${borderCol}; border-bottom:1px solid ${borderCol}; margin-bottom:8px; position:relative;">
                    <button class="nhud-del-rel-event" data-idx="${actualIndex}" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.5); border:1px solid ${borderCol}; color:#c08080; border-radius:4px; cursor:pointer; font-size:10px; padding:2px 6px; transition:0.2s;" title="РЈРґР°Р»РёС‚СЊ Р·Р°РїРёСЃСЊ">вњ•</button>
                    <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--nhud-text-muted); margin-bottom:4px; padding-right:25px;">
                        <span>[${entry.time || '?'}] РЎРѕРѕР±С‰РµРЅРёРµ #${entry.messageId}</span>
                        <span style="font-weight:bold; color:${color}; font-size:12px;">${sign}${entry.delta}</span>
                    </div>
                    <div style="font-size:12px; color:var(--nhud-text-main); line-height:1.3;">
                        ${entry.reason}
                    </div>
                    <div style="font-size:10px; color:var(--nhud-text-muted); text-align:right; margin-top:4px;">
                        РС‚РѕРі: ${entry.val}
                    </div>
                </div>
            `);
            content.append(entryBlock);
        });

        content.find('.nhud-del-rel-event').on('click', function(e) {
            e.stopPropagation();
            if(!confirm("РЈРґР°Р»РёС‚СЊ СЌС‚Рѕ СЃРѕР±С‹С‚РёРµ РёР· РёСЃС‚РѕСЂРёРё? Р“СЂР°С„РёРє РїРµСЂРµСЂРёСЃСѓРµС‚СЃСЏ.")) return;
            const idxToRemove = parseInt($(this).data('idx'));
            history.splice(idxToRemove, 1);
            getSettings().liveData.relHistory[charName] = history;
            saveSettingsDebounced();
            openRelationshipJournal(charName); 
            if ($("#nhud-analytics-popup").is(":visible")) {
                renderAnalyticsChart(charName); 
            }
        });
    }

    popup.css("display", "flex").hide().fadeIn(150);
}

// в”Ђв”Ђв”Ђ РђРќРђР›РРўРРљРђ Р Р“Р РђР¤РРљР (РљРђРќР’РђРЎ) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

