import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { eventSource, event_types } from "../../../../script.js";
import { NarrativeApiService } from "./NarrativeApiService.js";
import { NarrativeStorage } from "./NarrativeStorage.js";
import { extensionName, extensionFolderPath, defaultSettings } from "./core/constants.js";
import { getSTContext, getUserName, getCharName, showStatus, stripHtml, parseJsonFromMessage, removeTagsFromMessage, getCurrentSwipeId, getCurrentMessageInfo } from "./utils/helpers.js";
import { getSettings, getLive, getChatTrackers, ensureCharInLive, deduplicateCharacters, restoreLiveData, restoreLastSwipeInfoBlocks } from "./core/StateManager.js";

// Подключаем весь интерфейс
import * as UI from "./ui/UIManager.js";

export function applyJsonUpdate(jsonData, messageId, swipeId) {
    if (!jsonData) return false;
    const settings = getSettings();
    const live = getLive();
    const userName = getUserName();
    
    console.log(`[${extensionName}] Applying JSON update:`, jsonData);
    
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
    
    // Понимает и Объекты {"Имя": {...}} и Массивы [{name: "Имя", ...}]
    if (jsonData.characters) {
        let charsArray = [];
        if (Array.isArray(jsonData.characters)) {
            charsArray = jsonData.characters;
        } else if (typeof jsonData.characters === 'object') {
            charsArray = Object.entries(jsonData.characters).map(([name, data]) => ({ name, ...data }));
        }

        charsArray.forEach(charData => {
            if (!charData.name || charData.name.toLowerCase() === userName.toLowerCase()) return;
            const name = charData.name.trim();
            if (!live.characters[name]) live.characters[name] = {};
            
            if (charData.outfit) live.characters[name].outfit = stripHtml(charData.outfit);
            if (charData.state) live.characters[name].state = stripHtml(charData.state);
            if (charData.thoughts) live.characters[name].thoughts = stripHtml(charData.thoughts);
            
            // --- ЛОГИКА ЖУРНАЛА ОТНОШЕНИЙ ---
            if (charData.relationship !== undefined) {
                const newVal = Math.min(100, Math.max(0, parseInt(charData.relationship) || 50));
                let oldVal = live.characters[name].relationship;
                
                if (oldVal === undefined) oldVal = 50;
                
                if (newVal !== oldVal) {
                    if (!live.relHistory) live.relHistory = {};
                    if (!live.relHistory[name]) live.relHistory[name] = [];
                    
                    // ФИКС: Удаляем старую запись для этого же сообщения, чтобы при свайпах не было дублей!
                    live.relHistory[name] = live.relHistory[name].filter(e => String(e.messageId) !== String(messageId));
                    
                    const delta = newVal - oldVal;
                    const reason = stripHtml(charData.relationship_change_reason || "Действия повлияли на отношение");
                    
                    live.relHistory[name].push({
                        messageId: messageId,
                        delta: delta,
                        val: newVal,
                        reason: reason,
                        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    });
                }
                live.characters[name].relationship = newVal;
            }
            // ---------------------------------

            if (charData.relationship_status) live.characters[name].relationship_status = stripHtml(charData.relationship_status);
            if (charData.relationship_thoughts) live.characters[name].relationship_thoughts = stripHtml(charData.relationship_thoughts);
            if (charData.relationship_hint) live.characters[name].relationship_hint = stripHtml(charData.relationship_hint);
            if (charData.relationship_change_reason) live.characters[name].relationship_change_reason = stripHtml(charData.relationship_change_reason);
        });
        
        UI.renderCharacters();
        UI.renderSettingsCharacterAccordion();
        UI.renderRelationships();
        UI.renderSettingsTrackers(); // ФИКС: Заставляем левую панель тоже обновиться!
    }
    
    settings.promptBlocks.forEach(block => {
        if (jsonData[block.id] && typeof jsonData[block.id] === 'string') {
            live.infoBlocks[block.id] = stripHtml(jsonData[block.id]);
        }
    });
    
    const blocksToSave = {};
    settings.promptBlocks.forEach(block => {
        if (live.infoBlocks[block.id]) blocksToSave[block.id] = live.infoBlocks[block.id];
    });

    if (messageId !== undefined) {
        NarrativeStorage.saveMessageBlocks(String(messageId), blocksToSave);
        if (swipeId !== undefined) {
            NarrativeStorage.saveSwipeData(`${messageId}_${swipeId}`, {
                trackerValues: { ...live.trackerValues },
                characters: { ...live.characters },
                infoBlocks: { ...live.infoBlocks }
            });
        }
    }
    
    NarrativeStorage.saveLiveData(live);
    saveSettingsDebounced();
    
    UI.renderInfoBlocks();
    UI.updateHistoryButtons();
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
    
    // 1. Ищем данные в тегах [NHUD]
    let jsonData = parseJsonFromMessage(text, openTag, closeTag);
    
    // 2. ФИКС: Если тегов нет, ищем просто блок ```json ... ```
    if (!jsonData) {
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (codeBlockMatch && codeBlockMatch[1]) {
            try {
                jsonData = JSON.parse(codeBlockMatch[1].trim());
                console.log(`[${extensionName}] ✅ Найден JSON в code block`);
            } catch (e) {
                console.log(`[${extensionName}] ⚠️ Code block содержит некорректный JSON`);
            }
        }
    }
    
    // 3. Если все еще нет JSON, пробуем найти любой JSON-объект в тексте
    if (!jsonData) {
        // Сначала убираем HTML-теги
        const withoutTags = text.replace(/<[^>]*>[\s\S]*?<\/[^>]*>|<[^>]*\/>/gi, ' ')
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim();
        
        // Ищем JSON объект
        const jsonMatch = withoutTags.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
            try { 
                jsonData = JSON.parse(jsonMatch[1]); 
                console.log(`[${extensionName}] ✅ Найден JSON в тексте`);
            } catch (e) {}
        }
        
        // Если не нашли, пробуем последний шанс - сырой поиск
        if (!jsonData) {
            const rawJsonMatch = text.match(/(\{[\s\S]*\})/);
            if (rawJsonMatch) {
                try { 
                    jsonData = JSON.parse(rawJsonMatch[1]); 
                    console.log(`[${extensionName}] ✅ Найден сырой JSON`);
                } catch (e) {}
            }
        }
    }
    
    // Применяем данные, если нашли
    if (jsonData) {
        const messageId = lastIndex;
        const swipeId = getCurrentSwipeId(messageId);
        applyJsonUpdate(jsonData, messageId, swipeId);
        
        // Удаляем JSON из сообщения, если нужно
        if (autoRemoveTags) {
            let cleanedText = text;
            
            // Удаляем [NHUD] теги
            if (text.includes(openTag)) {
                cleanedText = removeTagsFromMessage(cleanedText, openTag, closeTag);
            }
            
            // Удаляем ```json блоки
            const codeBlockRegex = /```(?:json)?\s*\{[\s\S]*?\}```/gi;
            cleanedText = cleanedText.replace(codeBlockRegex, '').trim();
            
            // Удаляем одиночные JSON объекты в самом конце сообщения
            const jsonAtEndRegex = /\s*\{[\s\S]*?\}\s*$/;
            if (!cleanedText.match(/[^}]\s*$/) && cleanedText.match(jsonAtEndRegex)) {
                cleanedText = cleanedText.replace(jsonAtEndRegex, '').trim();
            }
            
            // Обновляем сообщение
            if (cleanedText !== text) {
                message.mes = cleanedText;
                
                // Обновляем отображение в чате
                const messageElement = $(`.mes[mesid="${lastIndex}"] .mes_text`);
                if (messageElement.length) {
                    messageElement.html(cleanedText.replace(/\n/g, '<br>'));
                }
                
                // Сохраняем чат
                import('../../../../script.js').then(m => {
                    if (typeof m.saveChatDebounced === 'function') m.saveChatDebounced();
                }).catch(() => {});
            }
        }
        
        showStatus("✅ Данные обновлены", "success");
    } else {
        showStatus("⚠️ JSON не найден (Лайт)", "error");
    }
}

export function buildDynamicPrompt(settings) {
    const m = settings.modules || { trackers:true, relationships:true, characters:true, thoughts:true, customBlocks:true, datetime:true };
    const p = settings.prompts || {};
    const lang = p.language || "Russian";
    
    // Собираем базовый промт
    let prompt = (p.system || "") + "\n\n";
    prompt += "REQUIRED JSON FORMAT:\n```json\n{\n";
    
    // Модуль: Дата и время
    if (m.datetime) {
        prompt += `  "datetime": "string (in ${lang}), ${p.datetimePrompt || 'Update the current datetime'}",\n`;
    }
    
    // Модуль: Трекеры
    if (m.trackers && settings.trackers && settings.trackers.length > 0) {
        prompt += `  "trackers": { // ${p.trackersPrompt || 'Update numerical values'}\n`;
        settings.trackers.forEach(t => {
            prompt += `    "${t.id}": number (0-${t.max}),\n`;
        });
        prompt += "  },\n";
    }
    
    // Модули: Персонажи и Отношения
    if (m.characters || m.relationships) {
        prompt += `  "characters": { // ${p.charsPrompt || 'Track character states'}\n`;
        prompt += `    "Character_Name": {\n`;
        
        if (m.characters) {
            prompt += `      "outfit": "string (in ${lang})",\n`;
            prompt += `      "state": "string (in ${lang})",\n`;
        }
        if (m.thoughts) {
            prompt += `      "thoughts": "string (in ${lang})",\n`;
        }
        if (m.relationships) {
            prompt += `      "relationship": number (0-100),\n`;
            prompt += `      "relationship_status": "string (in ${lang})",\n`;
            prompt += `      "relationship_thoughts": "string (in ${lang}), what the character thinks about ${getUserName()}",\n`; 
            prompt += `      "relationship_change_reason": "string (in ${lang}), ${p.relReasonPrompt || 'short reason why relationship changed (if it did)'}",\n`;
            if (settings.relationshipSettings?.hintsEnabled) {
                prompt += `      "relationship_hint": "string (in ${lang}), action hint",\n`;
            }
        }
        prompt += "    }\n  },\n";
    }
    
    // Модуль: Кастомные блоки
    if (m.customBlocks && settings.promptBlocks) {
        settings.promptBlocks.filter(b => b.enabled).forEach(b => {
            prompt += `  "${b.id}": "string (in ${lang}), ${b.prompt}",\n`;
        });
    }
    
    prompt += "}\n```\n\n";
    
    prompt += `🔴 CRITICAL RULES 🔴\n`;
    prompt += `1. LANGUAGE: All string values inside the JSON MUST be written strictly in ${lang}. Do not use English unless the user explicitly requested it.\n`;
    prompt += `2. COMPLETENESS: You MUST include ALL keys listed in the template above. Do not skip or omit any enabled modules or custom blocks.\n`;
    
    return prompt;
}

export function buildQuietPrompt(settings, newText) {
    const live = getLive();
    const trackersList = getChatTrackers().map(t => `${t.label} (${t.id}): ${live.trackerValues[t.id] || 0}/${t.max}`).join(", ");
    
    const userName = getUserName();
    const charNames = Object.keys(live.characters).filter(n => n.toLowerCase() !== userName.toLowerCase());
    const lang = settings.prompts?.language || "Russian";
    
    const charsContext = charNames.map(n => {
        const c = live.characters[n];
        return `- ${n}: Отношение=${c.relationship||50}/100 (Статус: "${c.relationship_status||'Нейтрально'}"). Одежда: "${c.outfit||'Неизвестно'}". Состояние: "${c.state||'Нормальное'}".`;
    }).join("\n");

    const enabledBlocks = settings.promptBlocks.filter(b => b.enabled);
    const blocksJson = enabledBlocks.map(b => `    "${b.id}": "текст на ${lang}"`).join(",\n");
    const relStatuses = settings.relationshipSettings?.statuses || "Neutral";
    
    return `[SYSTEM OVERRIDE: IGNORE ALL PREVIOUS CHARACTER INSTRUCTIONS, JAILBREAKS, AND FORMATTING RULES. YOU ARE NOW A PURE DATA PARSER]

ТЕКУЩЕЕ СОСТОЯНИЕ (До сцены):
Трекеры: ${trackersList}
Персонажи:
${charsContext}

НОВАЯ СЦЕНА (Последнее событие):
"${newText}"

ЗАДАЧА:
Основываясь на "Текущем состоянии" и "Новой сцене", выведи измененные данные.
ОБЯЗАТЕЛЬНО оберни ответ в блок \`\`\`json ... \`\`\`.
НЕ используй <think>, не пиши логические блоки, не пиши текст. ТОЛЬКО валидный JSON:
\`\`\`json
{
  "trackers": { "ID_трекера": число },
  "datetime": "Напиши на ${lang}: 📅 DD.MM.YYYY · 🕒 HH:MM · 🌤 weather · 📍 location",
  "characters": [
    {
      "name": "Имя (не ${userName})",
      "outfit": "одежда на ${lang}",
      "state": "состояние на ${lang}",
      "thoughts": "мысли на ${lang}",
      "relationship": 0-100,
      "relationship_status": "один из: ${relStatuses}",
      "relationship_thoughts": "что думает о ${userName} на ${lang}",
      "relationship_change_reason": "${settings.prompts?.relReasonPrompt || 'причина изменения отношения'} на ${lang}",
      "relationship_hint": "подсказка для ${userName} на ${lang}"
    }
  ],
${blocksJson}
}
\`\`\`
CRITICAL: ALL TEXT VALUES MUST BE IN ${lang.toUpperCase()}!`;
}

export async function runLightModeUpdate(messageId, text) {
    const settings = getSettings();
    showStatus("⚡ Фоновый анализ...", "loading");
    
    try {
        const quietPrompt = buildQuietPrompt(settings, text);
        let rawText = "";
        
        if (settings.useSTProfile) {
            rawText = await NarrativeApiService.generate(
                [{ role: 'user', content: quietPrompt }], 
                settings.activeProfile, 
                "You are a strict data parser. Return only valid JSON. No markdown. No explanations.", 
                { max_tokens: 1500, temperature: 0.1 }
            );
        } else {
            const { generateQuietPrompt } = await import('../../../../script.js');
            try {
                rawText = await generateQuietPrompt({ prompt: quietPrompt }) || "";
            } catch (e) {
                rawText = await generateQuietPrompt(quietPrompt, false, false) || "";
            }
        }
        
        if (!rawText) throw new Error("Пустой ответ от ИИ");
        
        console.log(`[${extensionName}] 🤖 Ответ Лайт-режима (Сырой):`, rawText);
        
        let jsonData = null;
        
        // Попытка 1: Ищем красивый блок ```json ... ```
        const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (codeBlockMatch && codeBlockMatch[1]) {
            try {
                jsonData = JSON.parse(codeBlockMatch[1].trim());
                console.log(`[${extensionName}] ✅ JSON найден в code block`);
            } catch (e) {
                console.log(`[${extensionName}] ⚠️ Code block содержит некорректный JSON, пробуем другие варианты`);
            }
        }
        
        // Попытка 2: Если не нашли в code block, ищем JSON объект напрямую
        if (!jsonData) {
            // Удаляем все XML/HTML теги (включая <think> и подобные)
            const withoutTags = rawText.replace(/<[^>]*>[\s\S]*?<\/[^>]*>|<[^>]*\/>/gi, ' ')
                                      .replace(/<[^>]+>/g, ' ')
                                      .replace(/\s+/g, ' ')
                                      .trim();
            
            // Ищем JSON объект (содержимое между { и })
            const jsonMatch = withoutTags.match(/(\{[\s\S]*\})/);
            if (jsonMatch) {
                try {
                    jsonData = JSON.parse(jsonMatch[1]);
                    console.log(`[${extensionName}] ✅ JSON найден после очистки тегов`);
                } catch (e) {
                    console.log(`[${extensionName}] ⚠️ Найденный JSON некорректен, пробуем последний вариант`);
                }
            }
        }
        
        // Попытка 3: Самая агрессивная - ищем любой JSON в сыром тексте
        if (!jsonData) {
            const rawJsonMatch = rawText.match(/(\{[\s\S]*\})/);
            if (rawJsonMatch) {
                try {
                    jsonData = JSON.parse(rawJsonMatch[1]);
                    console.log(`[${extensionName}] ✅ JSON найден в сыром тексте`);
                } catch (e) {
                    console.log(`[${extensionName}] ❌ Не удалось распарсить JSON`);
                }
            }
        }
        
        if (jsonData) {
            const swipeId = getCurrentSwipeId(messageId);
            applyJsonUpdate(jsonData, messageId, swipeId);
            showStatus("✅ Лайт: обновлено", "success");
        } else {
            showStatus("⚠️ Ошибка JSON (Лайт)", "error");
            toastr.warning(
                "Лайт-режим: ИИ выдал сломанный JSON. Открой консоль (F12), чтобы посмотреть ответ.",
                "Ошибка парсинга",
                { timeOut: 8000 }
            );
            console.log(`[${extensionName}] ❌ Сырой ответ для отладки:`, rawText);
        }
    } catch (err) {
        showStatus(`❌ Лайт: ${err.message}`, "error");
        console.error(`[${extensionName}] ❌ Ошибка в runLightModeUpdate:`, err);
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

            rawText = await NarrativeApiService.generate(chatMessages, settings.activeProfile, settings.prompts.system, { max_tokens: rs.maxTokens, temperature: rs.temperature });
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

export async function injectPromptIntoRequest() {
    const settings = getSettings();
    // Блокируем инжекцию огромного промта, если включен Лайт-режим!
    if (!settings.requestSettings.sendWithMain || settings.requestSettings.lightMode) {
        try {
            const { setExtensionPrompt, extension_prompt_types, extension_prompt_roles } = await import('../../../../script.js');
            setExtensionPrompt('narrative-hud', '', extension_prompt_types.IN_CHAT, 1, false, extension_prompt_roles.SYSTEM);
        } catch(e) {}
        return;
    }
    
    try {
        const { setExtensionPrompt, extension_prompt_types, extension_prompt_roles } = await import('../../../../script.js');
        setExtensionPrompt('narrative-hud', buildDynamicPrompt(settings), extension_prompt_types.IN_CHAT, 1, false, extension_prompt_roles.SYSTEM);
    } catch(err) { console.error(`[${extensionName}] Ошибка инжекции:`, err); }
}

export function clearInjectedPrompt() {
    import('../../../../script.js').then(({ setExtensionPrompt, extension_prompt_types, extension_prompt_roles }) => {
        setExtensionPrompt('narrative-hud', '', extension_prompt_types.IN_CHAT, 1, false, extension_prompt_roles.SYSTEM);
    });
}

jQuery(async () => {
    console.log(`[${extensionName}] Loading...`);
    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $("#extensions_settings2").append(settingsHtml);
        
        // Привязываем клик к новой кнопке!
        setTimeout(() => {
            $("#nhud-open-global-settings").on("click", () => UI.openGlobalSettings());
            // Волшебная кнопка, которая прячет или показывает сразу всё!
            $("#nhud-rescue-btn").on("click", () => {
                $("#narrative-hud-sidebar").fadeToggle(200);
                $("#nhud-settings-panel").fadeOut(200); // Левую панель лучше всегда просто прятать
                $("#nhud-widget").fadeToggle(200);
            });
        }, 500);

        getSettings();
        UI.buildTopbarIcon();
        UI.buildSidebar();
        UI.buildFloatingWidget();
        UI.applyDesignTheme();

        let injectionDone = false;
        eventSource.on(event_types.GENERATION_STARTED, async () => {
            if (injectionDone) return;
            injectionDone = true;
            await injectPromptIntoRequest();
        });

        eventSource.on(event_types.GENERATION_ENDED, () => {
            injectionDone = false;
            clearInjectedPrompt();
        });

        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, () => {
            setTimeout(() => { UI.updateAllJsonEditButtons(); UI.updateHistoryButtons(); }, 300);
        });

        eventSource.on(event_types.MESSAGE_RECEIVED, () => {
            setTimeout(() => {
                const settings = getSettings();
                const ctx = getSTContext();
                if (!ctx?.chat?.length) return;
                
                const lastIndex = ctx.chat.length - 1;
                const message = ctx.chat[lastIndex];
                if (message.is_user || message.is_system) return;

                // ВОТ ОНО! Если включен Лайт-режим, запускаем правильную функцию:
                if (settings.requestSettings.lightMode) {
                    runLightModeUpdate(lastIndex, message.mes);
                    
                    // Зачистка: если ИИ всё-таки нагадил тегами по старой памяти, вырезаем их из текста
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
                            import('../../../../script.js').then(m => {
                                if (typeof m.saveChatDebounced === 'function') m.saveChatDebounced();
                            }).catch(() => {});
                        }
                    }
                } else if (settings.requestSettings.sendWithMain) {
                    processLastMessage();
                } else if (settings.autoSend) {
                    sendToAPI(false);
                }
            }, 500);
        });

        eventSource.on(event_types.CHAT_CHANGED, () => {
            setTimeout(() => {
                const settings = getSettings();
                settings.liveData = JSON.parse(JSON.stringify(defaultSettings.liveData));
                saveSettingsDebounced();

                $("#nhud-infoblock-popup").hide();
                $(".nhud-info-btn").removeClass("active");
                $('.nhud-thoughts-popup').hide();

                restoreLiveData(); ensureCharInLive(); deduplicateCharacters(); restoreLastSwipeInfoBlocks();
                
                UI.renderInfoBlocks(); UI.updateAllJsonEditButtons(); UI.renderTrackers();
                UI.renderCharacters(); UI.updateHistoryButtons(); UI.renderRelationships();
            }, 600);
        });

        eventSource.on(event_types.MESSAGE_DELETED, (messageId) => {
            NarrativeStorage.deleteMessageBlocks(String(messageId));
            UI.updateHistoryButtons(); UI.updateAllJsonEditButtons();
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
                
                settings.promptBlocks.forEach(b => { settings.liveData.infoBlocks[b.id] = ""; });
                settings.liveData.characters = {};
                
                if (swipeData) {
                    if (swipeData.trackerValues) settings.liveData.trackerValues = swipeData.trackerValues;
                    if (swipeData.characters)    settings.liveData.characters    = swipeData.characters;
                    if (swipeData.relHistory)    settings.liveData.relHistory    = JSON.parse(JSON.stringify(swipeData.relHistory));
                    settings.liveData.infoBlocks = { ...messageBlocks, ...(swipeData.infoBlocks || {}) };
                    showStatus(`🔄 Загружен свайп #${swipeId}`, "info");
                } else {
                    showStatus(`⚡ Нет данных для свайпа #${swipeId}`, "info");
                }
                saveSettingsDebounced();
                UI.renderTrackers(); UI.renderRelationships(); UI.renderCharacters();
                UI.renderInfoBlocks(); UI.updateAllJsonEditButtons(); UI.updateHistoryButtons();
            }, 300);
        });

        eventSource.on(event_types.CHAT_DELETED, (chatId) => {
            if (chatId) {
                NarrativeStorage.deleteChat(chatId);
                if ($("#nhud-settings-panel").hasClass("open")) {
                    UI.renderSettingsCharacterAccordion(); UI.renderStorageStats();
                }
            }
        });

        const observer = new MutationObserver(() => { UI.updateHistoryButtons(); UI.updateAllJsonEditButtons(); });
        const chat = document.getElementById('chat');
        if (chat) observer.observe(chat, { childList: true, subtree: false });

        setTimeout(() => {
            restoreLiveData(); restoreLastSwipeInfoBlocks(); ensureCharInLive();
            UI.updateAllJsonEditButtons(); UI.updateHistoryButtons(); UI.renderTrackers();
            UI.renderRelationships(); UI.renderCharacters(); UI.renderInfoBlocks();
        }, 1000);

    } catch (err) { console.error(`[${extensionName}] ❌ Failed:`, err); }
});
