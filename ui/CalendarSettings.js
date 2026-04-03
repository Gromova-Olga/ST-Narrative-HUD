// ui/CalendarSettings.js
import { extensionName } from "../core/constants.js";
import { NarrativeStorage } from "../storage/NarrativeStorage.js";
import { getSettings } from "../core/StateManager.js";
import { saveSettingsDebounced } from "../../../../../script.js";
import { getCalendar } from "../core/StateManager.js";

export function renderSettingsCalendar(forceYear = null, forceMonth = null) {
    import('../core/StateManager.js').then(m => {
        const calendar = m.getCalendar();
        const wrap = $("#nhud-settings-calendar-wrap");
        
        // Умное определение стартового месяца (по последнему событию в РП)
        let defaultYear = new Date().getFullYear();
        let defaultMonth = new Date().getMonth();

        if (calendar && calendar.length > 0 && calendar[0].date) {
            // Разбиваем дату формата DD.MM.YYYY
            const parts = String(calendar[0].date).trim().split('.');
            if (parts.length === 3) {
                defaultMonth = parseInt(parts[1], 10) - 1; // Месяцы в JS идут с нуля (0-11)
                defaultYear = parseInt(parts[2], 10);
            }
        }

        // Читаем или инициализируем просматриваемый месяц
        let viewYear = forceYear !== null ? forceYear : (wrap.data('year') !== undefined ? wrap.data('year') : defaultYear);
        let viewMonth = forceMonth !== null ? forceMonth : (wrap.data('month') !== undefined ? wrap.data('month') : defaultMonth);
        
        // Листание через год (если ушли за декабрь или январь)
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }

        wrap.data('year', viewYear);
        wrap.data('month', viewMonth);

        wrap.empty();

        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        let firstDay = new Date(viewYear, viewMonth, 1).getDay() - 1;
        if (firstDay === -1) firstDay = 6;

        const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

        // Навигация (Стрелочки + месяц/год)
        let gridHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; background:rgba(0,0,0,0.2); padding:5px; border-radius:4px; border:1px solid var(--nhud-border);">
            <button id="nhud-cal-prev-m" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:5px 15px; font-weight:bold; font-size:14px;">◀</button>
            <div style="color:var(--nhud-text-main, #c0b0d8); font-weight:bold; font-size:12px; text-transform:uppercase; letter-spacing:1px;">${monthNames[viewMonth]} ${viewYear}</div>
            <button id="nhud-cal-next-m" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:5px 15px; font-weight:bold; font-size:14px;">▶</button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px; margin-bottom:10px; background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; border:1px solid var(--nhud-border);">`;
        
        const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        days.forEach(d => gridHtml += `<div style="text-align:center; font-size:10px; color:#8080a0; font-weight:bold;">${d}</div>`);
        for (let i = 0; i < firstDay; i++) gridHtml += `<div></div>`;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = new Date(viewYear, viewMonth, day).toLocaleDateString('ru-RU');
            
            // "Мягкий" поиск (найдет, даже если ИИ добавил текст к дате)
            const hasEvents = calendar.some(e => {
                const ed = String(e.date).trim();
                return ed === dateStr || ed.includes(dateStr) || dateStr.includes(ed);
            });
            
            const bg = hasEvents ? 'rgba(112, 208, 144, 0.3)' : 'rgba(255,255,255,0.05)';
            const border = hasEvents ? '1px solid #70d090' : '1px solid transparent';
            gridHtml += `<div class="nhud-cal-day" data-date="${dateStr}" style="background:${bg}; border:${border}; border-radius:4px; text-align:center; padding:6px 0; font-size:11px; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='${bg}'">${day}</div>`;
        }
        gridHtml += '</div>';

        // Кнопка показа всех событий
        gridHtml += `
        <div style="margin-bottom:10px; text-align:right;">
            <button id="nhud-cal-show-all" style="background:rgba(80,60,140,0.3); border:1px solid #4a3880; color:#a090c0; border-radius:4px; font-size:10px; padding:4px 8px; cursor:pointer; transition:0.2s;">👁️ Показать все записи</button>
        </div>
        <div id="nhud-cal-events-wrap"></div>`;
        
        wrap.append(gridHtml);

        // Биндим стрелочки листания
        wrap.find("#nhud-cal-prev-m").on("click", () => renderSettingsCalendar(viewYear, viewMonth - 1));
        wrap.find("#nhud-cal-next-m").on("click", () => renderSettingsCalendar(viewYear, viewMonth + 1));
        wrap.find("#nhud-cal-show-all").on("click", () => {
            wrap.find('.nhud-cal-day').css('border-color', 'transparent'); // Сброс обводки
            renderEventsForDate(null);
        });

        const eventsWrap = wrap.find("#nhud-cal-events-wrap");

        const renderEventsForDate = (dateFilter) => {
            eventsWrap.empty();
            
            // Фильтруем мягко
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
                    <input id="nhud-cal-add-desc" class="nhud-input" style="flex:1;" placeholder="Опиши событие..." />
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
                eventsWrap.append('<div style="color:#606080; text-align:center; font-size:12px; padding:10px;">На эту дату событий нет...</div>');
                return;
            }

            filtered.forEach((ev) => {
                const originalIdx = calendar.indexOf(ev);
                const isActive = ev.active !== false;
                const activeBtnStyle = isActive ? "background:var(--nhud-accent, #d05070); color:#fff; border-color:var(--nhud-accent, #d05070); box-shadow:0 0 10px rgba(208,80,112,0.4);" : "background:rgba(255,255,255,0.1); color:#a0a0b0; border-color:transparent;";

                const card = $(`
                    <div style="background:var(--nhud-inp-bg, rgba(0,0,0,0.3)); border:1px solid ${isActive ? '#70d090' : 'var(--nhud-border)'}; border-radius:6px; padding:8px; position:relative; margin-bottom:6px;">
                        <button class="nhud-cal-del" data-idx="${originalIdx}" style="position:absolute; top:4px; right:4px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">✕</button>
                        <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; padding-right:15px;">
                            <input class="nhud-input nhud-cal-date-edit" data-idx="${originalIdx}" value="${ev.date}" style="font-weight:bold; color:#70d090; width:90px; background:transparent; border:none; padding:0;" />
                            <div style="flex:1;"></div>
                            <button class="nhud-cal-toggle" data-idx="${originalIdx}" style="border-radius:4px; padding:2px 6px; font-size:10px; cursor:pointer; font-weight:bold; transition:0.2s; ${activeBtnStyle}" title="Вшить в память ИИ">${isActive ? '👁️ В памяти' : '👁️‍🗨️ Скрыто'}</button>
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

        renderEventsForDate(null); // Сначала показываем все
        wrap.find('.nhud-cal-day').on('click', function() {
            const date = $(this).data('date');
            wrap.find('.nhud-cal-day').css('border-color', 'transparent'); // Сброс обводки
            $(this).css('border-color', '#fff'); // Выделяем день
            renderEventsForDate(date);
        });
    });
} // <-- Это должна быть последняя строчка в файле! Всё что ниже - удалить.
