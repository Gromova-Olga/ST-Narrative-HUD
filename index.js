import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced, setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from "../../../../script.js";
import { eventSource, event_types } from "../../../../script.js";
import { NarrativeApiService } from "./api/NarrativeApiService.js";
import { eventBus } from "./core/EventBus.js";
import { getContext as getSTContext } from "./integration/STContextProvider.js";
import { NarrativeStorage } from "./storage/NarrativeStorage.js";
import { extensionName, extensionFolderPath, defaultSettings } from "./core/constants.js";
import { CharacterModel } from "./core/CharacterModel.js";
import { AIParser } from "./core/AIParser.js";
import { getUserName, getCharName, showStatus, stripHtml, parseJsonFromMessage, removeTagsFromMessage, getCurrentSwipeId, getCurrentMessageInfo, cleanJsonString } from "./utils/helpers.js";
import { getSettings, getLive, getChatTrackers, ensureCharInLive, deduplicateCharacters, restoreLiveData, restoreLastSwipeInfoBlocks } from "./core/StateManager.js";

// Подключаем интерфейс
import * as UI from "./ui/UIManager.js";
import * as MsgUI from "./ui/MessageActions.js";
import * as SetUI from "./ui/SettingsUI.js";

// ========================================================================
// МОДУЛЬ 2: Toast-уведомления
// ========================================================================

let notifStylesInjected = false;
const NOTIF_CSS = `
    #nhud-notif-container {
        position: fixed; bottom: 20px; right: 20px; z-index: 99999;
        display: flex; flex-direction: column-reverse; gap: 8px;
        pointer-events: none;
    }
    .nhud-toast {
        pointer-events: auto;
        background: rgba(20, 10, 15, 0.95);
        border: 1px solid var(--nhud-border, #4a1525);
        border-left: 3px solid #80a0d0;
        border-radius: 6px; padding: 10px 14px;
        max-width: 320px; min-width: 200px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        animation: nhud-toast-in 0.3s ease-out;
        font-family: sans-serif;
    }
    .nhud-toast.removing {
        animation: nhud-toast-out 0.3s ease-in forwards;
    }
    .nhud-toast-sender {
        font-size: 11px; font-weight: bold;
        color: #80a0d0;
        margin-bottom: 4px;
    }
    .nhud-toast-text {
        font-size: 13px; color: var(--nhud-text-main, #e0c0c0);
        line-height: 1.4;
    }
    .nhud-toast-device {
        font-size: 9px; color: #606080; margin-top: 4px;
    }
    @keyframes nhud-toast-in {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes nhud-toast-out {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(50px); }
    }
    #nhud-notif-panel {
        display: none; position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%); z-index: 99998;
        width: 400px; max-height: 500px;
        background: rgba(20, 10, 15, 0.97);
        border: 1px solid var(--nhud-border, #4a1525);
        border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.9);
        font-family: sans-serif; overflow: hidden;
        display: flex; flex-direction: column;
    }
    #nhud-notif-panel-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 10px 14px; background: rgba(0,0,0,0.4);
        border-bottom: 1px solid var(--nhud-border);
    }
    #nhud-notif-panel-header span { font-weight: bold; color: #80a0d0; font-size: 14px; }
    #nhud-notif-panel-close {
        background: none; border: none; color: #a08080; cursor: pointer; font-size: 16px;
    }
    #nhud-notif-panel-body {
        flex: 1; overflow-y: auto; padding: 10px;
    }
    .nhud-notif-entry {
        background: rgba(0,0,0,0.3); border: 1px solid #2a2040;
        border-radius: 4px; padding: 8px 10px; margin-bottom: 6px;
        position: relative;
    }
    .nhud-notif-entry-sender { font-size: 11px; font-weight: bold; color: #80a0d0; }
    .nhud-notif-entry-text { font-size: 12px; color: #c0c0e0; margin-top: 3px; }
    .nhud-notif-entry-time { font-size: 9px; color: #606080; margin-top: 3px; }
    .nhud-notif-del {
        position: absolute; top: 4px; right: 6px;
        background: none; border: none; color: #605060; cursor: pointer;
        font-size: 14px; line-height: 1; padding: 2px 4px; border-radius: 3px;
        transition: 0.15s;
    }
    .nhud-notif-del:hover { color: #e05252; background: rgba(224,82,82,0.15); }
    #nhud-notif-panel-empty { text-align: center; color: #606080; padding: 30px; font-size: 13px; }
`;

let notifHistory = [];

export function showNotification(sender, text) {
    if (!notifStylesInjected) {
        $('<style id="nhud-notif-styles">').text(NOTIF_CSS).appendTo('head');
        $('body').append(`
            <div id="nhud-notif-container"></div>
            <div id="nhud-notif-panel">
                <div id="nhud-notif-panel-header">
                    <span>📨 Уведомления</span>
                    <button id="nhud-notif-panel-close">✕</button>
                </div>
                <div id="nhud-notif-panel-body">
                    <div id="nhud-notif-panel-empty">Нет уведомлений</div>
                </div>
            </div>
        `);
        $('#nhud-notif-panel-close').on('click', () => $('#nhud-notif-panel').fadeOut(200));
        notifStylesInjected = true;
    }

    const settings = getSettings();
    const deviceName = settings.prompts?.notificationDeviceName || 'Смартфон';
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    // Сохраняем в историю
    notifHistory.unshift({ sender, text, time, device: deviceName });
    if (notifHistory.length > 50) notifHistory.pop();

    // Сохраняем в chatData между сессиями
    try {
        const chatId = NarrativeStorage.getCurrentChatId();
        if (chatId && getSettings().chatData) {
            if (!getSettings().chatData[chatId]) getSettings().chatData[chatId] = {};
            getSettings().chatData[chatId].notifHistory = notifHistory.slice(0, 50);
            saveSettingsDebounced();
        }
    } catch(e) { console.warn('[NHUD] Failed to save notifHistory:', e); }

    // Обновляем панель
    renderNotifPanel();

    // Toast
    const toast = $(`
        <div class="nhud-toast">
            <div class="nhud-toast-sender">📨 ${sender}</div>
            <div class="nhud-toast-text">${text}</div>
            <div class="nhud-toast-device">via ${deviceName} · ${time}</div>
        </div>
    `);

    toast.on('click', function() {
        $(this).addClass('removing');
        setTimeout(() => $(this).remove(), 300);
    });

    $('#nhud-notif-container').append(toast);

    setTimeout(() => {
        if (toast.parent().length) {
            toast.addClass('removing');
            setTimeout(() => toast.remove(), 300);
        }
    }, 8000);
}

function renderNotifPanel() {
    const body = $('#nhud-notif-panel-body');
    if (!body.length) return;
    body.empty();

    if (notifHistory.length === 0) {
        body.append('<div id="nhud-notif-panel-empty">Нет уведомлений</div>');
        return;
    }

    for (let i = 0; i < notifHistory.length; i++) {
        const n = notifHistory[i];
        const entry = $(`
            <div class="nhud-notif-entry" data-notif-idx="${i}">
                <button class="nhud-notif-del" title="Удалить">✕</button>
                <div class="nhud-notif-entry-sender">📨 ${n.sender}</div>
                <div class="nhud-notif-entry-text">${n.text}</div>
                <div class="nhud-notif-entry-time">via ${n.device} · ${n.time}</div>
            </div>
        `);
        entry.find('.nhud-notif-del').on('click', function(e) {
            e.stopPropagation();
            const idx = parseInt($(this).closest('.nhud-notif-entry').attr('data-notif-idx'));
            if (!isNaN(idx) && idx >= 0 && idx < notifHistory.length) {
                notifHistory.splice(idx, 1);
                // Обновляем сохранённые данные
                try {
                    const chatId = NarrativeStorage.getCurrentChatId();
                    if (chatId && getSettings().chatData) {
                        if (!getSettings().chatData[chatId]) getSettings().chatData[chatId] = {};
                        getSettings().chatData[chatId].notifHistory = notifHistory.slice(0, 50);
                        saveSettingsDebounced();
                    }
                } catch(e) { console.warn('[NHUD] Failed to save notifHistory:', e); }
                renderNotifPanel();
            }
        });
        body.append(entry);
    }
}

export function applyJsonUpdate(jsonData, messageId, swipeId) {
    if (!jsonData) return false;
    const settings = getSettings();
    const live = getLive();
    const userName = getUserName();
    
    console.log(`[${extensionName}] Applying JSON update:`, jsonData);

    // --- ПЕРЕХВАТ КАЛЕНДАРЯ ---
    if (jsonData.calendar_event && jsonData.calendar_event.desc) {
        import('./core/StateManager.js').then(m => {
            const calendar = m.getCalendar();
            if (!calendar.find(e => e.date === jsonData.calendar_event.date && e.desc === jsonData.calendar_event.desc)) {
                calendar.unshift({ 
                    date: jsonData.calendar_event.date || new Date().toLocaleDateString('ru-RU'), 
                    desc: jsonData.calendar_event.desc, 
                    active: true, 
                    realDate: Date.now() 
                });
                UI.showAchievementPopup({ title: "НОВОЕ СОБЫТИЕ", desc: `[${jsonData.calendar_event.date}]: ${jsonData.calendar_event.desc}`, icon: "📅" });
                if (typeof SetUI.renderSettingsCalendar === 'function') SetUI.renderSettingsCalendar();
            }
        });
    }
    
    if (jsonData.trackers) {
        const trackers = getChatTrackers();
        trackers.forEach(tracker => {
            if (jsonData.trackers[tracker.id] !== undefined) {
                live.trackerValues[tracker.id] = Math.min(
                    Math.max(0, parseInt(jsonData.trackers[tracker.id]) || 0),
                    tracker.max
                );
            }
        });
        UI.renderTrackers();
    }
    
    if (jsonData.datetime) live.infoBlocks.datetime = stripHtml(jsonData.datetime);
    if (jsonData.location) live.infoBlocks.location = stripHtml(jsonData.location);
    if (jsonData.weather) live.infoBlocks.weather = stripHtml(jsonData.weather);
    
    if (jsonData.characters) {
        let charsArray = [];
        if (Array.isArray(jsonData.characters)) {
            charsArray = jsonData.characters;
        } else if (typeof jsonData.characters === 'object') {
            charsArray = Object.entries(jsonData.characters).map(([name, data]) => ({ name, ...data }));
        }

        charsArray.forEach(charData => {
            if (!charData.name || charData.name.toLowerCase() === userName.toLowerCase()) return;
            const rawName = charData.name.trim();
            if (live.ignoredCharacters && live.ignoredCharacters.includes(rawName)) return;

            let existingKey = null;
            for (const key of Object.keys(live.characters)) {
                if (key.toLowerCase().trim() === rawName.toLowerCase().trim()) { existingKey = key; break; }
                const kFirst = key.toLowerCase().split(/\s+/)[0];
                const rFirst = rawName.toLowerCase().split(/\s+/)[0];
                if (kFirst === rFirst && kFirst.length > 3) { existingKey = key; break; }
            }
            const name = existingKey || rawName;

            if (!live.characters[name]) live.characters[name] = {};
            live.characters[name].isHiddenFromScene = false;
            if (charData.outfit !== undefined && charData.outfit !== '') {
                if (typeof charData.outfit === 'object') {
                    // Новый формат: объект со слотами { head, torso, legs, feet, accessories }
                    if (!live.characters[name].outfit || typeof live.characters[name].outfit !== 'object') {
                        live.characters[name].outfit = { head: '', torso: '', legs: '', feet: '', accessories: '' };
                    }
                    const slots = ['head', 'torso', 'legs', 'feet', 'accessories'];
                    for (const slot of slots) {
                        if (charData.outfit[slot] !== undefined && charData.outfit[slot] !== '') {
                            live.characters[name].outfit[slot] = stripHtml(String(charData.outfit[slot]));
                        }
                    }
                } else if (typeof charData.outfit === 'string') {
                    // Старый формат: строка — сохраняем как torso (для совместимости)
                    if (!live.characters[name].outfit || typeof live.characters[name].outfit !== 'object') {
                        live.characters[name].outfit = { head: '', torso: '', legs: '', feet: '', accessories: '' };
                    }
                    live.characters[name].outfit.torso = stripHtml(charData.outfit);
                }
            }
            if (charData.state !== undefined && charData.state !== '')   live.characters[name].state  = stripHtml(charData.state);
            if (charData.thoughts !== undefined && charData.thoughts !== '') live.characters[name].thoughts = stripHtml(charData.thoughts);

            if (charData.relationship !== undefined) {
                const newVal = Math.min(100, Math.max(0, parseInt(charData.relationship) || 50));
                let oldVal = live.characters[name].relationship ?? 50;
                if (newVal !== oldVal) {
                    if (!live.relHistory) live.relHistory = {};
                    if (!live.relHistory[name]) live.relHistory[name] = [];
                    live.relHistory[name] = live.relHistory[name].filter(e => String(e.messageId) !== String(messageId));
                    live.relHistory[name].push({ messageId, delta: newVal - oldVal, val: newVal, reason: stripHtml(charData.relationship_change_reason || "Действия повлияли на отношение"), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
                }
                live.characters[name].relationship = newVal;
            }
            if (charData.relationship_status)        live.characters[name].relationship_status        = stripHtml(charData.relationship_status);
            if (charData.relationship_thoughts)      live.characters[name].relationship_thoughts      = stripHtml(charData.relationship_thoughts);
            if (charData.relationship_hint)          live.characters[name].relationship_hint          = stripHtml(charData.relationship_hint);
            if (charData.relationship_change_reason) live.characters[name].relationship_change_reason = stripHtml(charData.relationship_change_reason);
        });

        // Персистим в chatData чтобы персонажи не пропадали между сценами
        const chatIdForChars = NarrativeStorage.getCurrentChatId();
        if (chatIdForChars) {
            const s = getSettings();
            if (!s.chatData[chatIdForChars]) s.chatData[chatIdForChars] = { blocks: {}, metadata: { createdAt: Date.now(), lastAccessed: Date.now() } };
            if (!s.chatData[chatIdForChars].liveData) s.chatData[chatIdForChars].liveData = { trackerValues: {}, characters: {}, relHistory: {}, ignoredCharacters: [] };
            Object.entries(live.characters).forEach(([k, v]) => {
                s.chatData[chatIdForChars].liveData.characters[k] = { ...(s.chatData[chatIdForChars].liveData.characters[k] || {}), ...v };
            });
        }

        UI.renderCharacters();
        SetUI.renderSettingsCharacterAccordion();
        UI.renderRelationships();
        SetUI.renderSettingsTrackers();
    }
    
    settings.promptBlocks.forEach(block => {
        if (jsonData[block.id] !== undefined) {
            let val = jsonData[block.id];
            
            if (Array.isArray(val)) {
                val = val.map(item => {
                    if (typeof item === 'object' && item !== null) {
                        return Object.entries(item).map(([k, v]) => `🔹 <b>${k.toUpperCase()}</b>: ${v}`).join('\n');
                    }
                    return item;
                }).join('\n\n');
            } else if (typeof val === 'object' && val !== null) {
                val = Object.entries(val).map(([k, v]) => `🔹 <b>${k.toUpperCase()}</b>: ${v}`).join('\n\n');
            }
            
            live.infoBlocks[block.id] = String(val); // Убрали stripHtml, чтобы работали теги <b>
        }
    });
    
    const blocksToSave = {};
    settings.promptBlocks.forEach(block => {
        if (live.infoBlocks[block.id]) blocksToSave[block.id] = live.infoBlocks[block.id];
        if (live.infoBlocks.datetime) blocksToSave.datetime = live.infoBlocks.datetime;
        if (live.infoBlocks.location) blocksToSave.location = live.infoBlocks.location;
        if (live.infoBlocks.weather) blocksToSave.weather = live.infoBlocks.weather;
    });

    if (messageId !== undefined) {
        NarrativeStorage.saveMessageBlocks(String(messageId), blocksToSave);
        if (swipeId !== undefined) {
            // ФИКС 2: Добавили сохранение relHistory (графика отношений) в кэш свайпа!
            NarrativeStorage.saveSwipeData(`${messageId}_${swipeId}`, {
                trackerValues: { ...live.trackerValues },
                characters: JSON.parse(JSON.stringify(live.characters)),
                infoBlocks: { ...live.infoBlocks },
                relHistory: live.relHistory ? JSON.parse(JSON.stringify(live.relHistory)) : {}
            });
        }
    }

    if (jsonData.achievement && jsonData.achievement.title) {
        import('./core/StateManager.js').then(m => { const isNew = m.unlockAchievement(jsonData.achievement); if (isNew) { UI.showAchievementPopup(jsonData.achievement); if (typeof SetUI.renderHallOfFame === 'function') SetUI.renderHallOfFame(); } });
    }
    if (jsonData.achievements && !jsonData.achievement) {
        const achList = Array.isArray(jsonData.achievements) ? jsonData.achievements : [jsonData.achievements];
        achList.forEach(ach => { if (ach?.title) import('./core/StateManager.js').then(m => { const isNew = m.unlockAchievement(ach); if (isNew) { UI.showAchievementPopup(ach); if (typeof SetUI.renderHallOfFame === 'function') SetUI.renderHallOfFame(); } }); });
    }

    const codexEntry = jsonData.codex_unlocked || (Array.isArray(jsonData.codex) ? jsonData.codex[0] : null);
    if (codexEntry?.title) {
        import('./core/StateManager.js').then(m => { const isNew = m.unlockCodexEntry(codexEntry); if (isNew) { UI.showAchievementPopup({ title: "ЗАПИСЬ В КОДЕКСЕ", desc: codexEntry.title, icon: "📖" }); if (typeof UI.renderCodex === 'function') UI.renderCodex(); } });
    }

    if (jsonData.xp_gained) {
        import('./core/StateManager.js').then(m => { const leveledUp = m.addHeroXp(jsonData.xp_gained); if (leveledUp) UI.showAchievementPopup({ title: "УРОВЕНЬ ПОВЫШЕН!", desc: "Вы получили 1 очко характеристик!", icon: "🌟" }); });
    }

    if (jsonData.quests && Array.isArray(jsonData.quests)) {
        import('./core/StateManager.js').then(m => {
            const notifications = m.updateQuests(jsonData.quests);
            notifications.forEach(n => { let title = "НОВОЕ ЗАДАНИЕ!", icon = "📜"; if (n.status === 'completed') { title = "ЗАДАНИЕ ВЫПОЛНЕНО!"; icon = "✅"; } if (n.status === 'failed') { title = "ЗАДАНИЕ ПРОВАЛЕНО"; icon = "❌"; } UI.showAchievementPopup({ title, desc: n.title, icon }); });
            if (notifications.length > 0 && typeof UI.renderQuestLog === 'function') UI.renderQuestLog();
        });
    }

    if (jsonData.factions) {
        import('./core/StateManager.js').then(m => {
            const factions = m.getFactions(); let updated = false;
            let pairs = Array.isArray(jsonData.factions)
                ? jsonData.factions.filter(f => f?.name).map(f => [f.name, parseInt(f.rep) || 0])
                : Object.entries(jsonData.factions).map(([n, r]) => [n, parseInt(r) || 0]);
            pairs.forEach(([name, rep]) => {
                rep = Math.min(100, Math.max(0, rep));
                const ex = factions.find(f => f.name.toLowerCase() === name.toLowerCase());
                if (ex) { if (ex.rep !== rep) { const d = rep - ex.rep; ex.rep = rep; updated = true; UI.showAchievementPopup({ title: "Репутация изменена", desc: `${name}: ${d > 0 ? '+' : ''}${d}`, icon: d > 0 ? "📈" : "📉" }); } }
                else { factions.push({ name, rep, desc: "", descActive: false }); updated = true; UI.showAchievementPopup({ title: "Новая фракция", desc: name, icon: "⚑" }); }
            });
            if (updated) { saveSettingsDebounced(); if (typeof SetUI.renderSettingsFactions === 'function') SetUI.renderSettingsFactions(); }
        });
    }
    
    NarrativeStorage.saveLiveData(live);
    saveSettingsDebounced();
    
    UI.renderInfoBlocks();
    MsgUI.updateHistoryButtons();

    // 🗺️ Обработка map_actions из JSON ИИ
    if (jsonData.map_actions) {
        import('./map/MapIntegration.js').then(m => m.handleMapActions(jsonData.map_actions));
    }

    // МОДУЛЬ 2: Обработка notifications
    if (Array.isArray(jsonData.notifications) && settings.modules?.notifications !== false) {
        for (const notif of jsonData.notifications) {
            if (notif?.sender && notif?.text) {
                showNotification(notif.sender, notif.text);
            }
        }
    }

    // МОДУЛЬ 3: Обработка inventory_actions (в chatData, не liveData)
    if (Array.isArray(jsonData.inventory_actions)) {
        const invChatId = NarrativeStorage.getCurrentChatId();
        if (invChatId && settings.chatData) {
            if (!settings.chatData[invChatId]) settings.chatData[invChatId] = {};
            const invChatData = settings.chatData[invChatId];
            for (const action of jsonData.inventory_actions) {
                if (!action?.entity || !action?.action || !action?.item) continue;
                const target = action.entity.toLowerCase() === 'bot' ? 'botInventory' : 'playerInventory';
                if (!Array.isArray(invChatData[target])) invChatData[target] = [];
                if (action.action === 'add') {
                    if (!invChatData[target].includes(action.item)) invChatData[target].push(action.item);
                } else if (action.action === 'remove') {
                    const idx = invChatData[target].indexOf(action.item);
                    if (idx !== -1) invChatData[target].splice(idx, 1);
                }
            }
            saveSettingsDebounced();
            eventBus.emit('inventory:auto-changed');
        }
    }

    return true;
}

export function processLastMessage() {
    const settings = getSettings();
    if (!settings.jsonParser?.enabled) return;
    const ctx = getSTContext();
    if (!ctx?.chat?.length) return;
    
    const lastIndex = ctx.chat.length - 1;
    const message = ctx.chat[lastIndex];
    if (message.is_user || message.is_system) return;
    
    const text = message.mes;
    const { openTag, closeTag, autoRemoveTags } = settings.jsonParser;
    
    try {
        let jsonData = parseModularJson(text, openTag, closeTag);
        
        if (jsonData) {
            const messageId = lastIndex;
            const swipeId = getCurrentSwipeId(messageId);
            applyJsonUpdate(jsonData, messageId, swipeId);
            showStatus("✅ Лайт: обновлено", "success");
        } else {
            showStatus("⚠️ Ошибка JSON (Лайт)", "error");
            toastr.warning("Лайт-режим: ИИ выдал сломанный JSON. Открой консоль (F12), чтобы посмотреть ответ.", "Ошибка парсинга", { timeOut: 8000 });
        }
    } catch (err) {
        showStatus(`❌ Лайт: ${err.message}`, "error");
    }
}

export async function runLightModeUpdate(messageId, messageText) {
    const settings = getSettings();
    try {
        const dynamicPrompt = buildDynamicPrompt(settings);
        const rs = settings.requestSettings;
        let rawText = "";

        if (settings.useSTProfile && settings.activeProfile) {
            const chatMessages = [];
            const mesElements = document.querySelectorAll('.mes');
            Array.from(mesElements).slice(-Math.min(rs.contextMessages || 10, 6)).forEach(mes => {
                const isUser = mes.getAttribute('is_user') === 'true';
                const textEl = mes.querySelector('.mes_text');
                if (!textEl) return;
                const clone = textEl.cloneNode(true);
                clone.querySelectorAll('details').forEach(el => el.remove());
                const text = clone.textContent.trim();
                if (text) chatMessages.push({ role: isUser ? 'user' : 'assistant', content: text });
            });
            chatMessages.push({ role: 'user', content: dynamicPrompt });
            rawText = await NarrativeApiService.generate(chatMessages, settings.activeProfile, "", { max_tokens: rs.maxTokens || 2000, temperature: rs.temperature || 0.7 });
        } else {
            const { generateQuietPrompt } = await import('../../../../script.js');
            rawText = await generateQuietPrompt(dynamicPrompt, false, false) || "";
        }

        if (!rawText) { showStatus("⚠️ Лайт: пустой ответ", "error"); return; }

        const { openTag, closeTag } = settings.jsonParser;
        let jsonData = parseModularJson(rawText, openTag, closeTag);
        if (!jsonData) {
            const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json|```/gi, '').trim();
            const m = cleaned.match(/\{[\s\S]*\}/);
            if (m) { try { jsonData = JSON.parse(cleanJsonString(m[0])); } catch(e) {} }
        }

        if (jsonData) {
            const swipeId = getCurrentSwipeId(messageId);
            applyJsonUpdate(jsonData, messageId, swipeId);
            showStatus("✅ Лайт: обновлено", "success");
        } else {
            showStatus("⚠️ Лайт: JSON не найден", "error");
        }
    } catch(err) {
        showStatus(`❌ Лайт: ${err.message}`, "error");
    }
}

export async function sendToAPI(manualTrigger = false) {
    const settings = getSettings();
    showStatus("⏳ Генерирую...", "loading");
    $("#nhud-manual-send").prop("disabled", true).text("⏳");

    try {
        const dynamicPrompt = buildDynamicPrompt(settings);
        let rawText = "";
        const rs = settings.requestSettings;

        if (settings.useSTProfile) {
            const chatMessages = [];
            const mesElements = document.querySelectorAll('.mes');
            Array.from(mesElements).slice(-rs.contextMessages).forEach(mes => {
                const isUser = mes.getAttribute('is_user') === 'true';
                const textEl = mes.querySelector('.mes_text');
                if (!textEl) return;
                const clone = textEl.cloneNode(true);
                clone.querySelectorAll('details').forEach(el => el.remove());
                const text = clone.textContent.trim();
                if (text) chatMessages.push({ role: isUser ? 'user' : 'assistant', content: text });
            });
            chatMessages.push({ role: 'user', content: dynamicPrompt });

            rawText = await NarrativeApiService.generate(chatMessages, settings.activeProfile, "", { max_tokens: rs.maxTokens, temperature: rs.temperature });
        } else {
            const { generateQuietPrompt } = await import('../../../../script.js');
            rawText = await generateQuietPrompt(dynamicPrompt, false, false) || "";
        }

        if (!rawText) throw new Error("Пустой ответ от модели");
        const { openTag, closeTag } = settings.jsonParser;
        let jsonData = parseModularJson(rawText, openTag, closeTag);
        
        if (!jsonData) {
            const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json|```/gi, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) { try { jsonData = JSON.parse(cleanJsonString(jsonMatch[0])); } catch(e) {} }
        }
        
        if (jsonData) {
            const ctx = getSTContext();
            const messageId = ctx.chat.length - 1;
            const swipeId = getCurrentSwipeId(messageId);
            applyJsonUpdate(jsonData, messageId, swipeId);
            showStatus("✅ Данные обновлены", "success");
            if (manualTrigger) toastr.success("JSON данные получены и применены!");
        } else {
            showStatus("⚠️ JSON не найден", "error");
            if (manualTrigger) toastr.info("JSON не найден. Отладка:\n" + rawText.substring(0, 200), "Отладка", { timeOut: 10000 });
        }
    } catch (err) {
        showStatus(`❌ ${err.message}`, "error");
    } finally {
        $("#nhud-manual-send").prop("disabled", false).text("▶");
    }
}

export function buildMemoryInjectionBlock() {
    const live = getLive();
    if (!live || !live.characters || Object.keys(live.characters).length === 0) return "";

    let memoryText = "\n[CURRENT DYNAMIC MEMORY & CHARACTER STATES]\n";
    let hasData = false;
    
    for (const [charName, charData] of Object.entries(live.characters)) {
        if (charData.ignored || charData.isHiddenFromScene || (live.ignoredCharacters && live.ignoredCharacters.includes(charName))) continue;

        let charBlock = `- ${charName}: `;
        const details = [];

        if (charData.state) details.push(`State: "${charData.state}"`);
        if (charData.thoughts) details.push(`Inner Thoughts: "${charData.thoughts}"`);
        if (charData.relationship !== undefined) {
            details.push(`Relationship with user: ${charData.relationship}/100 (${charData.relationship_status || 'Neutral'})`);
        }
        if (charData.relationship_change_reason) {
            details.push(`Recent relationship shift reason: "${charData.relationship_change_reason}"`);
        }

        if (details.length > 0) {
            charBlock += details.join(" | ");
            memoryText += charBlock + "\n";
            hasData = true;
        }
    }

    memoryText += "[END MEMORY]\n";
    return hasData ? memoryText : "";
}

// 🚀 СИНХРОННАЯ ФУНКЦИЯ (БОЛЬШЕ НИКАКИХ ОПОЗДАНИЙ И АСИНХРОНОВ)
export function injectPromptIntoRequest() {
    const settings = getSettings();
    let finalPrompt = "";

    if (settings.requestSettings?.sendWithMain && !settings.requestSettings?.lightMode) {
        finalPrompt += buildDynamicPrompt(settings);
    }

    try {
        setExtensionPrompt('narrative-hud-parser', finalPrompt ? finalPrompt : '', extension_prompt_types.IN_CHAT, 1, false, extension_prompt_roles.SYSTEM);

        let lorePrompt = "";
        if (settings.modules?.loreInjection) {
            lorePrompt = buildMemoryInjectionBlock();
        }

        if (lorePrompt) {
            const mode = settings.modules?.loreMode || 'system';
            let depth = 1;
            let role = extension_prompt_roles.SYSTEM;
            if (mode === 'user') { depth = 0; role = extension_prompt_roles.USER; }
            else if (mode === 'note') { depth = 4; role = extension_prompt_roles.SYSTEM; }
            setExtensionPrompt('narrative-hud-lore', lorePrompt, extension_prompt_types.IN_CHAT, depth, false, role);
        } else {
            setExtensionPrompt('narrative-hud-lore', '', extension_prompt_types.IN_CHAT, 1, false, extension_prompt_roles.SYSTEM);
        }

        // 🗺️ Интерактивная карта — инжекция контекста позиции игрока
        if (settings.modules?.map) {
            import('./map/MapIntegration.js').then(m => {
                m.injectMapContext(setExtensionPrompt, extension_prompt_types.IN_CHAT, extension_prompt_roles.SYSTEM);
            });
        } else {
            setExtensionPrompt('narrative-hud-map', '', extension_prompt_types.IN_CHAT, 1, false, extension_prompt_roles.SYSTEM);
        }
    } catch(err) {
        console.error(`[${extensionName}] Ошибка инжекции:`, err);
    }
}

// ========================================================================
// МОДУЛЬНАЯ АРХИТЕКТУРА ПРОМПТОВ
// Вместо одного гигантского JSON-скелета — три независимых блока,
// каждый в своих тегах. ИИ проще генерировать, проще парсить.
// ========================================================================

// --- Теги для трёх модулей ---
const HUD_TAGS = {
    core:     { open: '[HUD_CORE]',   close: '[/HUD_CORE]' },
    prog:     { open: '[HUD_PROG]',   close: '[/HUD_PROG]' },
    custom:   { open: '[HUD_CUSTOM]', close: '[/HUD_CUSTOM]' }
};

/**
 * Удалить ВСЕ теги HUD из текста (старые + новые модульные).
 * Вызывается при autoRemoveTags.
 */
function removeAllHudTags(text, legacyOpenTag, legacyCloseTag) {
    if (!text) return text;
    let cleaned = text;

    // Удаляем новые модульные теги
    for (const tags of Object.values(HUD_TAGS)) {
        const openEsc = tags.open.replace(/[.*+?${}()|[\]\\]/g, '\\$&');
        const closeEsc = tags.close.replace(/[.*+?${}()|[\]\\]/g, '\\$&');
        cleaned = cleaned.replace(new RegExp(`${openEsc}[\\s\\S]*?${closeEsc}`, 'gi'), '');
    }

    // Удаляем старые теги (fallback)
    cleaned = removeTagsFromMessage(cleaned, legacyOpenTag, legacyCloseTag);

    return cleaned.trim();
}

/**
 * Собрать промпт для CORE-блока (трекеры, персонажи, время/погода).
 * Это обязательный блок — ИИ должен выдавать его в каждом ответе.
 */
function buildCorePrompt(settings) {
    const lang = settings.prompts.language || 'Russian';
    let prompt = '';

    // Трекеры
    if (settings.modules?.trackers !== false) {
        prompt += settings.prompts.trackersPrompt + "\n";
        const live = getLive();
        const trackers = getChatTrackers();
        if (trackers && trackers.length > 0) {
            const currentVals = trackers.map(t => `${t.label}: ${live.trackerValues[t.id] ?? t.max}/${t.max}`).join(', ');
            prompt += `Current tracker values: ${currentVals}\n`;
        }
    }

    // Персонажи
    if (settings.modules?.characters !== false) {
        prompt += settings.prompts.charsPrompt + "\n";
    }

    // Время, локация, погода
    if (settings.modules?.datetime !== false) {
        prompt += settings.prompts.datetimePrompt + "\n";
        const live = getLive();
        if (live.infoBlocks.datetime) prompt += `Current In-Game Date & Time: ${live.infoBlocks.datetime}\n`;
        if (live.infoBlocks.location) prompt += `Current Location: ${live.infoBlocks.location}\n`;
        if (live.infoBlocks.weather) prompt += `Current Weather: ${live.infoBlocks.weather}\n`;
    }

    // JSON-скелет для CORE
    const statsHint = settings.modules?.enableOutfitStats ? ' (add stats in parentheses, e.g. "Leather jacket (+10 Armor)")' : '';
    const outfitSchema = `"outfit": {"head": "description in ${lang}${statsHint}", "torso": "description in ${lang}${statsHint}", "legs": "description in ${lang}${statsHint}", "feet": "description in ${lang}${statsHint}", "accessories": "description in ${lang}${statsHint}"}`;
    let skeleton = `{\n  "characters": [\n    {\n      "name": "CharacterName",\n      "state": "current state in ${lang}",\n      ${outfitSchema},\n      "thoughts": "thoughts about user in ${lang}",\n      "relationship": 50,\n      "relationship_status": "status in ${lang}",\n      "relationship_thoughts": "thoughts in ${lang}",\n      "relationship_hint": "hint in ${lang}",\n      "relationship_change_reason": "reason in ${lang}"\n    }\n  ]`;

    if (settings.modules?.trackers !== false) {
        const trackers = getChatTrackers();
        if (trackers && trackers.length > 0) {
            const ex = {}; trackers.forEach(t => { ex[t.id] = t.max; });
            skeleton += `,\n  "trackers": ${JSON.stringify(ex)}`;
        } else {
            skeleton += `,\n  "trackers": { "health": 100, "energy": 100 }`;
        }
    }
    if (settings.modules?.datetime !== false) {
        skeleton += `,\n  "datetime": "date and time in ${lang}",\n  "location": "location in ${lang}",\n  "weather": "weather in ${lang}"`;
    }
    // ДОБАВЛЯЕМ ВОТ ЭТО:
    if (settings.modules?.map) {
        skeleton += `,\n  "map_actions": [ { "action": "move", "entity": "Игрок", "zone": "zone_name", "anchor": "anchor_name" } ]`;
    }
    
    skeleton += `\n}`;

    const tags = HUD_TAGS.core;
    prompt += `\n\nCRITICAL: All text values MUST be in ${lang}.`;
    prompt += `\n\nYou MUST output this block in EVERY response. Wrap it in ${tags.open}...${tags.close} tags:\n${tags.open}\n${skeleton}\n${tags.close}`;

    return prompt;
}

/**
 * Собрать промпт для PROGRESSION-блока (квесты, ачивки, кодекс, фракции, xp).
 * Блок опционален — ИИ добавляет его только при срабатывании условий.
 */
function buildProgressionPrompt(settings) {
    const lang = settings.prompts.language || 'Russian';
    const live = getLive();
    let prompt = '';
    const tags = HUD_TAGS.prog;

    // Модульные промпты
    if (settings.modules?.codex !== false && settings.prompts?.codexPrompt) prompt += settings.prompts.codexPrompt + "\n";
    if (settings.modules?.quests && settings.prompts?.questsPrompt) prompt += settings.prompts.questsPrompt + "\n";
    if (settings.modules?.achievements && settings.prompts?.achievementsPrompt) prompt += settings.prompts.achievementsPrompt + "\n";
    if (settings.modules?.hero && settings.prompts?.heroPrompt) prompt += settings.prompts.heroPrompt + "\n";
    if (settings.modules?.factions && settings.prompts?.factionsPrompt) prompt += settings.prompts.factionsPrompt + "\n";

    // Контекстные данные из chatData
    const chatId = NarrativeStorage.getCurrentChatId();
    if (chatId && settings.chatData && settings.chatData[chatId]) {
        const chatData = settings.chatData[chatId];

        // Календарь
        if (settings.modules?.calendar !== false) {
            if (settings.prompts?.calendarPrompt) prompt += "\n" + settings.prompts.calendarPrompt + "\n";
            const activeEvents = (chatData.calendar || []).filter(e => e.active !== false);
            if (activeEvents.length > 0) {
                prompt += `\n[Timeline / Calendar Events]\n`;
                activeEvents.forEach(ev => { prompt += `- [${ev.date}]: ${ev.desc}\n`; });
                prompt += `[End Timeline]\n`;
            }
        }

        // Герой
        if (settings.modules?.hero) {
            const sheet = chatData.heroSheet;
            if (sheet) {
                prompt += `\n[User Character Stats: Level ${sheet.level} | ` +
                    Object.entries(sheet.stats).map(([k, v]) => `${k.replace(/[^а-яА-Яa-zA-Z\s]/g, '').trim()}: ${v}`).join(', ') +
                    `. Take these into account for action outcomes.]\n`;
            }
        }

        // Кодекс
        if (settings.modules?.codex !== false) {
            const activeCodex = (chatData.codex || []).filter(c => c.active !== false);
            if (activeCodex.length > 0) {
                prompt += `\n[Unlocked Codex Entries]\n`;
                activeCodex.forEach(c => { prompt += `- ${c.title}: ${c.text}\n`; });
                prompt += `[End Codex]\n`;
            }
        }

        // Инвентарь
        if (settings.modules?.inventory !== false) {
            const inv = chatData.inventory;
            if (inv) {
                let invText = `\n[User Inventory & Assets]\nMoney: ${inv.money} ${inv.currency}\n`;
                if (inv.items && inv.items.length) invText += `Items: ${inv.items.join(', ')}\n`;
                const actVeh = (inv.vehicles || []).filter(v => v.active);
                if (actVeh.length) invText += `Vehicles: ${actVeh.map(v => `${v.name}${v.desc ? ` (${v.desc})` : ''}`).join(', ')}\n`;
                const actEst = (inv.estate || []).filter(e => e.active);
                if (actEst.length) invText += `Real Estate: ${actEst.map(e => `${e.name}${e.desc ? ` (${e.desc})` : ''}`).join(', ')}\n`;
                prompt += invText + `[End Inventory]\n`;
            }
        }

        // МОДУЛЬ 3: Player Inventory (из chatData, не liveData)
        if (settings.modules?.trackPlayerInventory) {
            const chatId2 = NarrativeStorage.getCurrentChatId();
            const chatData2 = chatId2 ? settings.chatData?.[chatId2] : null;
            const pInv = Array.isArray(chatData2?.playerInventory) ? chatData2.playerInventory : [];
            prompt += `\n[Player Inventory]\n${pInv.length > 0 ? pInv.join(', ') : '(empty)'}\n[End Player Inventory]\n`;
        }

        // МОДУЛЬ 3: Bot Inventory (из chatData, не liveData)
        if (settings.modules?.trackBotInventory) {
            const chatId3 = NarrativeStorage.getCurrentChatId();
            const chatData3 = chatId3 ? settings.chatData?.[chatId3] : null;
            const bInv = Array.isArray(chatData3?.botInventory) ? chatData3.botInventory : [];
            const wealth = settings.prompts?.botWealthStatus || 'Средний';
            prompt += `\n[Bot Inventory]\nItems: ${bInv.length > 0 ? bInv.join(', ') : '(empty)'}\nWealth Status: ${wealth}\n[End Bot Inventory]\n`;
        }

        // Фракции
        if (settings.modules?.factions !== false) {
            const factions = chatData.factions;
            if (factions && factions.length > 0) {
                prompt += `\n[Factions Reputation]\n` +
                    factions.map(f => `${f.name}: ${f.rep}/100${f.descActive && f.desc ? ` (${f.desc})` : ''}`).join('\n') +
                    `\n[End Factions]\n`;
            }
        }

        // Квесты
        if (settings.modules?.quests !== false) {
            const activeQuests = (chatData.quests || []).filter(q => q.status === 'active').map(q => `- ${q.title}: ${q.desc}`);
            if (activeQuests.length > 0) {
                prompt += `\n[Active Quests]\n${activeQuests.join('\n')}\n[End Quests]\n`;
            }
        }
    }

    // JSON-скелет для PROG
    let skeleton = `{}`;
    const progFields = [];
    if (settings.modules?.quests !== false) progFields.push(`  "quests": [ { "title": "Quest title", "desc": "Description", "status": "active|completed|failed" } ]`);
    if (settings.modules?.codex !== false) progFields.push(`  "codex_unlocked": { "title": "Entry title", "text": "Lore text in ${lang}" }`);
    if (settings.modules?.factions !== false) progFields.push(`  "factions": { "FactionName": 50 }`);
    if (settings.modules?.calendar !== false) progFields.push(`  "calendar_event": { "date": "DD.MM.YYYY", "desc": "Event description in ${lang}" }`);
    if (settings.modules?.achievements !== false) progFields.push(`  "achievement": { "title": "Achievement title", "desc": "Description", "icon": "🏆" }`);
    if (settings.modules?.hero !== false) progFields.push(`  "xp_gained": "small|medium|large"`);
    //if (settings.modules?.map) progFields.push(`  "map_actions": [ { "action": "move", "entity": "Игрок/Бот/NPC", "zone": "zone_name", "anchor": "anchor_name_or_null" }, { "action": "spawn", "entity": "NPC Name", "zone": "zone_name" }, { "action": "remove", "entity": "NPC Name" } ]`);
    if (settings.modules?.trackPlayerInventory || settings.modules?.trackBotInventory) progFields.push(`  "inventory_actions": [ { "action": "add", "entity": "Player", "item": "Item name in ${lang}" }, { "action": "remove", "entity": "Bot", "item": "Item name in ${lang}" } ]`);
    if (settings.modules?.notifications !== false) progFields.push(`  "notifications": [ { "sender": "Absent NPC Name or System", "text": "Message text in ${lang}" } ]`);

    if (progFields.length > 0) {
        skeleton = `{\n${progFields.join(',\n')}\n}`;
    }

    if (progFields.length > 0) {
        prompt += `\n\nWhen a quest, achievement, codex, faction, calendar event, XP gain, map movement, inventory change, or notification occurs, output this block (ONLY when triggered, omit if nothing changed):\n${tags.open}\n${skeleton}\n${tags.close}`;
    }

    return prompt;
}

/**
 * Собрать промпт для CUSTOM-блока (кастомные инфоблоки + карта).
 * Блок опционален.
 */
function buildCustomPrompt(settings) {
    const lang = settings.prompts.language || 'Russian';
    let prompt = '';
    const tags = HUD_TAGS.custom;

    // Кастомные промпт-блоки
    if (settings.promptBlocks && settings.promptBlocks.length > 0) {
        settings.promptBlocks.filter(b => b.enabled).forEach(block => {
            prompt += `For the field "${block.id}": ${block.prompt}\n`;
        });
    }

    if (!prompt.trim()) return ''; // Нет кастомных блоков — не генерируем

    // JSON-скелет для CUSTOM
    let skeleton = `{}`;
    const customFields = [];
    if (settings.promptBlocks) {
        settings.promptBlocks.filter(b => b.enabled).forEach(block => {
            if (block.id === 'comments') customFields.push(`  "comments": [ "comment 1", "comment 2" ]`);
            else if (block.id === 'monologue') customFields.push(`  "monologue": "internal monologue text in ${lang}"`);
            else if (block.id === 'diary') customFields.push(`  "diary": [ { "author": "Name", "text": "entry in ${lang}" } ]`);
            else if (block.id === 'skillchecks') customFields.push(`  "skillchecks": [ { "skill": "Skill", "difficulty": "Difficulty", "outcome": "Success/Fail", "text": "Description in ${lang}" } ]`);
            else customFields.push(`  "${block.id}": "text in ${lang}"`);
        });
    }

    if (customFields.length > 0) {
        skeleton = `{\n${customFields.join(',\n')}\n}`;
    }

    prompt += `\n\nWhen relevant, output this block:\n${tags.open}\n${skeleton}\n${tags.close}`;

    return prompt;
}

/**
 * Главная функция сборки промпта. Собирает три модуля и инструкцию по тегам.
 * Поддерживает два режима:
 * - sendWithMain: RP-ответ + JSON-теги в конце
 * - lightMode: только JSON (без RP)
 */
export function buildDynamicPrompt(settings) {
    const openTag = settings.jsonParser?.openTag || '[NHUD]';
    const closeTag = settings.jsonParser?.closeTag || '[/NHUD]';

    let finalPrompt = settings.prompts.system + "\n\n";

    // Собираем три модуля
    const corePrompt = buildCorePrompt(settings);
    const progPrompt = buildProgressionPrompt(settings);
    const customPrompt = buildCustomPrompt(settings);

    finalPrompt += corePrompt;
    if (progPrompt) finalPrompt += "\n" + progPrompt;
    if (customPrompt) finalPrompt += "\n" + customPrompt;

    // МОДУЛЬ: Ручной гардероб игрока (read-only для ИИ)
    if (settings.modules?.injectPlayerOutfit && settings.liveData?.playerOutfitText) {
        const outfitText = settings.liveData.playerOutfitText.trim();
        if (outfitText) {
            finalPrompt += `\n[Player Outfit]\n${outfitText}\n[End Player Outfit]\n`;
            finalPrompt += `\nCRITICAL: The [Player Outfit] above is READ-ONLY context. DO NOT update, modify, or return this outfit in your JSON. The player manages it manually.\n`;
        }
    }

    // Инструкция на отыгрыш пространственного контекста
    if (settings.modules?.map) {
        finalPrompt += `\n\nIMPORTANT SPATIAL RULES: You will receive a [ПРОСТРАНСТВЕННЫЙ КОНТЕКСТ] block below. You MUST obey it strictly:`;
        finalPrompt += `\n- If characters are far apart — describe raising voice, walking over, or inability to see each other.`;
        finalPrompt += `\n- If in different rooms — a character CANNOT see or hear the other unless explicitly stated.`;
        finalPrompt += `\n- If close — describe proximity, eye contact, physical interaction possibilities.`;
        finalPrompt += `\n- You can control the map! Use "map_actions" in your JSON:`;
        finalPrompt += `\n  "map_actions": [`;
        finalPrompt += `\n    { "action": "move", "entity": "Игрок", "zone": "zone_name" },  // Move player`;
        finalPrompt += `\n    { "action": "move", "entity": "bot", "zone": "zone_name", "anchor": "anchor_name" },  // Move your character`;
        finalPrompt += `\n    { "action": "spawn", "entity": "NPC Name", "zone": "zone_name" },  // Spawn NPC`;
        finalPrompt += `\n    { "action": "remove", "entity": "NPC Name" }  // Remove NPC`;
        finalPrompt += `\n  ]`;
        finalPrompt += `\n- CRITICAL: For "zone" and "anchor" in map_actions, use ONLY exact, concise noun names from the spatial context. DO NOT invent descriptive sentences. (e.g. use "Стол", not "У стола рядом с Анной").`;
        finalPrompt += `\n- CRITICAL: For "zone" and "anchor" in map_actions, use ONLY exact, concise noun names from the spatial context.`;
        finalPrompt += `\n- You MUST update the "map_actions" array inside [HUD_CORE] every turn to reflect the CURRENT positions of the active characters, even if they haven't moved.`;
    }

    // МОДУЛЬ 2: Контекстные уведомления
    if (settings.modules?.notifications !== false) {
        const deviceName = settings.prompts?.notificationDeviceName || 'Смартфон';
        finalPrompt += `\n\nNOTIFICATION RULES (Device: "${deviceName}"):`;
        finalPrompt += `\n- Sometimes generate incoming messages/notifications for the Player via their "${deviceName}".`;
        finalPrompt += `\n- CRITICAL: Only send messages from characters/factions/systems NOT currently present in the scene/location.`;
        finalPrompt += `\n- STRICTLY FORBIDDEN to send messages from characters who are near the Player. They interact by voice.`;
        finalPrompt += `\n- Use characters from the broader story, lore, or past scenes who are far away, OR use system/anonymous notifications.`;
        finalPrompt += `\n- Adapt message style to device type (PDA = dry report, Smartphone = casual SMS, Letter = formal tone).`;
        finalPrompt += `\n- Return in JSON: "notifications": [{"sender": "Name/System", "text": "message"}]`;
    }

    // МОДУЛЬ 3: Инвентарь
    if (settings.modules?.trackPlayerInventory || settings.modules?.trackBotInventory) {
        finalPrompt += `\n\nINVENTORY RULES:`;
        finalPrompt += `\n- Track inventory carefully. If someone picks up/buys an item — add it. If drops/spends — remove it. DO NOT invent items from thin air.`;
        if (settings.modules?.trackBotInventory) {
            const wealth = (settings.prompts?.botWealthStatus || '').trim();
            if (wealth) {
                finalPrompt += `\n\nBOT INVENTORY LIMITATION: The bot's current wealth/social status is "${wealth}". The bot CANNOT produce, find, or use items from its inventory that do not logically match this status. Restrict generated items accordingly.`;
            }
        }
        finalPrompt += `\n- When inventory changes, USE ONLY the "inventory_actions" array inside [HUD_PROG] block.`;
        finalPrompt += `\n- STRICTLY FORBIDDEN: Do NOT create "inventory", "player_inventory", "bot_inventory", or any inventory fields inside [HUD_CORE] or inside character objects.`;
        finalPrompt += `\n- Format: "inventory_actions": [{"entity": "Player|Bot", "action": "add|remove", "item": "Item name"}]`;
    }

    // Инструкция по формату ответа
    if (settings.requestSettings?.sendWithMain && !settings.requestSettings?.lightMode) {
        finalPrompt += `\n\nWrite your normal roleplay response first. Then at the very end, append the data blocks. Each block must be wrapped in its own tags. Do NOT combine them into one JSON. Example format:`;
        finalPrompt += `\n\nYour RP text here...`;
        finalPrompt += `\n${HUD_TAGS.core.open}\n{...}\n${HUD_TAGS.core.close}`;
        finalPrompt += `\n${HUD_TAGS.prog.open}\n{...}\n${HUD_TAGS.prog.close}`;
        finalPrompt += `\n\nDo NOT put any text after the closing tags.`;

        // Fallback: также просим старые теги для совместимости
        finalPrompt += `\n\nALTERNATIVELY, you may use the old format with ${openTag}...${closeTag} wrapping a single combined JSON if that's easier for you.`;
    } else {
        finalPrompt += "\n\nReturn ONLY valid JSON. No prose, no markdown, no code blocks. Raw JSON only.";
    }

    return finalPrompt;
}

// ========================================================================
// МОДУЛЬНЫЙ ПАРСИНГ
// ========================================================================

/**
 * Извлечь JSON из всех поддерживаемых тегов в тексте.
 * Ищет [HUD_CORE], [HUD_PROG], [HUD_CUSTOM] + fallback на старые теги.
 * Возвращает слитый объект или null.
 */
function parseModularJson(text, fallbackOpenTag, fallbackCloseTag) {
    if (!text) return null;

    const cleanJson = cleanJsonString;
    let merged = {};

    // 1. Ищем новые модульные теги
    for (const [moduleName, tags] of Object.entries(HUD_TAGS)) {
        const escaped = {
            open: tags.open.replace(/[.*+?${}()|[\]\\]/g, '\\$&'),
            close: tags.close.replace(/[.*+?${}()|[\]\\]/g, '\\$&')
        };
        const regex = new RegExp(`${escaped.open}\\s*(\\{[\\s\\S]*?\\})\\s*${escaped.close}`, 'i');
        const match = text.match(regex);
        if (match) {
            try {
                const obj = JSON.parse(cleanJson(match[1]));
                Object.assign(merged, obj);
            } catch (e) {
                console.warn(`[NHUD] Failed to parse ${moduleName} block:`, e);
            }
        }
    }

    // 2. Fallback: старые теги [NHUD]...[/NHUD]
    if (Object.keys(merged).length === 0) {
        const legacyResult = parseJsonFromMessage(text, fallbackOpenTag, fallbackCloseTag);
        if (legacyResult) {
            Object.assign(merged, legacyResult);
        }
    }

    // 3. Fallback: голый JSON в тексте
    if (Object.keys(merged).length === 0) {
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (codeBlockMatch && codeBlockMatch[1]) {
            try { Object.assign(merged, JSON.parse(cleanJson(codeBlockMatch[1].trim()))); } catch (e) { }
        }
    }
    if (Object.keys(merged).length === 0) {
        const rawMatch = text.match(/\{[\s\S]*\}/);
        if (rawMatch) {
            try { Object.assign(merged, JSON.parse(cleanJson(rawMatch[0]))); } catch (e) { }
        }
    }

    return Object.keys(merged).length > 0 ? merged : null;
}

jQuery(async () => {
    console.log(`[${extensionName}] Loading...`);
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $("#extensions_settings2").append(settingsHtml);
        
        setTimeout(() => {
            $(document).on("click", '[id="nhud-open-global-settings"]', (e) => {
                e.preventDefault();
                UI.openGlobalSettings();
            });
            $(document).on("click", '[id="nhud-rescue-btn"]', (e) => {
                e.preventDefault();
                $("#narrative-hud-sidebar").fadeToggle(200);
                $("#nhud-settings-panel").fadeOut(200); 
                $("#nhud-widget").fadeToggle(200);
            });
        }, 500);

        // ---> ДОБАВИТЬ ВОТ ЭТОТ БЛОК <---
        // Глубокое слияние: если ключей нет (новый профиль), они подтянутся из defaultSettings
        extension_settings[extensionName] = $.extend(
            true, 
            {}, 
            defaultSettings, 
            extension_settings[extensionName] || {}
        );
        // ---------------------------------

        getSettings();
        UI.buildTopbarIcon();
        UI.buildSidebar();
        UI.buildFloatingWidget();
        UI.applyDesignTheme();

        // Инициализация панели уведомлений (создаём DOM сразу, а не при первом уведомлении)
        showNotification.__init = true; // флаг чтобы showNotification не дублировал DOM
        if (!notifStylesInjected) {
            $('<style id="nhud-notif-styles">').text(NOTIF_CSS).appendTo('head');
            $('body').append(`
                <div id="nhud-notif-container"></div>
                <div id="nhud-notif-panel" style="display:none;">
                <div id="nhud-notif-panel-header">
                    <span>📨 Уведомления</span>
                    <button id="nhud-notif-panel-close">✕</button>
                </div>
                <div id="nhud-notif-panel-body">
                    <div id="nhud-notif-panel-empty">Нет уведомлений</div>
                </div>
            </div>
        `);
        $('#nhud-notif-panel-close').on('click', () => $('#nhud-notif-panel').fadeOut(200));
        if (typeof makeWindowDraggable === "function") {
        makeWindowDraggable("nhud-notif-panel", "nhud-notif-panel-header");
    }
        notifStylesInjected = true;
    }

        // Загружаем историю уведомлений из chatData
        try {
            const chatId = NarrativeStorage.getCurrentChatId();
            const chatData = getSettings().chatData?.[chatId];
            if (chatData?.notifHistory) notifHistory = chatData.notifHistory.slice(0, 50);
        } catch(e) {}
        renderNotifPanel();

        // 🔥 МГНОВЕННЫЙ СИНХРОННЫЙ ПЕРЕХВАТЧИК ГЕНЕРАЦИИ
        eventSource.on(event_types.GENERATION_STARTED, () => {
            injectPromptIntoRequest();
        });

        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, () => {
            setTimeout(() => { 
                MsgUI.updateAllJsonEditButtons(); 
                MsgUI.updateHistoryButtons(); 
            }, 300);
        });

        eventSource.on(event_types.MESSAGE_RECEIVED, () => {
            setTimeout(() => {
                const settings = getSettings();
                const ctx = getSTContext();
                if (!ctx?.chat?.length) return;
                
                const lastIndex = ctx.chat.length - 1;
                const message = ctx.chat[lastIndex];
                if (message.is_user || message.is_system) return;

                if (settings.requestSettings.lightMode) {
                    runLightModeUpdate(lastIndex, message.mes);
                    const { openTag, closeTag, autoRemoveTags } = settings.jsonParser;
                    if (autoRemoveTags && (message.mes.includes(openTag) || message.mes.includes('[HUD_CORE]'))) {
                        const cleanedText = removeAllHudTags(message.mes, openTag, closeTag);
                        if (cleanedText !== message.mes) {
                            message.mes = cleanedText;
                            const messageElement = $(`.mes[mesid="${lastIndex}"] .mes_text`);
                            if (messageElement.length) {
                                const html = messageElement.html();
                                const cleanedHtml = removeAllHudTags(html, openTag, closeTag);
                                if (cleanedHtml !== html) messageElement.html(cleanedHtml);
                            }
                        }
                    }
                } else if (settings.requestSettings.sendWithMain) {
                    // message.mes может не содержать тегов (ST их не всегда сохраняет)
                    // Читаем сырой текст из DOM-элемента где теги ещё есть
                    const { openTag, closeTag, autoRemoveTags } = settings.jsonParser;
                    const messageElement = $(`.mes[mesid="${lastIndex}"] .mes_text`);
                    const rawHtml = messageElement.length ? messageElement.html() : "";
                    const rawText = messageElement.length ? messageElement.text() : message.mes;

                    // Пробуем парсить из DOM (там теги могут быть)
                    let jsonData = parseModularJson(rawText, openTag, closeTag);
                    if (!jsonData) jsonData = parseModularJson(rawHtml, openTag, closeTag);
                    if (!jsonData) jsonData = parseModularJson(message.mes, openTag, closeTag);
                    // Fallback — ищем голый JSON
                    if (!jsonData) {
                        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) { try { jsonData = JSON.parse(cleanJsonString(jsonMatch[0])); } catch(e) {} }
                    }

                    if (jsonData) {
                        const swipeId = getCurrentSwipeId(lastIndex);
                        applyJsonUpdate(jsonData, lastIndex, swipeId);
                        showStatus("✅ Обновлено", "success");
                    } else {
                        showStatus("⚠️ JSON не найден", "error");
                    }

                    // Удаляем теги из DOM и из message.mes
                    if (autoRemoveTags) {
                        if (messageElement.length) {
                            const cleanedHtml = removeAllHudTags(rawHtml, openTag, closeTag);
                            if (cleanedHtml !== rawHtml) messageElement.html(cleanedHtml);
                        }
                        if (message.mes.includes(openTag) || message.mes.includes('[HUD_CORE]')) {
                            message.mes = removeAllHudTags(message.mes, openTag, closeTag);
                        }
                    }
                } else if (settings.autoSend) {
                    sendToAPI(false);
                }
                
                injectPromptIntoRequest(); // Обновляем промпт на будущее
            }, 500);
        });

        eventSource.on(event_types.CHAT_CHANGED, () => {
            setTimeout(() => {
                const settings = getSettings();
                // Сохраняем глобальные данные, которые не должны сбрасываться при смене чата
                const savedPlayerOutfitText = settings.liveData?.playerOutfitText || '';
                // Сбрасываем liveData но сохраняем ключи кастомных блоков
                const freshLive = JSON.parse(JSON.stringify(defaultSettings.liveData));
                // Добавляем слоты для всех promptBlocks (включая кастомные типа dogBarbos)
                if (settings.promptBlocks) {
                    settings.promptBlocks.forEach(block => {
                        if (freshLive.infoBlocks[block.id] === undefined) {
                            freshLive.infoBlocks[block.id] = "";
                        }
                    });
                }
                // Восстанавливаем глобальный наряд игрока
                freshLive.playerOutfitText = savedPlayerOutfitText;
                settings.liveData = freshLive;
                saveSettingsDebounced();

                $("#nhud-infoblock-popup").hide();
                $(".nhud-info-btn").removeClass("active");
                $('.nhud-thoughts-popup').hide();

                restoreLiveData(); ensureCharInLive(); deduplicateCharacters(); restoreLastSwipeInfoBlocks();
                
                UI.renderInfoBlocks(); MsgUI.updateAllJsonEditButtons(); UI.renderTrackers();
                UI.renderCharacters(); MsgUI.updateHistoryButtons(); UI.renderRelationships();
                
                // Загружаем историю уведомлений для нового чата
                try {
                    const newChatId = NarrativeStorage.getCurrentChatId();
                    const newChatData = getSettings().chatData?.[newChatId];
                    notifHistory = newChatData?.notifHistory ? newChatData.notifHistory.slice(0, 50) : [];
                } catch(e) { notifHistory = []; }
                renderNotifPanel();

                injectPromptIntoRequest(); // Сразу готовим промпт для нового чата!
            }, 600);
        });

        eventSource.on(event_types.MESSAGE_DELETED, (messageId) => {
            NarrativeStorage.deleteMessageBlocks(String(messageId));

            // Откатываем состояние к предыдущему сообщению
            setTimeout(() => {
                const ctx = getSTContext();
                const settings = getSettings();
                if (!ctx?.chat?.length) return;

                // Ищем последнее сообщение бота после удаления
                let lastBotIndex = -1;
                for (let i = ctx.chat.length - 1; i >= 0; i--) {
                    if (!ctx.chat[i].is_user && !ctx.chat[i].is_system) {
                        lastBotIndex = i;
                        break;
                    }
                }

                if (lastBotIndex === -1) {
                    // Нет сообщений бота — сбрасываем всё
                    settings.liveData.trackerValues = {};
                    settings.liveData.characters = {};
                    settings.liveData.infoBlocks = { ...defaultSettings.liveData.infoBlocks };
                    settings.promptBlocks?.forEach(b => { settings.liveData.infoBlocks[b.id] = ""; });
                } else {
                    const swipeId = getCurrentSwipeId(lastBotIndex);
                    const swipeData = NarrativeStorage.loadSwipeData(`${lastBotIndex}_${swipeId}`);
                    const messageBlocks = NarrativeStorage.getMessageBlocks(String(lastBotIndex));

                    if (swipeData) {
                        if (swipeData.trackerValues) settings.liveData.trackerValues = swipeData.trackerValues;
                        if (swipeData.characters)    settings.liveData.characters    = swipeData.characters;
                        if (swipeData.relHistory)    settings.liveData.relHistory    = JSON.parse(JSON.stringify(swipeData.relHistory));
                        settings.liveData.infoBlocks = { ...messageBlocks, ...(swipeData.infoBlocks || {}) };
                    }
                }

                saveSettingsDebounced();
                UI.renderTrackers();
                UI.renderCharacters();
                UI.renderRelationships();
                UI.renderInfoBlocks();
                MsgUI.updateHistoryButtons();
                MsgUI.updateAllJsonEditButtons();
                showStatus("🗑️ Откат к предыдущему состоянию", "info");
            }, 300);
        });

        eventSource.on(event_types.MESSAGE_SWIPED, (mesId) => {
            setTimeout(() => {
                let msgIdToUse = mesId;
                if (msgIdToUse === undefined || msgIdToUse === null || typeof msgIdToUse === 'object') {
                    msgIdToUse = getCurrentMessageInfo().msgId;
                }
                if (msgIdToUse === null || msgIdToUse === undefined) return;
                
                const swipeId = getCurrentSwipeId(msgIdToUse);
                const swipeData = NarrativeStorage.loadSwipeData(`${msgIdToUse}_${swipeId}`);
                const messageBlocks = NarrativeStorage.getMessageBlocks(String(msgIdToUse));
                const settings = getSettings();
                
                // Очищаем все слоты инфоблоков включая кастомные
                const freshInfoBlocks = JSON.parse(JSON.stringify(defaultSettings.liveData.infoBlocks));
                settings.promptBlocks.forEach(b => { freshInfoBlocks[b.id] = ""; });
                settings.liveData.infoBlocks = freshInfoBlocks;
                settings.liveData.characters = {};
                
                if (swipeData) {
                    if (swipeData.trackerValues) settings.liveData.trackerValues = swipeData.trackerValues;
                    if (swipeData.characters)    settings.liveData.characters    = swipeData.characters;
                    if (swipeData.relHistory)    settings.liveData.relHistory    = JSON.parse(JSON.stringify(swipeData.relHistory));
                    settings.liveData.infoBlocks = { ...messageBlocks, ...(swipeData.infoBlocks || {}) };
                    showStatus(`🔄 Загружен свайп #${swipeId}`, "info");
                } else if (settings.requestSettings?.sendWithMain) {
                    // Нет сохранённых данных — пробуем распарсить из DOM текущего свайпа
                    const { openTag, closeTag } = settings.jsonParser;
                    const mesEl = $(`.mes[mesid="${msgIdToUse}"] .mes_text`);
                    if (mesEl.length) {
                        const rawText = mesEl.text();
                        const rawHtml = mesEl.html();
                        let jsonData = parseModularJson(rawText, openTag, closeTag)
                            || parseModularJson(rawHtml, openTag, closeTag);
                        if (!jsonData) {
                            const m = rawText.match(/\{[\s\S]*\}/);
                            if (m) { try { jsonData = JSON.parse(cleanJsonString(m[0])); } catch(e) {} }
                        }
                        if (jsonData) {
                            applyJsonUpdate(jsonData, msgIdToUse, swipeId);
                            showStatus(`⚡ Свайп #${swipeId} распарсен`, "info");
                        }
                    }
                } else {
                    showStatus(`⚡ Нет данных для свайпа #${swipeId}`, "info");
                }
                saveSettingsDebounced();
                UI.renderTrackers(); UI.renderRelationships(); UI.renderCharacters();
                UI.renderInfoBlocks(); MsgUI.updateAllJsonEditButtons(); MsgUI.updateHistoryButtons();
                
                injectPromptIntoRequest(); // Обновляем после свайпа
            }, 300);
        });

        eventSource.on(event_types.CHAT_DELETED, (chatId) => {
            if (chatId) {
                NarrativeStorage.deleteChat(chatId);
                if ($("#nhud-settings-panel").hasClass("open") || $("#nhud-settings-panel").is(":visible")) {
                    SetUI.renderSettingsCharacterAccordion(); SetUI.renderStorageStats();
                }
            }
        });

        const observer = new MutationObserver(() => { MsgUI.updateHistoryButtons(); MsgUI.updateAllJsonEditButtons(); });
        const chat = document.getElementById('chat');
        if (chat) observer.observe(chat, { childList: true, subtree: false });

        setTimeout(() => {
            restoreLiveData(); restoreLastSwipeInfoBlocks(); ensureCharInLive();
            MsgUI.updateAllJsonEditButtons(); MsgUI.updateHistoryButtons(); UI.renderTrackers();
            UI.renderRelationships(); UI.renderCharacters(); UI.renderInfoBlocks();
            injectPromptIntoRequest(); // Инициируем сразу при загрузке

            // Инициализация интеграции карты
            import('./map/MapIntegration.js').then(m => {
                m.initMapIntegration(setExtensionPrompt, extension_prompt_types.IN_CHAT, extension_prompt_roles.SYSTEM);
            });
        }, 1000);

    } catch (err) { console.error(`[${extensionName}] ❌ Failed:`, err); }
});
