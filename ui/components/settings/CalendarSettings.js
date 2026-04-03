// components\settings\CalendarSettings.js
// Вынесено из _SettingsUI.internal.js (renderSettingsCalendar)

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
export function renderSettingsCalendar(forceYear = null, forceMonth = null) {
    import('../core/StateManager.js').then(m => {
        const calendar = m.getCalendar();
        const wrap = $("#nhud-settings-calendar-wrap");
        
        // РЈРјРЅРѕРµ РѕРїСЂРµРґРµР»РµРЅРёРµ СЃС‚Р°СЂС‚РѕРІРѕРіРѕ РјРµСЃСЏС†Р° (РїРѕ РїРѕСЃР»РµРґРЅРµРјСѓ СЃРѕР±С‹С‚РёСЋ РІ Р Рџ)
        let defaultYear = new Date().getFullYear();
        let defaultMonth = new Date().getMonth();

        if (calendar && calendar.length > 0 && calendar[0].date) {
            // Р Р°Р·Р±РёРІР°РµРј РґР°С‚Сѓ С„РѕСЂРјР°С‚Р° DD.MM.YYYY
            const parts = String(calendar[0].date).trim().split('.');
            if (parts.length === 3) {
                defaultMonth = parseInt(parts[1], 10) - 1; // РњРµСЃСЏС†С‹ РІ JS РёРґСѓС‚ СЃ РЅСѓР»СЏ (0-11)
                defaultYear = parseInt(parts[2], 10);
            }
        }

        // Р§РёС‚Р°РµРј РёР»Рё РёРЅРёС†РёР°Р»РёР·РёСЂСѓРµРј РїСЂРѕСЃРјР°С‚СЂРёРІР°РµРјС‹Р№ РјРµСЃСЏС†
        let viewYear = forceYear !== null ? forceYear : (wrap.data('year') !== undefined ? wrap.data('year') : defaultYear);
        let viewMonth = forceMonth !== null ? forceMonth : (wrap.data('month') !== undefined ? wrap.data('month') : defaultMonth);
        
        // Р›РёСЃС‚Р°РЅРёРµ С‡РµСЂРµР· РіРѕРґ (РµСЃР»Рё СѓС€Р»Рё Р·Р° РґРµРєР°Р±СЂСЊ РёР»Рё СЏРЅРІР°СЂСЊ)
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }

        wrap.data('year', viewYear);
        wrap.data('month', viewMonth);

        wrap.empty();

        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        let firstDay = new Date(viewYear, viewMonth, 1).getDay() - 1;
        if (firstDay === -1) firstDay = 6;

        const monthNames = ["РЇРЅРІР°СЂСЊ", "Р¤РµРІСЂР°Р»СЊ", "РњР°СЂС‚", "РђРїСЂРµР»СЊ", "РњР°Р№", "РСЋРЅСЊ", "РСЋР»СЊ", "РђРІРіСѓСЃС‚", "РЎРµРЅС‚СЏР±СЂСЊ", "РћРєС‚СЏР±СЂСЊ", "РќРѕСЏР±СЂСЊ", "Р”РµРєР°Р±СЂСЊ"];

        // РќР°РІРёРіР°С†РёСЏ (РЎС‚СЂРµР»РѕС‡РєРё + РјРµСЃСЏС†/РіРѕРґ)
        let gridHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background:rgba(0,0,0,0.2); padding:5px; border-radius:4px; border:1px solid var(--nhud-border);">
            <button id="nhud-cal-prev-m" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:5px 15px; font-weight:bold; font-size:14px;">в—Ђ</button>
            <div style="color:var(--nhud-text-main, #c0b0d8); font-weight:bold; font-size:12px; text-transform:uppercase; letter-spacing:1px;">${monthNames[viewMonth]} ${viewYear}</div>
            <button id="nhud-cal-next-m" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:5px 15px; font-weight:bold; font-size:14px;">в–¶</button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px; margin-bottom:10px; background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; border:1px solid var(--nhud-border);">`;
        
        const days = ['РџРЅ', 'Р’С‚', 'РЎСЂ', 'Р§С‚', 'РџС‚', 'РЎР±', 'Р’СЃ'];
        days.forEach(d => gridHtml += `<div style="text-align:center; font-size:10px; color:#8080a0; font-weight:bold;">${d}</div>`);
        for (let i = 0; i < firstDay; i++) gridHtml += `<div></div>`;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = new Date(viewYear, viewMonth, day).toLocaleDateString('ru-RU');
            
            // "РњСЏРіРєРёР№" РїРѕРёСЃРє (РЅР°Р№РґРµС‚, РґР°Р¶Рµ РµСЃР»Рё РР РґРѕР±Р°РІРёР» С‚РµРєСЃС‚ Рє РґР°С‚Рµ)
            const hasEvents = calendar.some(e => {
                const ed = String(e.date).trim();
                return ed === dateStr || ed.includes(dateStr) || dateStr.includes(ed);
            });
            
            const bg = hasEvents ? 'rgba(112, 208, 144, 0.3)' : 'rgba(255,255,255,0.05)';
            const border = hasEvents ? '1px solid #70d090' : '1px solid transparent';
            gridHtml += `<div class="nhud-cal-day" data-date="${dateStr}" style="background:${bg}; border:${border}; border-radius:4px; text-align:center; padding:6px 0; font-size:11px; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='${bg}'">${day}</div>`;
        }
        gridHtml += '</div>';

        // РљРЅРѕРїРєР° РїРѕРєР°Р·Р° РІСЃРµС… СЃРѕР±С‹С‚РёР№
        gridHtml += `
        <div style="margin-bottom:10px; text-align:right;">
            <button id="nhud-cal-show-all" style="background:rgba(80,60,140,0.3); border:1px solid #4a3880; color:#a090c0; border-radius:4px; font-size:10px; padding:4px 8px; cursor:pointer; transition:0.2s;">рџ‘ЃпёЏ РџРѕРєР°Р·Р°С‚СЊ РІСЃРµ Р·Р°РїРёСЃРё</button>
        </div>
        <div id="nhud-cal-events-wrap"></div>`;
        
        wrap.append(gridHtml);

        // Р‘РёРЅРґРёРј СЃС‚СЂРµР»РѕС‡РєРё Р»РёСЃС‚Р°РЅРёСЏ
        wrap.find("#nhud-cal-prev-m").on("click", () => renderSettingsCalendar(viewYear, viewMonth - 1));
        wrap.find("#nhud-cal-next-m").on("click", () => renderSettingsCalendar(viewYear, viewMonth + 1));
        wrap.find("#nhud-cal-show-all").on("click", () => {
            wrap.find('.nhud-cal-day').css('border-color', 'transparent'); // РЎР±СЂРѕСЃ РѕР±РІРѕРґРєРё
            renderEventsForDate(null);
        });

        const eventsWrap = wrap.find("#nhud-cal-events-wrap");

        const renderEventsForDate = (dateFilter) => {
            eventsWrap.empty();
            
            // Р¤РёР»СЊС‚СЂСѓРµРј РјСЏРіРєРѕ
            let filtered = calendar;
            if (dateFilter) {
                filtered = calendar.filter(e => {
                    const ed = String(e.date).trim();
                    return ed === dateFilter || ed.includes(dateFilter) || dateFilter.includes(ed);
                });
            }

            eventsWrap.append(`
                <div style="display:flex; gap:6px; margin-bottom:10px;">
                    <input id="nhud-cal-add-date" class="nhud-input" style="width:90px;" value="${dateFilter || new Date().toLocaleDateString('ru-RU')}" />
                    <input id="nhud-cal-add-desc" class="nhud-input" style="flex:1;" placeholder="РћРїРёС€Рё СЃРѕР±С‹С‚РёРµ..." />
                    <button id="nhud-cal-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
                </div>
            `);

            eventsWrap.find('#nhud-cal-add-btn').on('click', () => {
                const d = $("#nhud-cal-add-date").val().trim();
                const desc = $("#nhud-cal-add-desc").val().trim();
                if (desc) {
                    calendar.unshift({ date: d, desc: desc, active: true, realDate: Date.now() });
                    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
                    renderSettingsCalendar(viewYear, viewMonth);
                }
            });

            if (filtered.length === 0) {
                eventsWrap.append('<div style="color:#606080; text-align:center; font-size:12px; padding:10px;">РќР° СЌС‚Сѓ РґР°С‚Сѓ СЃРѕР±С‹С‚РёР№ РЅРµС‚...</div>');
                return;
            }

            filtered.forEach((ev) => {
                const originalIdx = calendar.indexOf(ev);
                const isActive = ev.active !== false;
                const activeBtnStyle = isActive ? "background:var(--nhud-accent, #d05070); color:#fff; border-color:var(--nhud-accent, #d05070); box-shadow:0 0 10px rgba(208,80,112,0.4);" : "background:rgba(255,255,255,0.1); color:#a0a0b0; border-color:transparent;";

                const card = $(`
                    <div style="background:var(--nhud-inp-bg, rgba(0,0,0,0.3)); border:1px solid ${isActive ? '#70d090' : 'var(--nhud-border)'}; border-radius:6px; padding:8px; position:relative; margin-bottom:6px;">
                        <button class="nhud-cal-del" data-idx="${originalIdx}" style="position:absolute; top:4px; right:4px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">вњ•</button>
                        <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; padding-right:15px;">
                            <input class="nhud-input nhud-cal-date-edit" data-idx="${originalIdx}" value="${ev.date}" style="font-weight:bold; color:#70d090; width:90px; background:transparent; border:none; padding:0;" />
                            <div style="flex:1;"></div>
                            <button class="nhud-cal-toggle" data-idx="${originalIdx}" style="border-radius:4px; padding:2px 6px; font-size:10px; cursor:pointer; font-weight:bold; transition:0.2s; ${activeBtnStyle}" title="Р’С€РёС‚СЊ РІ РїР°РјСЏС‚СЊ РР">${isActive ? 'рџ‘ЃпёЏ Р’ РїР°РјСЏС‚Рё' : 'рџ‘ЃпёЏвЂЌрџ—ЁпёЏ РЎРєСЂС‹С‚Рѕ'}</button>
                        </div>
                        <textarea class="nhud-textarea nhud-cal-desc" data-idx="${originalIdx}" rows="2" style="font-size:11px;">${ev.desc}</textarea>
                    </div>
                `);

                card.find('.nhud-cal-del').on('click', function() { calendar.splice(parseInt($(this).data('idx')), 1); import('../../../../../script.js').then(s => s.saveSettingsDebounced()); renderSettingsCalendar(viewYear, viewMonth); });
                card.find('.nhud-cal-date-edit').on('change', function() { calendar[parseInt($(this).data('idx'))].date = $(this).val(); import('../../../../../script.js').then(s => s.saveSettingsDebounced()); renderSettingsCalendar(viewYear, viewMonth); });
                card.find('.nhud-cal-desc').on('change', function() { calendar[parseInt($(this).data('idx'))].desc = $(this).val(); import('../../../../../script.js').then(s => s.saveSettingsDebounced()); });
                card.find('.nhud-cal-toggle').on('click', function() { ev.active = !isActive; import('../../../../../script.js').then(s => s.saveSettingsDebounced()); renderEventsForDate(dateFilter); });
                eventsWrap.append(card);
            });
        };

        renderEventsForDate(null); // РЎРЅР°С‡Р°Р»Р° РїРѕРєР°Р·С‹РІР°РµРј РІСЃРµ
        wrap.find('.nhud-cal-day').on('click', function() {
            const date = $(this).data('date');
            wrap.find('.nhud-cal-day').css('border-color', 'transparent'); // РЎР±СЂРѕСЃ РѕР±РІРѕРґРєРё
            $(this).css('border-color', '#fff'); // Р’С‹РґРµР»СЏРµРј РґРµРЅСЊ
            renderEventsForDate(date);
        });
    });
} // <-- Р­С‚Рѕ РґРѕР»Р¶РЅР° Р±С‹С‚СЊ РїРѕСЃР»РµРґРЅСЏСЏ СЃС‚СЂРѕС‡РєР° РІ С„Р°Р№Р»Рµ! Р’СЃС‘ С‡С‚Рѕ РЅРёР¶Рµ - СѓРґР°Р»РёС‚СЊ.
