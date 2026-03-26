import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced, setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from "../../../../script.js";
import { eventSource, event_types } from "../../../../script.js";
import { NarrativeApiService } from "./api/NarrativeApiService.js";
import { NarrativeStorage } from "./storage/NarrativeStorage.js";
import { extensionName, extensionFolderPath, defaultSettings } from "./core/constants.js";
import { CharacterModel } from "./core/CharacterModel.js";
import { AIParser } from "./core/AIParser.js";
import { getSTContext, getUserName, getCharName, showStatus, stripHtml, parseJsonFromMessage, removeTagsFromMessage, getCurrentSwipeId, getCurrentMessageInfo } from "./utils/helpers.js";
import { getSettings, getLive, getChatTrackers, ensureCharInLive, deduplicateCharacters, restoreLiveData, restoreLastSwipeInfoBlocks } from "./core/StateManager.js";

// Подключаем интерфейс
import * as UI from "./ui/UIManager.js";
import * as MsgUI from "./ui/MessageActions.js";
import * as SetUI from "./ui/SettingsUI.js";

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
            if (charData.outfit !== undefined && charData.outfit !== '') live.characters[name].outfit = stripHtml(charData.outfit);
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
        let jsonData = parseJsonFromMessage(text, openTag, closeTag);
        
        if (!jsonData) {
            const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
            if (codeBlockMatch && codeBlockMatch[1]) {
                try { jsonData = JSON.parse(codeBlockMatch[1].trim()); } catch (e) { }
            }
            if (!jsonData) {
                const withoutTags = text.replace(/<[^>]*>[\s\S]*?<\/[^>]*>|<[^>]*\/>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                const jsonMatch = withoutTags.match(/(\{[\s\S]*\})/);
                if (jsonMatch) {
                    try { jsonData = JSON.parse(jsonMatch[1]); } catch (e) { }
                }
            }
            if (!jsonData) {
                const rawJsonMatch = text.match(/(\{[\s\S]*\})/);
                if (rawJsonMatch) {
                    try { jsonData = JSON.parse(rawJsonMatch[1]); } catch (e) { }
                }
            }
        }
        
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
        let jsonData = parseJsonFromMessage(rawText, openTag, closeTag);
        if (!jsonData) {
            const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json|```/gi, '').trim();
            const m = cleaned.match(/\{[\s\S]*\}/);
            if (m) { try { jsonData = JSON.parse(m[0]); } catch(e) {} }
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
        let jsonData = parseJsonFromMessage(rawText, openTag, closeTag);
        
        if (!jsonData) {
            const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json|```/gi, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) { try { jsonData = JSON.parse(jsonMatch[0]); } catch(e) {} }
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
    } catch(err) {
        console.error(`[${extensionName}] Ошибка инжекции:`, err);
    }
}

export function buildDynamicPrompt(settings) {
    const lang = settings.prompts.language || 'Russian';
    const openTag = settings.jsonParser?.openTag || '[NHUD]';
    const closeTag = settings.jsonParser?.closeTag || '[/NHUD]';
    let finalPrompt = settings.prompts.system + "\n\n";

    if (settings.modules?.trackers !== false) {
        finalPrompt += settings.prompts.trackersPrompt + "\n";
        const live = getLive();
        const trackers = getChatTrackers();
        if (trackers && trackers.length > 0) {
            const currentVals = trackers.map(t => `${t.label}: ${live.trackerValues[t.id] ?? t.max}/${t.max}`).join(', ');
            finalPrompt += `Current tracker values: ${currentVals}\n`;
        }
    }
    
    if (settings.modules?.characters !== false) finalPrompt += settings.prompts.charsPrompt + "\n";
    
    // --- НОВЫЙ БЛОК ДЛЯ ВРЕМЕНИ И ЛОКАЦИИ ---
    if (settings.modules?.datetime !== false) {
        finalPrompt += settings.prompts.datetimePrompt + "\n";
        const live = getLive(); 
        if (live.infoBlocks.datetime) finalPrompt += `Current In-Game Date & Time: ${live.infoBlocks.datetime}\n`;
        if (live.infoBlocks.location) finalPrompt += `Current Location: ${live.infoBlocks.location}\n`;
        if (live.infoBlocks.weather) finalPrompt += `Current Weather: ${live.infoBlocks.weather}\n`;
    }
    // ----------------------------------------

    if (settings.modules?.codex !== false && settings.prompts?.codexPrompt)               finalPrompt += "\n" + settings.prompts.codexPrompt + "\n";
    if (settings.modules?.quests && settings.prompts?.questsPrompt)             finalPrompt += "\n" + settings.prompts.questsPrompt + "\n";
    if (settings.modules?.achievements && settings.prompts?.achievementsPrompt) finalPrompt += "\n" + settings.prompts.achievementsPrompt + "\n";
    if (settings.modules?.hero && settings.prompts?.heroPrompt)                 finalPrompt += "\n" + settings.prompts.heroPrompt + "\n";
    if (settings.modules?.factions && settings.prompts?.factionsPrompt)         finalPrompt += "\n" + settings.prompts.factionsPrompt + "\n";

    if (settings.promptBlocks && settings.promptBlocks.length > 0) {
        settings.promptBlocks.filter(b => b.enabled).forEach(block => {
            finalPrompt += `For the JSON field "${block.id}": ${block.prompt}\n`;
        });
    }

    const chatId = NarrativeStorage.getCurrentChatId();
    if (chatId && settings.chatData && settings.chatData[chatId]) {
        const chatData = settings.chatData[chatId];

        if (settings.modules?.calendar !== false) {
            if (settings.prompts?.calendarPrompt) finalPrompt += "\n" + settings.prompts.calendarPrompt + "\n";
            const activeEvents = (chatData.calendar || []).filter(e => e.active !== false);
            if (activeEvents.length > 0) {
                finalPrompt += `\n[Timeline / Calendar Events]\n`;
                activeEvents.forEach(ev => { finalPrompt += `- [${ev.date}]: ${ev.desc}\n`; });
                finalPrompt += `[End Timeline]\n`;
            }
        }
        if (settings.modules?.hero) {
            const sheet = chatData.heroSheet;
            if (sheet) {
                finalPrompt += `\n[User Character Stats: Level ${sheet.level} | ` +
                    Object.entries(sheet.stats).map(([k, v]) => `${k.replace(/[^а-яА-Яa-zA-Z\s]/g, '').trim()}: ${v}`).join(', ') +
                    `. Take these into account for action outcomes.]\n`;
            }
        }
        if (settings.modules?.codex !== false) {
            const activeCodex = (chatData.codex || []).filter(c => c.active !== false);
            if (activeCodex.length > 0) {
                finalPrompt += `\n[Unlocked Codex Entries]\n`;
                activeCodex.forEach(c => { finalPrompt += `- ${c.title}: ${c.text}\n`; });
                finalPrompt += `[End Codex]\n`;
            }
        }
        if (settings.modules?.inventory !== false) {
            const inv = chatData.inventory;
            if (inv) {
                let invText = `\n[User Inventory & Assets]\nMoney: ${inv.money} ${inv.currency}\n`;
                if (inv.items && inv.items.length) invText += `Items: ${inv.items.join(', ')}\n`;
                const actVeh = (inv.vehicles || []).filter(v => v.active);
                if (actVeh.length) invText += `Vehicles: ${actVeh.map(v => `${v.name}${v.desc ? ` (${v.desc})` : ''}`).join(', ')}\n`;
                const actEst = (inv.estate || []).filter(e => e.active);
                if (actEst.length) invText += `Real Estate: ${actEst.map(e => `${e.name}${e.desc ? ` (${e.desc})` : ''}`).join(', ')}\n`;
                finalPrompt += invText + `[End Inventory]\n`;
            }
        }
        if (settings.modules?.factions !== false) {
            const factions = chatData.factions;
            if (factions && factions.length > 0) {
                finalPrompt += `\n[Factions Reputation]\n` +
                    factions.map(f => `${f.name}: ${f.rep}/100${f.descActive && f.desc ? ` (${f.desc})` : ''}`).join('\n') +
                    `\n[End Factions]\n`;
            }
        }
        if (settings.modules?.quests !== false) {
            const activeQuests = (chatData.quests || []).filter(q => q.status === 'active').map(q => `- ${q.title}: ${q.desc}`);
            if (activeQuests.length > 0) {
                finalPrompt += `\n[Active Quests]\n${activeQuests.join('\n')}\n[End Quests]\n`;
            }
        }
    }

    finalPrompt += `\n\nCRITICAL: All text values inside the JSON MUST be written in ${lang}.`;

    const mandatoryFields = [];
    if (settings.modules?.trackers !== false) mandatoryFields.push('"trackers"');
    if (settings.modules?.characters !== false) mandatoryFields.push('"characters"');
    if (settings.modules?.datetime !== false) mandatoryFields.push('"datetime", "location", "weather"');
    if (settings.promptBlocks) settings.promptBlocks.filter(b => b.enabled).forEach(b => mandatoryFields.push(`"${b.id}"`));
    if (mandatoryFields.length > 0) {
        finalPrompt += `\nMANDATORY: You MUST always include these fields in every response, no exceptions: ${mandatoryFields.join(', ')}.`;
    }

    let jsonSkeleton = `{\n  "characters": [\n    {\n      "name": "ИмяПерсонажа",\n      "state": "текущее состояние на ${lang}",\n      "outfit": "одежда на ${lang}",\n      "thoughts": "мысли о пользователе на ${lang}",\n      "relationship": 50,\n      "relationship_status": "статус на ${lang}",\n      "relationship_thoughts": "что думает о пользователе на ${lang}",\n      "relationship_hint": "подсказка/цель на ${lang}",\n      "relationship_change_reason": "причина изменения отношений на ${lang}"\n    }\n  ]`;

    if (settings.modules?.trackers !== false) {
        const trackers = getChatTrackers();
        if (trackers && trackers.length > 0) {
            const ex = {}; trackers.forEach(t => { ex[t.id] = t.max; });
            jsonSkeleton += `,\n  "trackers": ${JSON.stringify(ex)}`;
        } else {
            jsonSkeleton += `,\n  "trackers": { "health": 100, "energy": 100 }`;
        }
    }
    if (settings.modules?.datetime !== false) {
        jsonSkeleton += `,\n  "datetime": "дата и время на ${lang}",\n  "location": "локация на ${lang}",\n  "weather": "погода на ${lang}"`;
    }
    if (settings.modules?.quests !== false)       jsonSkeleton += `,\n  "quests": [ { "title": "Название квеста", "desc": "Описание", "status": "active|completed|failed" } ]`;
    if (settings.modules?.codex !== false)         jsonSkeleton += `,\n  "codex_unlocked": { "title": "Название записи", "text": "Текст лора на ${lang}" }`;
    if (settings.modules?.factions !== false)      jsonSkeleton += `,\n  "factions": { "НазваниеФракции": 50 }`;
    if (settings.modules?.calendar !== false)      jsonSkeleton += `,\n  "calendar_event": { "date": "DD.MM.YYYY", "desc": "Описание события на ${lang}" }`;
    if (settings.modules?.achievements !== false)  jsonSkeleton += `,\n  "achievement": { "title": "Название ачивки", "desc": "Описание", "icon": "🏆" }`;
    if (settings.modules?.hero !== false)          jsonSkeleton += `,\n  "xp_gained": "small|medium|large"`;

    if (settings.promptBlocks && settings.promptBlocks.length > 0) {
        settings.promptBlocks.filter(b => b.enabled).forEach(block => {
            if (block.id === 'comments')     jsonSkeleton += `,\n  "comments": [ "комментарий 1", "комментарий 2" ]`;
            else if (block.id === 'monologue')    jsonSkeleton += `,\n  "monologue": "текст внутреннего монолога на ${lang}"`;
            else if (block.id === 'diary')        jsonSkeleton += `,\n  "diary": [ { "author": "Имя", "text": "запись на ${lang}" } ]`;
            else if (block.id === 'skillchecks')  jsonSkeleton += `,\n  "skillchecks": [ { "skill": "Навык", "difficulty": "Сложность", "outcome": "Успех/Провал", "text": "Описание на ${lang}" } ]`;
            else jsonSkeleton += `,\n  "${block.id}": "текст на ${lang}"`;
        });
    }

    jsonSkeleton += `\n}`;

    finalPrompt += `\n\nReturn a JSON object using EXACTLY this structure. Mandatory fields must always be present. Conditional fields only if triggered:\n${jsonSkeleton}`;

    if (settings.requestSettings?.sendWithMain && !settings.requestSettings?.lightMode) {
        finalPrompt += `\n\nWrite your normal roleplay response first. Then at the very end, append the JSON block wrapped in tags EXACTLY like this (no other text after):\n${openTag}\n{your json here}\n${closeTag}`;
    } else {
        finalPrompt += "\n\nReturn ONLY valid JSON. No prose, no markdown, no code blocks. Raw JSON only.";
    }

    return finalPrompt;
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
                    if (autoRemoveTags && message.mes.includes(openTag)) {
                        const cleanedText = removeTagsFromMessage(message.mes, openTag, closeTag);
                        if (cleanedText !== message.mes) {
                            message.mes = cleanedText;
                            const messageElement = $(`.mes[mesid="${lastIndex}"] .mes_text`);
                            if (messageElement.length) {
                                const html = messageElement.html();
                                const cleanedHtml = removeTagsFromMessage(html, openTag, closeTag);
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
                    let jsonData = parseJsonFromMessage(rawText, openTag, closeTag);
                    if (!jsonData) jsonData = parseJsonFromMessage(rawHtml, openTag, closeTag);
                    if (!jsonData) jsonData = parseJsonFromMessage(message.mes, openTag, closeTag);
                    // Fallback — ищем голый JSON
                    if (!jsonData) {
                        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) { try { jsonData = JSON.parse(jsonMatch[0]); } catch(e) {} }
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
                            const cleanedHtml = removeTagsFromMessage(rawHtml, openTag, closeTag);
                            if (cleanedHtml !== rawHtml) messageElement.html(cleanedHtml);
                        }
                        if (message.mes.includes(openTag)) {
                            message.mes = removeTagsFromMessage(message.mes, openTag, closeTag);
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
                settings.liveData = freshLive;
                saveSettingsDebounced();

                $("#nhud-infoblock-popup").hide();
                $(".nhud-info-btn").removeClass("active");
                $('.nhud-thoughts-popup').hide();

                restoreLiveData(); ensureCharInLive(); deduplicateCharacters(); restoreLastSwipeInfoBlocks();
                
                UI.renderInfoBlocks(); MsgUI.updateAllJsonEditButtons(); UI.renderTrackers();
                UI.renderCharacters(); MsgUI.updateHistoryButtons(); UI.renderRelationships();
                
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
                        let jsonData = parseJsonFromMessage(rawText, openTag, closeTag)
                            || parseJsonFromMessage(rawHtml, openTag, closeTag);
                        if (!jsonData) {
                            const m = rawText.match(/\{[\s\S]*\}/);
                            if (m) { try { jsonData = JSON.parse(m[0]); } catch(e) {} }
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
        }, 1000);

    } catch (err) { console.error(`[${extensionName}] ❌ Failed:`, err); }
});
