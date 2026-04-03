// ui/components/modals/AnalyticsModal.js
// Вынесено из _Modals.internal.js (openAnalyticsPopup, renderAnalyticsChart, openSmartCleaner)

import { getSettings, getLive } from '../../../core/StateManager.js';
import { NarrativeStorage } from '../../../storage/NarrativeStorage.js';
import { getContext } from '../../../integration/STContextProvider.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { makeWindowDraggable } from '../../_UIManager.internal.js';
import { renderStorageStats, renderSettingsCharacterAccordion } from '../../SettingsUI.js';

export function openAnalyticsPopup() {
    let popup = $("#nhud-analytics-popup");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-analytics-popup" style="display:none; position:fixed; top:15vh; left:calc(50% - 300px); width:600px; z-index:9997; background:var(--nhud-bg, #151220); border:1px solid #3a5a80; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-analytics-header" style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, #101a25, #0a1015); padding:10px 15px; border-bottom:1px solid #2a4060; cursor:grab;">
                    <span style="font-weight:bold; color:#80b0e0; font-size:14px;">рџ“€ Р”РёРЅР°РјРёРєР° РѕС‚РЅРѕС€РµРЅРёР№ (РђРЅР°Р»РёС‚РёРєР°)</span>
                    <button id="nhud-analytics-close" style="background:none; border:none; color:#e05252; cursor:pointer; padding:0; font-size:16px;">вњ•</button>
                </div>
                <div style="padding:10px; background:rgba(0,0,0,0.4); border-bottom:1px solid #2a4060; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#8080a0; font-size:12px;">Р’С‹Р±РµСЂРёС‚Рµ РїРµСЂСЃРѕРЅР°Р¶Р° РґР»СЏ РѕС‚СЂРёСЃРѕРІРєРё:</span>
                    <select id="nhud-analytics-char-select" class="nhud-select" style="width:250px; background:#0a1015; border-color:#2a4060; color:#e0e0e0;"></select>
                </div>
                <div style="padding:15px; background:rgba(0,0,0,0.2); position:relative;">
                    <canvas id="nhud-analytics-canvas" width="570" height="300" style="background:#0d1117; border:1px solid #1a2530; border-radius:4px; display:block;"></canvas>
                    <div id="nhud-analytics-empty" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; align-items:center; justify-content:center; color:#8080a0; font-size:14px; background:rgba(13, 17, 23, 0.8);">РќРµС‚ РёСЃС‚РѕСЂРёРё РёР·РјРµРЅРµРЅРёР№ РґР»СЏ РіСЂР°С„РёРєР°</div>
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
        sel.append('<option value="">РџСѓСЃС‚Рѕ...</option>');
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
    points.push({ val: firstEntry.val - firstEntry.delta, label: "РЎС‚Р°СЂС‚" }); 
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

// в”Ђв”Ђв”Ђ РЈРњРќРђРЇ РћР§РРЎРўРљРђ Р‘РђР—Р« в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

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
                <span style="font-size:11px; color:${isCurrent ? '#52e0a3' : '#a08080'};" title="${id}">${isCurrent ? 'рџџў' : 'рџ“Ѓ'} ${shortId}</span>
                <button class="nhud-sc-del-chat nhud-s-delete" data-chat="${id}" style="padding:2px 6px; font-size:10px; margin:0;">вњ• РЈРґР°Р»РёС‚СЊ</button>
            </div>
        `;
    });
    chatListHtml += `</div>`;
    
    const html = $(`
        <div id="nhud-smart-cleaner-modal" style="position:fixed; top:20vh; left:calc(50% - 200px); width:400px; background:#151220; border:1px solid #4a1525; border-radius:8px; z-index:10006; box-shadow:0 10px 40px rgba(0,0,0,0.9); flex-direction:column;">
            <div style="padding:10px 15px; background:linear-gradient(180deg, #2a101a, #1a0a10); border-bottom:1px solid #4a1525; display:flex; justify-content:space-between;">
                <span style="font-weight:bold; color:#e0c0c0;">рџ§  РЈРјРЅР°СЏ РѕС‡РёСЃС‚РєР° (РњРµРЅРµРґР¶РµСЂ Р±Р°Р·С‹)</span>
                <button id="nhud-sc-close" style="background:none; border:none; color:#d05070; cursor:pointer;">вњ•</button>
            </div>
            <div style="padding:15px; color:#d0b0c0; font-size:13px; display:flex; flex-direction:column; gap:12px;">
                <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; border:1px solid #3a1525;">
                    <div style="margin-bottom:5px;"><b>РўРµРєСѓС‰РёР№ С‡Р°С‚:</b></div>
                    <div>РРЅС„РѕР±Р»РѕРєРѕРІ: ${blockKeys.length} | РЎРІР°Р№РїРѕРІ: ${swipeKeys.length}</div>
                    <div style="color:#d05070; margin-top:4px;"><b>РЎРєСЂС‹С‚С‹С… (РјРµСЂС‚РІС‹С…) СЃРІР°Р№РїРѕРІ: ${inactiveSwipes.length}</b></div>
                </div>
                
                <button id="nhud-sc-btn-swipes" class="nhud-send-btn" style="padding:8px; background:rgba(80,60,140,0.3); border-color:#5040a0;" ${inactiveSwipes.length===0?'disabled':''}>
                    рџ§№ РћС‡РёСЃС‚РёС‚СЊ РјРµСЂС‚РІС‹Рµ СЃРІР°Р№РїС‹ (${inactiveSwipes.length})
                </button>
                
                <div style="border-top:1px dashed #4a1525; margin:5px 0;"></div>
                
                <div>
                    <div style="font-weight:bold; color:#a08080; margin-bottom:5px;">рџ—‘пёЏ РЈРґР°Р»РµРЅРёРµ РїР°РїРѕРє (С‡Р°С‚РѕРІ) РёР· Р±Р°Р·С‹:</div>
                    ${chatListHtml}
                </div>
            </div>
        </div>
    `);
    
    $("body").append(html);
    html.find("#nhud-sc-close").on("click", () => html.remove());
    
    html.find(".nhud-sc-del-chat").on("click", function() {
        const id = $(this).data("chat");
        if (!confirm(`РЈРґР°Р»РёС‚СЊ РІСЃРµ РґР°РЅРЅС‹Рµ С‡Р°С‚Р° РёР· С…СЂР°РЅРёР»РёС‰Р° РјРѕРґР°?\nID: ${id}`)) return;
        NarrativeStorage.deleteChat(id);
        $(this).closest(".nhud-sc-chat-row").fadeOut(150, function() { $(this).remove(); });
        toastr.success("РџР°РїРєР° С‡Р°С‚Р° СѓРґР°Р»РµРЅР° РёР· Р±Р°Р·С‹!");
        renderStorageStats();
        renderSettingsCharacterAccordion(); 
    });
    
    html.find("#nhud-sc-btn-swipes").on("click", () => {
        if(!confirm("РЈРґР°Р»РёС‚СЊ РґР°РЅРЅС‹Рµ РІСЃРµС… СЃРєСЂС‹С‚С‹С… СЃРІР°Р№РїРѕРІ?")) return;
        inactiveSwipes.forEach(k => delete chatData.swipeData[k]);
        NarrativeStorage.updateChatMetrics(chatId);
        saveSettingsDebounced();
        toastr.success(`РћС‡РёС‰РµРЅРѕ СЃРІР°Р№РїРѕРІ: ${inactiveSwipes.length}`);
        html.remove(); renderStorageStats();
    });
}
