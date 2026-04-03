// ui/Modals.js
import { getSettings, getLive } from "../core/StateManager.js";
import { NarrativeStorage } from "../storage/NarrativeStorage.js";
import { getSTContext } from "../utils/helpers.js";
import { makeWindowDraggable } from "./UIManager.js";
import { renderStorageStats, renderSettingsCharacterAccordion } from "./SettingsUI.js";
import { saveSettingsDebounced } from "../../../../../script.js";

// ─── ЖУРНАЛ ОТНОШЕНИЙ (ИСТОРИЯ) ─────────────────────────────────────────

export function openRelationshipJournal(charName) {
    let popup = $("#nhud-rel-journal");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-rel-journal" style="display:none; position:fixed; top:20vh; left:calc(50% - 150px); width:320px; max-height:60vh; z-index:9996; background:var(--nhud-bg, #151220); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-rel-journal-header" style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8)); padding:10px 15px; border-bottom:1px solid var(--nhud-border, #4a1525); cursor:grab; flex-shrink:0;">
                    <span style="font-weight:bold; color:var(--nhud-text-main, #e0c0c0); font-size:14px;">📜 Журнал связей</span>
                    <button id="nhud-rel-journal-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:0; font-size:16px;">✕</button>
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
        content.append(`<div style="color:var(--nhud-text-muted); font-size:12px; text-align:center; padding:20px;">Пока нет записей об изменении отношений.</div>`);
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
                    <button class="nhud-del-rel-event" data-idx="${actualIndex}" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.5); border:1px solid ${borderCol}; color:#c08080; border-radius:4px; cursor:pointer; font-size:10px; padding:2px 6px; transition:0.2s;" title="Удалить запись">✕</button>
                    <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--nhud-text-muted); margin-bottom:4px; padding-right:25px;">
                        <span>[${entry.time || '?'}] Сообщение #${entry.messageId}</span>
                        <span style="font-weight:bold; color:${color}; font-size:12px;">${sign}${entry.delta}</span>
                    </div>
                    <div style="font-size:12px; color:var(--nhud-text-main); line-height:1.3;">
                        ${entry.reason}
                    </div>
                    <div style="font-size:10px; color:var(--nhud-text-muted); text-align:right; margin-top:4px;">
                        Итог: ${entry.val}
                    </div>
                </div>
            `);
            content.append(entryBlock);
        });

        content.find('.nhud-del-rel-event').on('click', function(e) {
            e.stopPropagation();
            if(!confirm("Удалить это событие из истории? График перерисуется.")) return;
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

// ─── АНАЛИТИКА И ГРАФИКИ (КАНВАС) ───────────────────────────────────────

export function openAnalyticsPopup() {
    let popup = $("#nhud-analytics-popup");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-analytics-popup" style="display:none; position:fixed; top:15vh; left:calc(50% - 300px); width:600px; z-index:9997; background:var(--nhud-bg, #151220); border:1px solid #3a5a80; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-analytics-header" style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, #101a25, #0a1015); padding:10px 15px; border-bottom:1px solid #2a4060; cursor:grab;">
                    <span style="font-weight:bold; color:#80b0e0; font-size:14px;">📈 Динамика отношений (Аналитика)</span>
                    <button id="nhud-analytics-close" style="background:none; border:none; color:#e05252; cursor:pointer; padding:0; font-size:16px;">✕</button>
                </div>
                <div style="padding:10px; background:rgba(0,0,0,0.4); border-bottom:1px solid #2a4060; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#8080a0; font-size:12px;">Выберите персонажа для отрисовки:</span>
                    <select id="nhud-analytics-char-select" class="nhud-select" style="width:250px; background:#0a1015; border-color:#2a4060; color:#e0e0e0;"></select>
                </div>
                <div style="padding:15px; background:rgba(0,0,0,0.2); position:relative;">
                    <canvas id="nhud-analytics-canvas" width="570" height="300" style="background:#0d1117; border:1px solid #1a2530; border-radius:4px; display:block;"></canvas>
                    <div id="nhud-analytics-empty" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; align-items:center; justify-content:center; color:#8080a0; font-size:14px; background:rgba(13, 17, 23, 0.8);">Нет истории изменений для графика</div>
                </div>
            </div>
        `);
        if (typeof makeWindowDraggable === "function") makeWindowDraggable("nhud-analytics-popup", "nhud-analytics-header");
        $("#nhud-analytics-close").on("click", () => $("#nhud-analytics-popup").fadeOut(150));
        
        $("#nhud-analytics-char-select").on("change", function() {
            renderAnalyticsChart($(this).val());
        });
        
        popup = $("#nhud-analytics-popup");
    }

    const live = getLive();
    const sel = $("#nhud-analytics-char-select");
    sel.empty();
    
    const charsWithHistory = Object.keys(live.relHistory || {}).filter(name => live.relHistory[name].length > 0);
    
    if (charsWithHistory.length === 0) {
        sel.append('<option value="">Пусто...</option>');
        $("#nhud-analytics-empty").css("display", "flex");
        const canvas = document.getElementById("nhud-analytics-canvas");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0,0,canvas.width,canvas.height);
    } else {
        charsWithHistory.forEach(name => {
            sel.append(`<option value="${name}">${name}</option>`);
        });
        $("#nhud-analytics-empty").hide();
    }

    popup.css("display", "flex").hide().fadeIn(150, () => {
        if (charsWithHistory.length > 0) {
            renderAnalyticsChart(sel.val());
        }
    });
}

export function renderAnalyticsChart(charName) {
    if (!charName) return;
    const live = getLive();
    const history = live.relHistory?.[charName] || [];
    
    const canvas = document.getElementById("nhud-analytics-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h); 
    
    if (history.length === 0) {
        $("#nhud-analytics-empty").css("display", "flex");
        return;
    }
    $("#nhud-analytics-empty").hide();

    const points = [];
    const firstEntry = history[0];
    points.push({ val: firstEntry.val - firstEntry.delta, label: "Старт" }); 
    history.forEach((entry, i) => {
        points.push({ val: entry.val, label: "#" + entry.messageId });
    });

    ctx.strokeStyle = "#1a2530"; 
    ctx.lineWidth = 1;
    ctx.fillStyle = "#607080";   
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const padL = 35, padR = 20, padT = 20, padB = 30;
    const graphW = w - padL - padR;
    const graphH = h - padT - padB;

    [0, 25, 50, 75, 100].forEach(val => {
        const y = padT + graphH - (val / 100) * graphH;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
        ctx.fillText(val, padL - 8, y);
    });

    const stepX = points.length > 1 ? graphW / (points.length - 1) : graphW / 2;
    const coords = points.map((p, i) => ({
        x: padL + i * stepX,
        y: padT + graphH - (p.val / 100) * graphH,
        label: p.label,
        val: p.val
    }));

    if (coords.length > 1) {
        const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
        grad.addColorStop(0, "rgba(82, 168, 224, 0.4)"); 
        grad.addColorStop(1, "rgba(82, 168, 224, 0.0)"); 
        
        ctx.beginPath();
        ctx.moveTo(coords[0].x, padT + graphH); 
        coords.forEach(c => ctx.lineTo(c.x, c.y)); 
        ctx.lineTo(coords[coords.length-1].x, padT + graphH); 
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
    }

    if (coords.length > 1) {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#52a8e0"; 
        ctx.lineJoin = "round";
        coords.forEach((c, i) => {
            if (i === 0) ctx.moveTo(c.x, c.y);
            else ctx.lineTo(c.x, c.y);
        });
        ctx.stroke();
    }

    coords.forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#151220";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#e0e0e0";
        ctx.stroke();

        ctx.fillStyle = "#e0e0e0";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(c.val, c.x, c.y - 8);

        ctx.fillStyle = "#8080a0";
        ctx.textBaseline = "top";
        ctx.fillText(c.label, c.x, padT + graphH + 8);
    });
}

// ─── УМНАЯ ОЧИСТКА БАЗЫ ───────────────────────────────────────

export function openSmartCleaner() {
    const chatId = NarrativeStorage.getCurrentChatId();
    const settings = getSettings();
    const chatData = settings.chatData[chatId] || {};
    
    const swipeKeys = Object.keys(chatData.swipeData || {});
    const blockKeys = Object.keys(chatData.blocks || {});
    const ctx = getSTContext();
    const activeSwipeKeys = new Set();
    if (ctx?.chat) {
        ctx.chat.forEach((msg, idx) => {
            const sId = msg.swipe_id !== undefined ? msg.swipe_id : 0;
            activeSwipeKeys.add(`${idx}_${sId}`);
        });
    }
    const inactiveSwipes = swipeKeys.filter(k => !activeSwipeKeys.has(k));
    
    let chatListHtml = `<div style="margin-top:10px; max-height:120px; overflow-y:auto; border:1px solid #4a1525; border-radius:4px; padding:5px; background:rgba(0,0,0,0.5);">`;
    Object.keys(settings.chatData || {}).forEach(id => {
        const isCurrent = id === chatId;
        const shortId = id.length > 30 ? id.substring(0,30) + '...' : id;
        chatListHtml += `
            <div class="nhud-sc-chat-row" style="display:flex; justify-content:space-between; align-items:center; padding:4px; border-bottom:1px dashed #3a1525;">
                <span style="font-size:11px; color:${isCurrent ? '#52e0a3' : '#a08080'};" title="${id}">${isCurrent ? '🟢' : '📁'} ${shortId}</span>
                <button class="nhud-sc-del-chat nhud-s-delete" data-chat="${id}" style="padding:2px 6px; font-size:10px; margin:0;">✕ Удалить</button>
            </div>
        `;
    });
    chatListHtml += `</div>`;
    
    const html = $(`
        <div id="nhud-smart-cleaner-modal" style="position:fixed; top:20vh; left:calc(50% - 200px); width:400px; background:#151220; border:1px solid #4a1525; border-radius:8px; z-index:10006; box-shadow:0 10px 40px rgba(0,0,0,0.9); flex-direction:column;">
            <div style="padding:10px 15px; background:linear-gradient(180deg, #2a101a, #1a0a10); border-bottom:1px solid #4a1525; display:flex; justify-content:space-between;">
                <span style="font-weight:bold; color:#e0c0c0;">🧠 Умная очистка (Менеджер базы)</span>
                <button id="nhud-sc-close" style="background:none; border:none; color:#d05070; cursor:pointer;">✕</button>
            </div>
            <div style="padding:15px; color:#d0b0c0; font-size:13px; display:flex; flex-direction:column; gap:12px;">
                <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; border:1px solid #3a1525;">
                    <div style="margin-bottom:5px;"><b>Текущий чат:</b></div>
                    <div>Инфоблоков: ${blockKeys.length} | Свайпов: ${swipeKeys.length}</div>
                    <div style="color:#d05070; margin-top:4px;"><b>Скрытых (мертвых) свайпов: ${inactiveSwipes.length}</b></div>
                </div>
                
                <button id="nhud-sc-btn-swipes" class="nhud-send-btn" style="padding:8px; background:rgba(80,60,140,0.3); border-color:#5040a0;" ${inactiveSwipes.length===0?'disabled':''}>
                    🧹 Очистить мертвые свайпы (${inactiveSwipes.length})
                </button>
                
                <div style="border-top:1px dashed #4a1525; margin:5px 0;"></div>
                
                <div>
                    <div style="font-weight:bold; color:#a08080; margin-bottom:5px;">🗑️ Удаление папок (чатов) из базы:</div>
                    ${chatListHtml}
                </div>
            </div>
        </div>
    `);
    
    $("body").append(html);
    html.find("#nhud-sc-close").on("click", () => html.remove());
    
    html.find(".nhud-sc-del-chat").on("click", function() {
        const id = $(this).data("chat");
        if (!confirm(`Удалить все данные чата из хранилища мода?\nID: ${id}`)) return;
        NarrativeStorage.deleteChat(id);
        $(this).closest(".nhud-sc-chat-row").fadeOut(150, function() { $(this).remove(); });
        toastr.success("Папка чата удалена из базы!");
        renderStorageStats();
        renderSettingsCharacterAccordion(); 
    });
    
    html.find("#nhud-sc-btn-swipes").on("click", () => {
        if(!confirm("Удалить данные всех скрытых свайпов?")) return;
        inactiveSwipes.forEach(k => delete chatData.swipeData[k]);
        NarrativeStorage.updateChatMetrics(chatId);
        saveSettingsDebounced();
        toastr.success(`Очищено свайпов: ${inactiveSwipes.length}`);
        html.remove(); renderStorageStats();
    });
}
