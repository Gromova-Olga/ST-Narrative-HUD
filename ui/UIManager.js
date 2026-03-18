// ui/UIManager.js
import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced, callPopup } from "../../../../../script.js";
import { extensionName } from "../core/constants.js";
import { NarrativeStorage } from "../NarrativeStorage.js";
import { getSTContext, getUserName, getCharName, showStatus, findCharacterKey, getSTProfiles, getCurrentSwipeId, parseJsonFromMessage } from "../utils/helpers.js";
import { getSettings, getLive, getChatTrackers, getTrackerValue, updateGlobalAvatar } from "../core/StateManager.js";
import { applyJsonUpdate, sendToAPI } from "../index.js";

// --- Вспомогательная функция для красивого рендера текста ---
export function formatPopupText(text) {
    if (!text) return '<i style="color:#555">Нет данных</i>';
    return String(text)
        .split('\n')
        .filter(line => line.trim() !== '') // Убираем пустые строки
        .map(line => `<div style="margin-bottom:8px; line-height:1.4;">${
            line.replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--nhud-text-main, #e0b0b0);">$1</b>') // Жирный текст
                .replace(/\*(.*?)\*/g, '<i>$1</i>') // Курсив
        }</div>`)
        .join('');
}

// ─── History Button Functions ──────────────────────────────────────────

export function addHistoryButton(messageId, messageElement) {
    if (!messageElement) {
        messageElement = $(`.mes[mesid="${messageId}"]`);
    }
    
    if (messageElement.find('.nhud-history-btn').length) return;
    
    const btn = $(`
        <button class="nhud-history-btn" title="Инфоблоки этого сообщения">📋</button>
    `);
    
    btn.on('click', (e) => {
        e.stopPropagation();
        showHistoryPopup(messageId);
    });
    
    const mesButtons = messageElement.find('.mes_buttons');
    if (mesButtons.length) {
        mesButtons.append(btn);
    } else {
        const mesText = messageElement.find('.mes_text');
        if (mesText.length) {
            mesText.css('position', 'relative');
            mesText.append(btn);
        }
    }
}

export function updateHistoryButtons() {
    document.querySelectorAll('.mes[is_user="false"]').forEach(mes => {
        const msgId = mes.getAttribute('mesid');
        if (!msgId) return;

        const existing = mes.querySelector('.nhud-history-btn');
        const swipeId = mes.getAttribute('swipeid') || '0';
        
        const blocks = NarrativeStorage.getMessageBlocks(msgId);
        const swipeData = NarrativeStorage.loadSwipeData(`${msgId}_${swipeId}`);
        
        const hasBlocks = Object.keys(blocks).length > 0;
        const hasSwipeBlocks = swipeData && swipeData.infoBlocks && Object.keys(swipeData.infoBlocks).length > 0;
        const hasHistory = hasBlocks || hasSwipeBlocks;

        if (existing) {
            existing.style.display = hasHistory ? '' : 'none';
            return;
        }

        if (hasHistory) {
            addHistoryButton(msgId, $(mes));
        }
    });
}

export function showHistoryPopup(msgId) {
    const blocks = NarrativeStorage.getMessageBlocks(msgId);
    if (Object.keys(blocks).length === 0) return;
    const live = getLive();
    Object.entries(blocks).forEach(([key, value]) => {
        live.infoBlocks[key] = value;
    });
    renderInfoBlocks();
    const settings = getSettings();
    const firstKey = settings.promptBlocks.find(b => blocks[b.id])?.id;
    if (firstKey) $(`.nhud-info-btn[data-block="${firstKey}"]`).trigger('click');
    showStatus(`📋 История #${msgId}`, "info");
}

// ─── JSON Editor Functions ─────────────────────────────────────────────

export function addMessageButtons(messageId) {
    const messageElement = $(`.mes[mesid="${messageId}"]`);
    if (!messageElement.length) return;
    
    // Если кнопки уже есть — выходим
    if (messageElement.find('.nhud-msg-actions').length) return;
    
    const savedData = NarrativeStorage.getMessageBlocks(String(messageId));
    const swipeId = getCurrentSwipeId(messageId);
    const swipeData = swipeId ? NarrativeStorage.loadSwipeData(`${messageId}_${swipeId}`) : null;
    const hasData = Object.keys(savedData).length > 0 || (swipeData && Object.keys(swipeData).length > 0);
    
    // Создаем контейнер для наших кнопок
    const btnContainer = $(`<div class="nhud-msg-actions" style="display:inline-flex; gap:4px; margin-left:8px;"></div>`);
    
    // Кнопка JSON
    const jsonButton = $(`
        <div class="mes_button" title="Редактор JSON (Narrative HUD)" style="${!hasData ? 'opacity:0.5;' : ''}">
            <i class="fa-solid fa-code"></i>
        </div>
    `);
    jsonButton.on('click', (e) => { e.stopPropagation(); openJsonEditor(messageId); });
    
    // Кнопка Извлечения текста (Волшебная палочка)
    const extractButton = $(`
        <div class="mes_button" title="Извлечь статы из текста (Regex)">
            🪄
        </div>
    `);
    extractButton.on('click', (e) => { e.stopPropagation(); extractDataFromText(messageId); });
    
    btnContainer.append(extractButton).append(jsonButton);
    
    const eyeButton = messageElement.find('.extraMesButtons .fa-eye, .extraMesButtons .fa-eye-slash').first();
    if (eyeButton.length) {
        eyeButton.parent().after(btnContainer);
    } else {
        messageElement.find('.extraMesButtons').append(btnContainer);
    }
}

export function updateAllJsonEditButtons() {
    const ctx = getSTContext();
    if (!ctx?.chat) return;
    
    ctx.chat.forEach((_, index) => {
        addMessageButtons(index);
    });
}

export async function openJsonEditor(messageId) {
    const messageElement = $(`.mes[mesid="${messageId}"]`);
    if (!messageElement.length) {
        toastr.error('Сообщение не найдено');
        return;
    }
    
    const swipeId = messageElement.attr('swipeid');
    if (swipeId === undefined) {
        toastr.error('Не удалось определить свайп');
        return;
    }
    
    const swipeKey = `${messageId}_${swipeId}`;
    
    const swipeData = NarrativeStorage.loadSwipeData(swipeKey);
    const infoBlocks = NarrativeStorage.getMessageBlocks(String(messageId));
    
    const settings = getSettings();
    
    const fullData = {
        trackers: swipeData?.trackerValues || {},
        characters: swipeData?.characters 
            ? Object.entries(swipeData.characters).map(([name, data]) => ({ 
                name, 
                outfit: data.outfit || "", 
                state: data.state || "", 
                thoughts: data.thoughts || "" 
              }))
            : [],
        datetime: swipeData?.infoBlocks?.datetime || "",
    };
    
    settings.promptBlocks.forEach(b => {
        fullData[b.id] = infoBlocks[b.id] || swipeData?.infoBlocks?.[b.id] || "";
    });

    const editorHtml = $(`
        <div class="nhud-json-editor">
            <h3 style="margin-bottom:15px;">📦 JSON Editor — Сообщение #${messageId} · Свайп #${swipeId}</h3>
            <div style="margin-bottom:10px; color:#606080; font-size:0.85em;">
                Редактируй данные для этого свайпа. Сохранение применит изменения к HUD.
            </div>
            <textarea id="nhud-json-editor-textarea" class="nhud-json-editor-textarea" rows="20" style="width:100%; font-family:monospace;">${
                JSON.stringify(fullData, null, 2)
            }</textarea>
            <div style="display:flex; gap:10px; margin-top:15px; justify-content:flex-end;">
                <button id="nhud-json-editor-validate" class="menu_button">🔍 Validate</button>
                <button id="nhud-json-editor-format" class="menu_button">✨ Format</button>
            </div>
            <div style="margin-top:10px; font-size:0.8em; color:#505070; text-align:right;">
                Последнее обновление: ${new Date().toLocaleTimeString()}
            </div>
        </div>
    `);
    
    setTimeout(() => {
        editorHtml.find('#nhud-json-editor-validate').on('click', () => {
            try { 
                JSON.parse(editorHtml.find('#nhud-json-editor-textarea').val()); 
                toastr.success('✅ JSON валидный!'); 
            } catch (e) { 
                toastr.error('❌ ' + e.message); 
            }
        });
        
        editorHtml.find('#nhud-json-editor-format').on('click', () => {
            const ta = editorHtml.find('#nhud-json-editor-textarea');
            try { 
                ta.val(JSON.stringify(JSON.parse(ta.val()), null, 2)); 
                toastr.success('✨ Отформатировано'); 
            } catch (e) { 
                toastr.error('Ошибка форматирования'); 
            }
        });
    }, 100);
    
    const result = await callPopup(editorHtml, 'confirm', null, {
        okButton: '💾 Сохранить',
        cancelButton: 'Отмена',
        wide: true
    });
    
    if (result) {
        try {
            const newData = JSON.parse(editorHtml.find('#nhud-json-editor-textarea').val());
            
            const blocksToSave = {};
            settings.promptBlocks.forEach(b => {
                if (newData[b.id]) blocksToSave[b.id] = newData[b.id];
            });
            if (Object.keys(blocksToSave).length > 0) {
                NarrativeStorage.saveMessageBlocks(String(messageId), blocksToSave);
            }
            
            const charsObj = {};
            if (Array.isArray(newData.characters)) {
                newData.characters.forEach(c => {
                    if (c.name) {
                        charsObj[c.name] = { 
                            outfit: c.outfit || "", 
                            state: c.state || "", 
                            thoughts: c.thoughts || "" 
                        };
                    }
                });
            }
            
            NarrativeStorage.saveSwipeData(swipeKey, {
                trackerValues: newData.trackers || {},
                characters: charsObj,
                infoBlocks: { ...blocksToSave, datetime: newData.datetime || "" }
            });
            
            applyJsonUpdate(newData, messageId, parseInt(swipeId));
            
            toastr.success('Данные сохранены и применены!');
            $(`.mes[mesid="${messageId}"] .nhud-json-edit`).css('opacity', '1');
            
        } catch (e) {
            toastr.error('Ошибка: ' + e.message);
        }
    }
}

// ─── Settings Panel Functions ──────────────────────────────────────────

export function updateSettingsPosition() {
    const chatEl = document.getElementById("chat");
    const panel = $("#nhud-settings-panel");
    if (chatEl && panel.is(":visible")) {
        if (window.innerWidth <= 768) {
            panel.css({ width: "100%" }); // На телефонах на весь экран
        } else {
            const rect = chatEl.getBoundingClientRect();
            // Левый сайдбар: ширина от левого края монитора ровно до левого края чата
            panel.css({ width: Math.max(250, rect.left) + "px" });
        }
    }
}

export function openSettingsPanel() {
    if (!$("#nhud-settings-panel").length) buildSettingsPanel();
    else {
        renderSettingsTrackers(); renderSettingsCharacterAccordion();
        renderSettingsProfileSelect(); renderSettingsPrompts(); renderPromptBlocks();
        renderParserSettings();
    }
    updateSettingsPosition();
    $("#nhud-settings-panel").css("display", "flex").hide().fadeIn(200);
}

export function closeSettingsPanel() {
    $("#nhud-settings-panel").fadeOut(200);
}

export function buildSettingsPanel() {
    if ($("#nhud-settings-panel").length) return;

    $("body").append(`
        <style>
            .nhud-tab-content { display: none !important; }
            .nhud-tab-content.active-tab { display: block !important; }
        </style>

        <div id="nhud-settings-panel" style="display:none; position:fixed; top:40px; bottom:0; left:0; z-index:9990; background:#151220; border-right:1px solid #3a1525; flex-direction:column; box-shadow:5px 0 25px rgba(0,0,0,0.8);">
            <div id="nhud-settings-header" style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, #2a101a, #1a0a10); padding:10px 15px; border-bottom:1px solid #4a1525;">
                <span style="font-weight:bold; color:#e0c0c0; text-shadow:0 2px 4px rgba(0,0,0,0.5);">⚔️ Настройки мода</span>
                <button id="nhud-settings-close" style="background:none; border:none; color:#d05070; font-size:18px; cursor:pointer; padding:0;">✕</button>
            </div>
            
            <div id="nhud-settings-body" style="display:flex; flex:1; overflow:hidden; flex-direction:column;">
                
                <div id="nhud-settings-tabs" style="display:flex; flex-wrap:wrap; background:#1a0a10; border-bottom:1px solid #3a1525; flex-shrink:0;">
                    <button class="nhud-tab active" data-tab="trackers" title="Трекеры" style="padding:8px; background:none; border:none; color:#e0c0c0; font-weight:bold; cursor:pointer;">📊 <span class="nhud-tab-text">Трекеры</span></button>
                    <button class="nhud-tab" data-tab="characters" title="Персонажи" style="padding:8px; background:none; border:none; color:#a08080; cursor:pointer;">👥 <span class="nhud-tab-text">Перс.</span></button>
                    <button class="nhud-tab" data-tab="prompts" title="Промты" style="padding:8px; background:none; border:none; color:#a08080; cursor:pointer;">📝 <span class="nhud-tab-text">Промты</span></button>
                    <button class="nhud-tab" data-tab="connection" title="Подключение" style="padding:8px; background:none; border:none; color:#a08080; cursor:pointer;">🔌 <span class="nhud-tab-text">Подкл.</span></button>
                    <button class="nhud-tab" data-tab="parser" title="Парсер JSON" style="padding:8px; background:none; border:none; color:#a08080; cursor:pointer;">🔍 <span class="nhud-tab-text">JSON</span></button>
                    <button class="nhud-tab" data-tab="storage" title="База Данных" style="padding:8px; background:none; border:none; color:#a08080; cursor:pointer;">🗄️ <span class="nhud-tab-text">База</span></button>
                </div>
                
                <div id="nhud-settings-content" style="flex:1; overflow-y:auto; padding:15px; background:rgba(0,0,0,0.2);">
                    
                    <div class="nhud-tab-content active-tab" data-tab="trackers">
                        <details open style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary style="font-weight:bold; color:var(--nhud-accent, #d05070); cursor:pointer; padding:5px; outline:none; user-select:none;">📉 Основные трекеры</summary>
                            <div class="nhud-section-hint" style="margin-top:10px;">Название · ID (для JSON) · Макс · Цвет</div>
                            <div id="nhud-settings-tracker-list"></div>
                            <button id="nhud-add-tracker" class="nhud-add-btn">+ Добавить трекер</button>
                        </details>
                        <div id="nhud-settings-rel-container-placeholder"></div>
                    </div>

                    <div class="nhud-tab-content" data-tab="characters">
                        <div class="nhud-section-hint">Нажми на чат чтобы раскрыть персонажей. Аватарки сохраняются глобально.</div>
                        <div id="nhud-settings-char-accordion"></div>
                    </div>

                    <div class="nhud-tab-content" data-tab="prompts">
                        <div class="nhud-field-group">
                            <label>Системный промт</label>
                            <textarea id="nhud-prompt-system" class="nhud-textarea" rows="3"></textarea>
                        </div>
                        <div class="nhud-field-group">
                            <label>Язык ответа</label>
                            <input id="nhud-prompt-language" class="nhud-input" type="text" placeholder="Russian / English" style="width:150px;" />
                        </div>
                        <div style="border-top:1px solid #3a1525;padding-top:12px;margin-top:4px;">
                            <div class="nhud-section-hint">Блоки промтов — каждый блок это отдельное поле в JSON ответе:</div>
                            <div id="nhud-prompt-blocks-list"></div>
                            <button id="nhud-add-prompt-block" class="nhud-add-btn">+ Добавить блок</button>
                        </div>
                    </div>

                    <div class="nhud-tab-content" data-tab="connection">
                        <div id="nhud-proxy-instruction-btn" style="background:rgba(224, 82, 82, 0.15); border:1px solid #e05252; border-radius:4px; padding:10px; margin-bottom:15px; cursor:pointer; text-align:center; transition:0.2s;">
                            <span style="color:#e05252; font-weight:bold; font-size:14px;">⚠️ ВАЖНО: ОЗНАКОМЬТЕСЬ С ИНСТРУКЦИЕЙ ПО ПРОКСИ!</span>
                            <div style="font-size:11px; color:#d0d0a0; margin-top:4px;">Нажмите здесь, чтобы узнать, как правильно настроить профили OpenRouter и сторонних API</div>
                        </div>
                        
                        <div class="nhud-field-group">
                            <label>Профиль подключения</label>
                            <select id="nhud-settings-profile-select" class="nhud-select"></select>
                        </div>
                        <div class="nhud-field-group nhud-checkbox-group">
                            <input id="nhud-auto-send" type="checkbox" />
                            <label for="nhud-auto-send" style="color:#d0b0b0;">Авто-отправка после каждого сообщения бота</label>
                        </div>
                        <div class="nhud-field-group nhud-checkbox-group">
                            <input id="nhud-send-with-main" type="checkbox" />
                            <label for="nhud-send-with-main" style="color:#d0b0b0;">Отправлять вместе с основным запросом (Вшивать в пресет)</label>
                        </div>
                        <div class="nhud-field-group nhud-checkbox-group" style="margin-top:8px; padding-top:8px; border-top:1px dashed #3a1525;">
                            <input id="nhud-light-mode" type="checkbox" />
                            <label for="nhud-light-mode" style="color:#e0d0a0;">
                                <strong>⚡ Лайт-режим (Фоновый парсинг)</strong><br>
                                <span style="font-size:0.8em; color:#8080a0; font-weight:normal;">Делает ДВА запроса: ИИ генерирует обычный художественный ответ, а затем мод делает второй, "тихий" запрос с урезанным контекстом и облегченным промптом, чтобы вытащить статы. Максимально экономит основной контекст чата!</span>
                            </label>
                        </div>
                        <div style="border-top:1px solid #3a1525;padding-top:12px;margin-top:8px;">
                            <div class="nhud-section-hint">Параметры запроса (Для "Авто-отправки" и ручного обновления):</div>
                            <div class="nhud-field-group">
                                <label>Сообщений контекста</label>
                                <input id="nhud-context-messages" class="nhud-input" type="number" min="1" max="50" style="width:80px;" />
                            </div>
                            <div class="nhud-field-group">
                                <label>Макс. токенов ответа</label>
                                <input id="nhud-max-tokens" class="nhud-input" type="number" min="100" max="8000" style="width:100px;" />
                            </div>
                            <div class="nhud-field-group">
                                <label>Температура (0.0 — 2.0)</label>
                                <input id="nhud-temperature" class="nhud-input" type="number" min="0" max="2" step="0.1" style="width:80px;" />
                            </div>
                        </div>
                    </div>

                    <div class="nhud-tab-content" data-tab="parser">
                        <div class="nhud-field-group nhud-checkbox-group">
                            <input id="nhud-parser-enabled" type="checkbox" />
                            <label for="nhud-parser-enabled">Включить автоматический парсинг JSON</label>
                        </div>
                        <div class="nhud-field-group">
                            <label>Открывающий тег</label>
                            <input id="nhud-parser-open-tag" class="nhud-input" type="text" placeholder="[NHUD]" />
                        </div>
                        <div class="nhud-field-group">
                            <label>Закрывающий тег</label>
                            <input id="nhud-parser-close-tag" class="nhud-input" type="text" placeholder="[/NHUD]" />
                        </div>
                        <div class="nhud-field-group nhud-checkbox-group">
                            <input id="nhud-parser-auto-remove" type="checkbox" />
                            <label for="nhud-parser-auto-remove">Автоматически удалять теги из сообщений</label>
                        </div>
                        <div class="nhud-field-group">
                            <button id="nhud-parser-test" class="nhud-add-btn">🔍 Тест парсера</button>
                        </div>
                    </div>

                    <div class="nhud-tab-content" data-tab="storage">
                        <div class="nhud-field-group">
                            <label>Статистика текущего чата</label>
                            <div id="nhud-storage-stats" class="nhud-stats-box" style="background:rgba(0,0,0,0.3); border:1px solid #3a1525; padding:10px; border-radius:4px;"><div>Загрузка...</div></div>
                        </div>
                        <div class="nhud-field-group">
                            <label>Экспорт / Импорт</label>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                <button id="nhud-export-btn" class="nhud-add-btn" style="background:#2a101a; border-color:#5a2035;">📤 Экспорт чата</button>
                                <label class="nhud-add-btn" style="cursor:pointer; background:#2a101a; border-color:#5a2035;">📥 Импорт<input id="nhud-import-file" type="file" accept=".json" style="display:none;" /></label>
                            </div>
                        </div>
                        <div class="nhud-field-group" style="margin-top:16px;border-top:1px dashed #3a1525;padding-top:12px;">
                            <label>Очистка</label>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                <button id="nhud-smart-clean-btn" class="nhud-send-btn" style="padding:6px 12px; border:1px solid #5040a0; background:rgba(80,60,140,0.3);">🧠 Умная очистка</button>
                                <button id="nhud-clear-chat-btn" class="nhud-s-delete" style="padding:6px 12px; border:1px solid #802030;">🗑️ Текущий чат</button>
                                <button id="nhud-clear-all-btn" class="nhud-s-delete" style="padding:6px 12px; border:1px solid #802030; background:#401015;">⚠️ Все чаты</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `);

    // --- БРОНЕБОЙНАЯ ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК ---
    $("#nhud-settings-tabs").off("click").on("click", ".nhud-tab", function() {
        const tab = $(this).data("tab");
        
        // Красим кнопки
        $(".nhud-tab").css({ color: "var(--nhud-text-muted, #a08080)", fontWeight: "normal" });
        $(this).css({ color: "var(--nhud-text-main, #e0c0c0)", fontWeight: "bold" });
        
        // Жестко отбираем класс активности у всех вкладок (они мгновенно исчезают)
        $(".nhud-tab-content").removeClass("active-tab");
        
        // Выдаем класс активности только нужной вкладке
        $(`.nhud-tab-content[data-tab="${tab}"]`).addClass("active-tab");
        
        if (tab === "storage") renderStorageStats();
        if (tab === "characters") renderSettingsCharacterAccordion();
        if (tab === "parser") renderParserSettings();
    });

    $("#nhud-settings-close").on("click", closeSettingsPanel);

    $("#nhud-settings-profile-select").on("change", function() {
        const settings = getSettings();
        const val = $(this).val();
        settings.activeProfile = val === "__quiet__" ? null : val;
        settings.useSTProfile = val !== "__quiet__";
        saveSettingsDebounced(); renderProfileSelect();
    });

    $("#nhud-prompt-system").on("input",   e => { getSettings().prompts.system   = e.target.value; saveSettingsDebounced(); });
    $("#nhud-prompt-language").on("input", e => { getSettings().prompts.language = e.target.value; saveSettingsDebounced(); });

    $("#nhud-auto-send").on("change",      e => { getSettings().autoSend = e.target.checked; saveSettingsDebounced(); });
    $("#nhud-send-with-main").on("change", e => { getSettings().requestSettings.sendWithMain = e.target.checked; saveSettingsDebounced(); });
    $("#nhud-light-mode").on("change",     e => { 
        const settings = getSettings();
        const isLight = e.target.checked;
        settings.requestSettings.lightMode = isLight;
        if (isLight && !settings.useSTProfile) {
            const profiles = getSTProfiles();
            if (profiles.length > 0) {
                settings.activeProfile = profiles[0].name;
                settings.useSTProfile = true;
                toastr.info(`Профиль изменен на ${profiles[0].name}`, "⚡ Лайт-режим");
            } else {
                toastr.warning("Для Лайт-режима требуется создать API профиль!", "Внимание");
            }
        }
        saveSettingsDebounced(); 
        renderProfileSelect(); 
    });
    
    $("#nhud-context-messages").on("input",e => { getSettings().requestSettings.contextMessages = parseInt(e.target.value)||10; saveSettingsDebounced(); });
    $("#nhud-max-tokens").on("input",      e => { getSettings().requestSettings.maxTokens = parseInt(e.target.value)||2000; saveSettingsDebounced(); });
    $("#nhud-temperature").on("input",     e => { getSettings().requestSettings.temperature = parseFloat(e.target.value)||0.7; saveSettingsDebounced(); });

    $("#nhud-add-tracker").off("click").on("click", () => {
        const trackers = getChatTrackers();
        trackers.push({ id: `tracker_${Date.now()}`, label: "Новый", max: 100, color: "#52b8e0" });
        saveSettingsDebounced(); renderSettingsTrackers(); renderTrackers();
    });

    $("#nhud-add-prompt-block").on("click", () => {
        const s = getSettings();
        const id = `block_${Date.now()}`;
        s.promptBlocks.push({ id, label: "Новый блок", prompt: "", enabled: true });
        saveSettingsDebounced(); renderPromptBlocks(); renderInfoBlockButtons();
    });

    $("#nhud-parser-enabled").on("change", e => { getSettings().jsonParser.enabled = e.target.checked; saveSettingsDebounced(); });
    $("#nhud-parser-open-tag").on("input", e => { getSettings().jsonParser.openTag = e.target.value; saveSettingsDebounced(); });
    $("#nhud-parser-close-tag").on("input", e => { getSettings().jsonParser.closeTag = e.target.value; saveSettingsDebounced(); });
    $("#nhud-parser-auto-remove").on("change", e => { getSettings().jsonParser.autoRemoveTags = e.target.checked; saveSettingsDebounced(); });
    
    $("#nhud-parser-test").on("click", () => {
        const testText = prompt("Введите текст с JSON для теста:", "[NHUD]\n{\n  \"trackers\": {\n    \"health\": 85\n  }\n}\n[/NHUD]");
        if (!testText) return;
        const settings = getSettings();
        const jsonData = parseJsonFromMessage(testText, settings.jsonParser.openTag, settings.jsonParser.closeTag);
        if (jsonData) alert("✅ JSON найден:\n" + JSON.stringify(jsonData, null, 2));
        else alert("❌ JSON не найден или невалидный");
    });

    $("#nhud-export-btn").on("click", () => {
        const data = NarrativeStorage.exportChatBlocks();
        if (!data) { toastr.warning("Нет данных для экспорта"); return; }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `narrative-hud-${data.chatId || 'chat'}.json`; a.click();
        URL.revokeObjectURL(url); toastr.success("Экспорт завершён");
    });

    $("#nhud-import-file").on("change", function() {
        const file = this.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                NarrativeStorage.importChatBlocks(data.chatId || NarrativeStorage.getCurrentChatId(), data);
                toastr.success("Импорт завершён"); updateHistoryButtons(); renderStorageStats();
            } catch(err) { toastr.error("Ошибка импорта: " + err.message); }
        };
        reader.readAsText(file);
    });

    $("#nhud-smart-clean-btn").on("click", () => {
        if (typeof openSmartCleaner === 'function') openSmartCleaner();
    });

    $("#nhud-clear-chat-btn").on("click", () => {
        if (!confirm("Очистить все блоки в текущем чате?")) return;
        NarrativeStorage.deleteCurrentChat(); updateHistoryButtons(); renderStorageStats();
        toastr.success("Данные текущего чата очищены");
    });

    $("#nhud-clear-all-btn").on("click", () => {
        if (!confirm("⚠️ Очистить ВСЕ данные всех чатов?")) return;
        NarrativeStorage.purgeAllData(); updateHistoryButtons(); renderStorageStats();
        toastr.success("Все данные очищены");
    }); // <--- ВОТ ЭТИ СКОБКИ ПОТЕРЯЛИСЬ!

    // ОБРАБОТЧИК КЛИКА ПО ИНСТРУКЦИИ ПРОКСИ (СВОЕ КАСТОМНОЕ ОКНО)
    $("#nhud-proxy-instruction-btn").hover(
        function() { $(this).css("background", "rgba(224, 82, 82, 0.25)"); },
        function() { $(this).css("background", "rgba(224, 82, 82, 0.15)"); }
    ).on("click", () => {
        // Удаляем старое окно, если оно вдруг осталось
        $("#nhud-custom-proxy-modal").remove();

        // Верстка нашего независимого всплывающего окна
        const html = `
            <div id="nhud-custom-proxy-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:15px; box-sizing:border-box; backdrop-filter:blur(3px);">
                <div style="background:#151220; border:1px solid #e05252; border-radius:8px; padding:20px; max-width:500px; width:100%; max-height:85vh; overflow-y:auto; position:relative; box-shadow:0 10px 40px rgba(0,0,0,0.8);">
                    <button id="nhud-close-proxy-modal" style="position:absolute; top:10px; right:15px; background:none; border:none; color:#a08080; font-size:22px; cursor:pointer; transition:0.2s;" onmouseover="this.style.color='#e05252'" onmouseout="this.style.color='#a08080'">✕</button>
                    
                    <h3 style="color:#e05252; margin-top:0; font-size:1.2em; padding-right:20px;">Настройка сторонних API</h3>
                    <p style="font-size:0.95em; color:var(--nhud-text-main);">Из-за особенностей работы Таверны, для корректной маршрутизации запросов расширения необходимо создать отдельный профиль:</p>
                    
                    <ol style="padding-left:20px; color:#c0b0d8; font-size:0.95em; line-height:1.6;">
                        <li style="margin-bottom:8px;">В главном меню API выберите <b>Chat Completion -> OpenAI</b></li>
                        <li style="margin-bottom:8px;">Разверните вкладку <b>Прокси</b>. Назовите пресет, вставьте ссылку на прокси (обязательно с <code>/v1</code> на конце) и ваш ключ.</li>
                        <li style="margin-bottom:8px; color:#52e0a3; font-weight:bold;">ОБЯЗАТЕЛЬНО: Нажмите иконку дискеты (💾) для СОХРАНЕНИЯ ПРЕСЕТА ПРОКСИ!</li>
                        <li style="margin-bottom:8px;">Сверните вкладку Прокси.</li>
                        <li style="margin-bottom:8px;">Поставьте галочку <b>«Показать "сторонние" модели (предоставленные API)»</b>.</li>
                        <li style="margin-bottom:8px;">В списке моделей пролистайте вниз и выберите нужную модель вашего прокси.</li>
                        <li style="margin-bottom:8px;">Сохраните сам профиль (кнопка сверху).</li>
                    </ol>
                    
                    <p style="color:#52a8e0; font-weight:bold; text-align:center; margin-bottom:0; font-size:0.95em; background:rgba(82,168,224,0.1); padding:10px; border-radius:4px;">Вы великолепны! После этого пресет можно использовать в расширении!</p>
                </div>
            </div>
        `;
        
        // Вставляем окно прямо поверх всего сайта
        $("body").append(html);
        
        // Обработчик закрытия по крестику
        $("#nhud-close-proxy-modal").on("click", () => {
            $("#nhud-custom-proxy-modal").fadeOut(200, function() { $(this).remove(); });
        });
        
        // Обработчик закрытия по клику на темный фон вокруг окна
        $("#nhud-custom-proxy-modal").on("click", function(e) {
            if (e.target === this) {
                $(this).fadeOut(200, function() { $(this).remove(); });
            }
        });
    });

    renderSettingsTrackers();
    renderSettingsCharacterAccordion();
    renderSettingsProfileSelect();
    renderSettingsPrompts();
    renderPromptBlocks();
    renderParserSettings();
    
    const chatObserver = new ResizeObserver(() => updateSettingsPosition());
    const chatEl = document.getElementById("chat");
    if (chatEl) chatObserver.observe(chatEl);
    
    updateSettingsPosition();
}

export function renderParserSettings() {
    const settings = getSettings();
    $("#nhud-parser-enabled").prop("checked", settings.jsonParser.enabled);
    $("#nhud-parser-open-tag").val(settings.jsonParser.openTag);
    $("#nhud-parser-close-tag").val(settings.jsonParser.closeTag);
    $("#nhud-parser-auto-remove").prop("checked", settings.jsonParser.autoRemoveTags);
}

export function renderSettingsCharacterAccordion() {
    const container = $("#nhud-settings-char-accordion");
    container.empty();

    const settings = extension_settings[extensionName] || {};
    const chatData = settings.chatData || {};
    const userName = getUserName();

    if (Object.keys(chatData).length === 0) {
        container.append('<div class="nhud-hint">Нет данных по чатам.</div>');
        return;
    }

    Object.entries(chatData).forEach(([chatId, data]) => {
        const chars = data.liveData?.characters || {};
        const charNames = Object.keys(chars).filter(name => 
            name.toLowerCase() !== userName.toLowerCase() &&
            !name.toLowerCase().includes('system')
        );
        if (!charNames.length) return;

        const shortId = chatId.length > 40 ? chatId.substring(0, 40) + '…' : chatId;
        const accordion = $(`
            <div class="nhud-accordion">
                <div class="nhud-accordion-header" style="display:flex; align-items:center; gap:8px;">
                    <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${chatId}">💬 ${shortId}</span>
                    <span class="nhud-accordion-count">${charNames.length} перс.</span>
                    <button class="nhud-rename-chat-btn" data-chat="${chatId}" title="Перепривязать к новому имени чата" style="padding:2px 6px; background:rgba(80,140,80,0.3); border:1px solid #286a28; border-radius:4px; color:#60c060; cursor:pointer;">✏️</button>
                    <button class="nhud-s-delete nhud-delete-chat-btn" data-chat="${chatId}" title="Удалить данные чата" style="padding:2px 6px;">🗑️</button>
                    <span class="nhud-accordion-arrow">▼</span>
                </div>
                <div class="nhud-accordion-body" style="display:none;"></div>
            </div>
        `);

        accordion.find('.nhud-delete-chat-btn').on('click', function(e) {
            e.stopPropagation();
            if (confirm('Точно удалить все данные мода для этого чата?')) {
                NarrativeStorage.deleteChat($(this).data('chat'));
                renderSettingsCharacterAccordion();
            }
        });

        accordion.find('.nhud-rename-chat-btn').on('click', function(e) {
            e.stopPropagation();
            const oldId = $(this).data('chat');
            const newId = prompt('Введи новое название чата (как оно теперь называется в ST), чтобы перенести данные:', oldId);
            
            if (newId && newId !== oldId) {
                if (settings.chatData[newId]) {
                    alert('Ошибка: Чат с таким именем уже существует в базе расширения!');
                    return;
                }
                settings.chatData[newId] = settings.chatData[oldId];
                delete settings.chatData[oldId];
                
                extension_settings[extensionName] = settings;
                saveSettingsDebounced();
                renderSettingsCharacterAccordion();
                toastr.success('Данные успешно перепривязаны!');
            }
        });

        const body = accordion.find('.nhud-accordion-body');

        charNames.forEach(name => {
            body.append(buildCharEditBlock(name, chars[name], settings, chatId, data));
        });

        const addRow = $(`
            <div style="padding:8px;">
                <div style="display:flex;gap:6px;">
                    <input class="nhud-acc-add-name nhud-input" type="text" placeholder="Имя нового персонажа..." style="flex:1;" />
                    <button class="nhud-add-btn nhud-acc-add-btn" style="margin:0;white-space:nowrap;">+ Добавить</button>
                </div>
            </div>
        `);

        addRow.find('.nhud-acc-add-btn').on('click', function() {
            const name = addRow.find('.nhud-acc-add-name').val().trim();
            if (!name) return;
            if (!data.liveData) data.liveData = { trackerValues: {}, characters: {} };
            if (!data.liveData.characters) data.liveData.characters = {};
            data.liveData.characters[name] = { outfit: "", state: "", thoughts: "" };
            extension_settings[extensionName] = settings;
            saveSettingsDebounced();
            renderSettingsCharacterAccordion();
            if (chatId === NarrativeStorage.getCurrentChatId()) {
                getSettings().liveData.characters[name] = { outfit: "", state: "", thoughts: "" };
                renderCharacters();
            }
        });

        body.append(addRow);

        if (data.liveData?.ignoredCharacters && data.liveData.ignoredCharacters.length > 0) {
            const unignoreRow = $(`
                <div style="padding:8px; border-top:1px dashed #3a1525; margin-top:8px;">
                    <div style="font-size:0.7em; color:#a08080; margin-bottom:6px;">В игноре (нажми, чтобы вернуть):</div>
                    <div class="nhud-ignored-list" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
                </div>
            `);
            
            const ignoredContainer = unignoreRow.find('.nhud-ignored-list');
            
            // Перебираем каждого призрака и создаем для него отдельную кнопку
            data.liveData.ignoredCharacters.forEach(ignoredName => {
                const badge = $(`
                    <button class="nhud-unignore-single-btn" title="Вернуть ${ignoredName} в HUD" style="background:rgba(82, 168, 224, 0.15); border:1px solid #3a5a80; color:#80b0e0; border-radius:4px; padding:3px 8px; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; transition:0.2s;" onmouseover="this.style.background='rgba(82, 168, 224, 0.3)'" onmouseout="this.style.background='rgba(82, 168, 224, 0.15)'">
                        👻 ${ignoredName}
                    </button>
                `);
                
                // Вешаем клик на конкретного персонажа
                badge.on('click', function() {
                    // 1. Вычищаем его из массива игнора
                    data.liveData.ignoredCharacters = data.liveData.ignoredCharacters.filter(n => n !== ignoredName);
                    
                    // 2. Создаем пустую болванку, чтобы он МОМЕНТАЛЬНО появился в интерфейсе
                    if (!data.liveData.characters) data.liveData.characters = {};
                    data.liveData.characters[ignoredName] = { outfit: "", state: "", thoughts: "" };
                    
                    extension_settings[extensionName] = settings;
                    saveSettingsDebounced();
                    
                    // 3. Обновляем глобальный стейт, если это текущий чат
                    if (chatId === NarrativeStorage.getCurrentChatId()) {
                        getSettings().liveData.ignoredCharacters = getSettings().liveData.ignoredCharacters.filter(n => n !== ignoredName);
                        getSettings().liveData.characters[ignoredName] = { outfit: "", state: "", thoughts: "" };
                        
                        // Перерисовываем HUD
                        renderCharacters();
                        if (typeof renderRelationships === 'function') renderRelationships();
                        if (typeof renderSettingsTrackers === 'function') renderSettingsTrackers();
                    }
                    
                    // Перерисовываем гармошку настроек
                    renderSettingsCharacterAccordion();
                    toastr.success(`${ignoredName} возвращен из призраков!`);
                });
                
                ignoredContainer.append(badge);
            });

            body.append(unignoreRow);
        }

        accordion.find('.nhud-accordion-header').on('click', function() {
            body.toggle();
            accordion.find('.nhud-accordion-arrow').text(body.is(':visible') ? '▲' : '▼');
        });

        container.append(accordion);
    });
}

export function buildCharEditBlock(name, liveData, settings, chatId, data) {
    const globalChar = (settings.characters || []).find(
        c => c.name?.toLowerCase() === name.toLowerCase()
    ) || {};

    const block = $(`
        <div class="nhud-accordion-char-edit">
            <div class="nhud-accordion-char-top">
                <div class="nhud-char-avatar-wrap" style="width:40px;height:40px;flex-shrink:0;">
                    <img src="${globalChar.avatar || ''}"
                         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                         style="${globalChar.avatar ? '' : 'display:none;'}width:100%;height:100%;object-fit:cover;border-radius:4px;"/>
                    <div style="${globalChar.avatar ? 'display:none;' : 'display:flex;'}width:100%;height:100%;background:#1a1628;border-radius:4px;align-items:center;justify-content:center;color:#6060a0;font-weight:bold;">
                        ${name[0].toUpperCase()}
                    </div>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.85em;color:#c0b0d8;font-weight:bold;margin-bottom:4px;">${name}</div>
                    ${liveData?.outfit ? `<div style="font-size:0.7em;color:#7070a0;">👗 ${liveData.outfit.substring(0,60)}${liveData.outfit.length>60?'…':''}</div>` : ''}
                    ${liveData?.state  ? `<div style="font-size:0.7em;color:#909090;">${liveData.state.substring(0,70)}${liveData.state.length>70?'…':''}</div>` : ''}
                </div>
                <button class="nhud-acc-ghost-char" title="Превратить в призрака 👻 (Добавить в Игнор)" style="flex-shrink:0; margin-left:4px; background:none; border:none; cursor:pointer; font-size:14px; opacity:0.7; transition:0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">👻</button>
                <button class="nhud-acc-delete-char nhud-s-delete" title="Просто удалить из текущего кэша" style="flex-shrink:0;margin-left:4px;">✕</button>
            </div>
            <div class="nhud-accordion-char-avatar-edit">
                <label style="font-size:0.72em;color:#505070;text-transform:uppercase;letter-spacing:0.05em;">Аватар</label>
                <div class="nhud-avatar-row" style="margin-top:4px;">
                    <div class="nhud-avatar-btns">
                        <input class="nhud-acc-avatar-url nhud-input" type="text"
                               placeholder="URL..."
                               value="${globalChar.avatar && !globalChar.avatar.startsWith('data:') ? globalChar.avatar : ''}" />
                        <label class="nhud-file-btn" style="margin-top:4px;">
                            📁 С компа
                            <input class="nhud-acc-avatar-file" type="file" accept="image/*" style="display:none;" />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `);

    // ЛОГИКА ОБЫЧНОГО УДАЛЕНИЯ (Без игнора)
    block.find('.nhud-acc-delete-char').on('click', () => {
        if (!confirm(`Просто удалить ${name} из чата? (Он снова появится, если ИИ его упомянет)`)) return;
        delete data.liveData.characters[name];
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
        if (chatId === NarrativeStorage.getCurrentChatId()) {
            delete getSettings().liveData.characters[name];
            renderCharacters();
        }
        renderSettingsCharacterAccordion();
    });

    // ЛОГИКА ПРИЗРАКА (Игнор-лист)
    block.find('.nhud-acc-ghost-char').on('click', () => {
        if (!confirm(`Превратить ${name} в призрака 👻?\nМод навсегда перестанет замечать этого персонажа в этом чате.`)) return;
        
        delete data.liveData.characters[name];
        
        if (!data.liveData.ignoredCharacters) data.liveData.ignoredCharacters = [];
        if (!data.liveData.ignoredCharacters.includes(name)) data.liveData.ignoredCharacters.push(name);
        
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
        
        if (chatId === NarrativeStorage.getCurrentChatId()) {
            delete getSettings().liveData.characters[name];
            if (!getSettings().liveData.ignoredCharacters) getSettings().liveData.ignoredCharacters = [];
            if (!getSettings().liveData.ignoredCharacters.includes(name)) getSettings().liveData.ignoredCharacters.push(name);
            renderCharacters();
            if (typeof renderRelationships === 'function') renderRelationships();
        }
        renderSettingsCharacterAccordion();
    });

    block.find('.nhud-acc-avatar-url').on('input', function() {
        const url = $(this).val();
        updateGlobalAvatar(name, url);
        block.find('img').attr('src', url).show();
        block.find('div[style*="display:flex"]').hide();
        renderCharacters();
    });

    block.find('.nhud-acc-avatar-file').on('change', function() {
        const file = this.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            updateGlobalAvatar(name, base64);
            block.find('.nhud-acc-avatar-url').val('');
            block.find('img').attr('src', base64).show();
            block.find('div[style*="display:flex"]').hide();
            renderCharacters();
        };
        reader.readAsDataURL(file);
    });

    return block;
}

export function renderPromptBlocks() {
    const settings = getSettings();
    const list = $("#nhud-prompt-blocks-list");
    list.empty();

    settings.promptBlocks.forEach((block, idx) => {
        const row = $(`
            <div class="nhud-prompt-block-row">
                <div class="nhud-prompt-block-header">
                    <input class="nhud-pb-enabled" type="checkbox" ${block.enabled ? 'checked' : ''} title="Включить блок" />
                    <input class="nhud-pb-label nhud-input" type="text" placeholder="Название" value="${block.label}" style="flex:1;" />
                    <input class="nhud-pb-id nhud-input" type="text" placeholder="id (для JSON)" value="${block.id}" style="width:110px;" title="Ключ в JSON ответе" />
                    <button class="nhud-s-delete nhud-pb-delete">✕</button>
                </div>
                <textarea class="nhud-pb-prompt nhud-textarea" rows="2" placeholder="Промт для этого блока...">${block.prompt}</textarea>
            </div>
        `);

        row.find(".nhud-pb-enabled").on("change", e => {
            settings.promptBlocks[idx].enabled = e.target.checked;
            saveSettingsDebounced(); renderInfoBlockButtons();
        });
        row.find(".nhud-pb-label").on("input", e => {
            settings.promptBlocks[idx].label = e.target.value;
            saveSettingsDebounced(); renderInfoBlockButtons();
        });
        row.find(".nhud-pb-id").on("input", e => {
            settings.promptBlocks[idx].id = e.target.value;
            saveSettingsDebounced();
        });
        row.find(".nhud-pb-prompt").on("input", e => {
            settings.promptBlocks[idx].prompt = e.target.value;
            saveSettingsDebounced();
        });
        row.find(".nhud-pb-delete").on("click", () => {
            settings.promptBlocks.splice(idx, 1);
            saveSettingsDebounced(); renderPromptBlocks(); renderInfoBlockButtons();
        });

        list.append(row);
    });
}

export function renderStorageStats() {
    const stats = NarrativeStorage.getChatStats();
    const usedTypes = NarrativeStorage.getUsedBlockTypes();
    const allChats = Object.keys(extension_settings[extensionName]?.chatData || {}).length;
    const chatId = NarrativeStorage.getCurrentChatId();
    
    $("#nhud-storage-stats").html(`
        <div class="nhud-stat-row"><span>Чат:</span><span style="font-size:0.75em;word-break:break-all;">${chatId || '—'}</span></div>
        <div class="nhud-stat-row"><span>Сообщений с блоками:</span><span>${stats.messagesWithBlocks}</span></div>
        <div class="nhud-stat-row"><span>Размер данных:</span><span>${stats.estimatedSizeKB} KB</span></div>
        <div class="nhud-stat-row"><span>Типы блоков:</span><span>${usedTypes.join(', ') || '—'}</span></div>
        <div class="nhud-stat-row"><span>Всего чатов в базе:</span><span>${allChats}</span></div>
        ${stats.exists ? `<div class="nhud-stat-row"><span>Последний доступ:</span><span>${stats.lastAccessed}</span></div>` : ''}
    `);
}

// ─── Topbar Icon ─────────────────────────────────────────────────────────

export function buildTopbarIcon() {
    if ($("#nhud-topbar-btn").length) return;
    const btn = $(`<div id="nhud-topbar-btn" class="drawer-icon fa-solid fa-scroll interactable closedIcon" title="Narrative HUD" style="font-size:1.4em;padding:4px 6px;cursor:pointer;"></div>`);
    
    // Теперь кнопка работает как переключатель для правой панели
    btn.on("click", () => {
        const sidebar = $("#narrative-hud-sidebar");
        if (sidebar.is(":visible")) {
            sidebar.fadeOut(200);
        } else {
            sidebar.fadeIn(200);
        }
    });
    
    $("#extensions-settings-button").before(btn);
}

// ─── Sidebar ─────────────────────────────────────────────────────────────

export function buildSidebar() {
    if ($("#narrative-hud-sidebar").length) return;

    const settings = getSettings();
    if (!settings.ui) settings.ui = { widgetPos: { left: "20px", top: "80px" }, hudMode: "screen", hudWidth: 300 };
    const w = settings.ui.hudWidth || 300;

    $("body").append(`
        <div id="narrative-hud-sidebar" style="position:fixed; top:40px; bottom:0; right:0; width:${w}px; z-index:9990; background:#151220; border-left:1px solid #3a1525; display:flex; flex-direction:column; box-shadow:-5px 0 25px rgba(0,0,0,0.8); padding-top:30px;">
            
            <button id="nhud-mode-toggle" style="position:absolute; top:8px; left:8px; background:none; border:none; color:#d05070; font-size:16px; font-weight:bold; cursor:pointer; padding:0; z-index:100; transition:0.2s;"></button>
            
            <div style="position:absolute; top:8px; right:8px; display:flex; gap:8px; z-index:100;">
                <button id="nhud-toggle-widget-btn" title="Скрыть/Показать кубик" style="background:none; border:none; color:#a08080; cursor:pointer; font-size:14px;">🧊</button>
                <button id="nhud-manual-send" title="Обновить данные" style="background:none; border:none; color:#a08080; cursor:pointer; font-size:14px;">▶</button>
                <button id="nhud-open-settings" title="Настройки" style="background:none; border:none; color:#a08080; cursor:pointer; font-size:14px;">⚙️</button>
                <button id="nhud-sidebar-close" title="Закрыть панель" style="background:none; border:none; color:#d05070; cursor:pointer; font-size:16px; font-weight:bold; margin-left:8px;">✕</button>
            </div>
            
            <div id="nhud-api-status" style="padding:0 10px; font-size:11px; color:#a08080; text-align:center;"></div>
            <div id="nhud-datetime-bar" style="padding:5px 10px; text-align:center; font-weight:bold; color:#e0b0b0; background:linear-gradient(90deg, transparent, rgba(120,20,40,0.3), transparent);"></div>
            
            <div class="nhud-divider" style="height:1px; background:#3a1525; margin:5px 0;"></div>
            <div id="nhud-trackers-section" style="padding:0 10px; max-height:30vh; overflow-y:auto;"><div id="nhud-trackers-list"></div></div>
            
            <div class="nhud-divider" style="height:1px; background:#3a1525; margin:5px 0;"></div>
            <div id="nhud-infoblock-buttons" style="padding:0 10px; display:flex; flex-wrap:wrap; gap:4px; justify-content:center;"></div>
            
            <div class="nhud-divider" style="height:1px; background:#3a1525; margin:5px 0;"></div>
            <div id="nhud-characters-section" style="padding:0 10px 10px 10px; flex:1; overflow-y:auto;"><div id="nhud-characters-list" style="display:flex; flex-direction:column; gap:8px;"></div></div>
            
            <div id="nhud-resize-handle" style="position:absolute; left:-4px; top:0; bottom:0; width:8px; cursor:ew-resize; z-index:10; background:transparent;"></div>
        </div>
        
        <div id="nhud-infoblock-popup" style="display:none; position:fixed; top:${settings.design?.promptPos?.top || '100px'}; left:${settings.design?.promptPos?.left || '100px'}; z-index:9995; background:var(--nhud-prompt-bg); border:1px solid var(--nhud-border); border-radius:8px; box-shadow:0 5px 20px rgba(0,0,0,0.9); width:var(--nhud-prompt-width); resize:both; overflow:hidden;">
            <div id="nhud-infoblock-popup-header" style="cursor:grab; display:flex; justify-content:space-between; padding:8px 10px; background:var(--nhud-prompt-header); border-bottom:var(--nhud-prompt-border); font-weight:bold; color:var(--nhud-text-main); border-radius:8px 8px 0 0;">
                <span id="nhud-infoblock-popup-title"></span>
                <button id="nhud-infoblock-popup-close" style="background:none; border:none; color:var(--nhud-accent); cursor:pointer;">✕</button>
            </div>
            <div id="nhud-infoblock-popup-content" style="padding:10px; color:var(--nhud-prompt-text-color); font-size:var(--nhud-prompt-font-size); max-height:50vh; overflow-y:auto;"></div>
        </div>
    `);

    // --- ЛОГИКА ПЕРЕКЛЮЧЕНИЯ РЕЖИМОВ ---
    function updateHudPosition() {
        const mode = settings.ui.hudMode || "screen";
        const sidebar = $("#narrative-hud-sidebar");
        const handle = $("#nhud-resize-handle");
        
        if (mode === "screen") {
            const w = settings.ui.hudWidth || 300;
            sidebar.css({ width: w + "px" });
            handle.show(); // Возвращаем ползунок
            $("#nhud-mode-toggle").html("◧").attr("title", "Ручная ширина (Нажми чтобы заполнить пустоту до чата)");
        } else if (mode === "chat") {
            const chatEl = document.getElementById("chat");
            if (chatEl) {
                const rect = chatEl.getBoundingClientRect();
                // Ширина = расстояние от правого края экрана до правого края чата
                const gapWidth = window.innerWidth - rect.right;
                sidebar.css({ width: Math.max(220, gapWidth) + "px" });
            }
            handle.hide(); // Прячем ползунок (ширина автоматическая)
            $("#nhud-mode-toggle").html("◨").attr("title", "Заполнение до чата (Нажми для ручной ширины)");
        }
    }

    $("#nhud-mode-toggle").on("click", () => {
        settings.ui.hudMode = settings.ui.hudMode === "screen" ? "chat" : "screen";
        saveSettingsDebounced();
        updateHudPosition();
    });

    // Наблюдаем за чатом
    const chatObserver = new ResizeObserver(() => {
        if (getSettings().ui?.hudMode === "chat") updateHudPosition();
    });
    const chatEl = document.getElementById("chat");
    if (chatEl) chatObserver.observe(chatEl);
    
    updateHudPosition();

    // --- ЛОГИКА ИЗМЕНЕНИЯ ШИРИНЫ ---
    let isResizing = false, startX, startWidth;
    $("#nhud-resize-handle").on("mousedown", function(e) {
        if (getSettings().ui?.hudMode === "chat") return; // В авто-режиме тянуть нельзя
        isResizing = true; startX = e.clientX;
        startWidth = $("#narrative-hud-sidebar").width();
        $("body").css("user-select", "none"); e.preventDefault();
    });
    
    $(document).on("mousemove.nhudresize", function(e) {
        if (!isResizing) return;
        // Тянем влево (уменьшаем X) -> ширина увеличивается
        const newWidth = startWidth + (startX - e.clientX);
        const finalWidth = Math.min(Math.max(220, newWidth), window.innerWidth / 1.5);
        $("#narrative-hud-sidebar").css("width", finalWidth + "px");
    });
    
    $(document).on("mouseup.nhudresize", () => {
        if (isResizing) { 
            isResizing = false; $("body").css("user-select", ""); 
            getSettings().ui.hudWidth = $("#narrative-hud-sidebar").width();
            saveSettingsDebounced();
            makeWindowDraggable("nhud-infoblock-popup", "nhud-infoblock-popup-header");
        }
    });

    // --- ЛОГИКА ИНФОБЛОКОВ ---
    $("#nhud-infoblock-buttons").on("click", ".nhud-info-btn", function() {
        const block = $(this).data("block");
        const live = getLive();
        const label = $(this).text();
        const popup = $("#nhud-infoblock-popup");
        const isSame = popup.is(":visible") && popup.attr("data-current") === block;
        
        const sidebarRect = $("#narrative-hud-sidebar")[0].getBoundingClientRect();
        popup.css({ top: sidebarRect.top + 50 + "px", left: (sidebarRect.left - 310) + "px" });

        if (isSame) {
            // Плавно скрываем
            popup.fadeOut(150).removeAttr("data-current"); $(this).removeClass("active");
        } else {
            $(".nhud-info-btn").removeClass("active"); $(this).addClass("active");
            $("#nhud-infoblock-popup-title").text(label);
            
            // ФИКС: Пропускаем текст через наш красивый форматтер
            $("#nhud-infoblock-popup-content").html(formatPopupText(live.infoBlocks[block]));
            
            // Плавно показываем
            popup.attr("data-current", block).fadeIn(150);
        }
    });

    $("#nhud-infoblock-popup-close").on("click", () => { $("#nhud-infoblock-popup").hide(); $(".nhud-info-btn").removeClass("active"); });

        $("#nhud-profile-select").on("change", function() {
        const settings = getSettings();
        const val = $(this).val();
        settings.activeProfile = val === "__quiet__" ? null : val;
        settings.useSTProfile = val !== "__quiet__";
        saveSettingsDebounced(); renderSettingsProfileSelect();
    });

    $("#nhud-manual-send").on("click", () => sendToAPI(true));
    $("#nhud-open-settings").on("click", openSettingsPanel);
    $("#nhud-toggle-widget-btn").on("click", () => $("#nhud-widget").fadeToggle(200));
    $("#nhud-sidebar-close").on("click", () => $("#narrative-hud-sidebar").fadeOut(200));

    renderTrackers(); renderCharacters(); renderInfoBlocks();
    renderInfoBlockButtons(); renderProfileSelect();
    makeWindowDraggable("nhud-infoblock-popup", "nhud-infoblock-popup-header");
}

// ─── Info Blocks ────────────────────────────────────────────────────────

export function renderInfoBlockButtons() {
    const settings = getSettings();
    const container = $("#nhud-infoblock-buttons");
    container.empty();
    settings.promptBlocks.filter(b => b.enabled).forEach(block => {
        container.append(`<button class="nhud-info-btn" data-block="${block.id}">${block.label}</button>`);
    });
    
    const live = getLive();
    const hasNewBlocks = settings.promptBlocks.some(
        b => b.enabled && live.infoBlocks[b.id] === undefined
    );
    if (hasNewBlocks) {
        showStatus("⚠️ Новые блоки — нажми ▶", "info");
    }
}

export function renderProfileSelect() {
    const settings = getSettings();
    const sel = $("#nhud-profile-select");
    sel.empty();
    
    const isLight = settings.requestSettings?.lightMode;
    
    if (isLight) {
        sel.append(`<option value="__quiet__" disabled>❌ ST (Блок)</option>`);
    } else {
        sel.append(`<option value="__quiet__" ${!settings.useSTProfile ? 'selected' : ''}>🔄 ST</option>`);
    }
    
    getSTProfiles().forEach(p => {
        const selected = settings.useSTProfile && settings.activeProfile === p.name ? 'selected' : '';
        const shortName = p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name;
        sel.append(`<option value="${p.name}" ${selected}>${shortName}</option>`);
    });
    // (Конец функции renderProfileSelect)
    renderSettingsProfileSelect();
    if (typeof renderMiniConn === 'function') renderMiniConn(); // Синхронное обновление мини-подключения
}

export function renderSettingsProfileSelect() {
    const settings = getSettings();
    const sel = $("#nhud-settings-profile-select");
    if (!sel.length) return;
    sel.empty();
    
    const isLight = settings.requestSettings?.lightMode;
    
    if (isLight) {
        sel.append(`<option value="__quiet__" disabled>❌ Текущее подключение ST (Недоступно в Лайт-режиме)</option>`);
    } else {
        sel.append(`<option value="__quiet__" ${!settings.useSTProfile ? 'selected' : ''}>🔄 Текущее подключение ST</option>`);
    }
    
    getSTProfiles().forEach(p => {
        const selected = settings.useSTProfile && settings.activeProfile === p.name ? 'selected' : '';
        sel.append(`<option value="${p.name}" ${selected}>${p.name} (${p.api || '?'})</option>`);
    });
}

export function renderInfoBlocks() {
    const live = getLive();
    const dtBar = $("#nhud-datetime-bar");
    if (live.infoBlocks.datetime) {
        dtBar.html(`<div class="nhud-datetime-content">${live.infoBlocks.datetime}</div>`).show();
    } else { dtBar.hide(); }

    const popup = $("#nhud-infoblock-popup");
    if (popup.is(":visible")) {
        const current = popup.attr("data-current");
        if (current) {
            // ФИКС: Здесь тоже применяем форматтер
            $("#nhud-infoblock-popup-content").html(formatPopupText(live.infoBlocks[current]));
        }
    }
}

// ─── Trackers ───────────────────────────────────────────────────────────

export function renderTrackers() {
    const trackers = getChatTrackers();
    const container = $("#nhud-trackers-list");
    container.empty();
    const settings = getSettings();
    const isDynamic = settings.design?.barDynamic !== false;

    trackers.forEach(tracker => {
        const value = getTrackerValue(tracker.id);
        const pct = Math.round((value / tracker.max) * 100);
        
        // Режим градиента: используем color-mix. Обычный режим: берем tracker.color
        const barStyle = isDynamic 
            ? `width:${pct}%; background: color-mix(in srgb, var(--nhud-bar-start) ${pct}%, var(--nhud-bar-end));`
            : `width:${pct}%; background: ${tracker.color};`;

        container.append(`
            <div class="nhud-tracker-row" data-id="${tracker.id}">
                <div class="nhud-tracker-label" title="${tracker.label}">${tracker.label}</div>
                <div class="nhud-tracker-bar-wrap"><div class="nhud-tracker-bar" style="${barStyle}"></div></div>
                <div class="nhud-tracker-value">${value}/${tracker.max}</div>
            </div>
        `);
    });
}

export function renderRelationships() {
    const live = getLive();
    const settings = getSettings();
    let container = $("#nhud-relationships-list");
    
    if (!container.length) {
        $("#nhud-trackers-section").css({"max-height": "30vh", "overflow-y": "auto", "padding-right": "4px"});
        $("#nhud-trackers-section").after(`
            <div class="nhud-divider"></div>
            <div id="nhud-relationships-section" style="max-height: 25vh; overflow-y: auto; padding-right:4px;">
                <div id="nhud-relationships-list" style="display: flex; flex-direction: column; gap: 7px;"></div>
            </div>
        `);
        container = $("#nhud-relationships-list");
    }

    container.empty();
    const userName = getUserName();
    const charNames = Object.keys(live.characters).filter(name => 
        name.toLowerCase() !== userName.toLowerCase() && !name.toLowerCase().includes('system') && !live.characters[name].ignoreRelationship
    );

    if (!charNames.length) return;

    container.append('<div style="font-size:0.65em; color:#8060a0; font-weight:bold; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px;">Трекер отношений</div>');

    charNames.forEach(name => {
        const char = live.characters[name];
        const rel = char.relationship !== undefined ? char.relationship : 50;
        const pct = Math.max(0, Math.min(100, rel));

        let color = "#a090c0";
        if (pct < 30) color = "#e05252";
        else if (pct < 45) color = "#e0a352";
        else if (pct >= 80) color = "#e052a8";
        else if (pct >= 60) color = "#52e0a3";

        const isDynamic = settings.design?.barDynamic !== false;
        const barStyle = isDynamic 
            ? `width:${pct}%; background: color-mix(in srgb, var(--nhud-bar-start) ${pct}%, var(--nhud-bar-end));`
            : `width:${pct}%; background: ${color};`;

        container.append(`
            <div class="nhud-tracker-row">
                <div class="nhud-tracker-label" title="${name}">${name}</div>
                <div class="nhud-tracker-bar-wrap"><div class="nhud-tracker-bar" style="${barStyle}"></div></div>
                <div class="nhud-tracker-value">${pct}/100</div>
            </div>
        `);
    }); // <-- ЦИКЛ ЗАКРЫВАЕТСЯ ЗДЕСЬ!

    // Обновляем мини-окно один раз после завершения отрисовки
    if (typeof renderMiniSims === 'function') {
        renderMiniSims(); 
    }
}

// ─── Characters ─────────────────────────────────────────────────────────

export function renderCharacters() {
    const settings = getSettings();
    const live = getLive();
    const container = $("#nhud-characters-list");
    container.empty();
    
    const userName = getUserName();
    const charName = getCharName();

    const normalizedChars = {};
    Object.entries(live.characters).forEach(([key, value]) => {
        const normalizedKey = findCharacterKey(normalizedChars, key) || key;
        if (!normalizedChars[normalizedKey]) {
            normalizedChars[normalizedKey] = value;
        } else {
            normalizedChars[normalizedKey] = {
                ...normalizedChars[normalizedKey],
                ...value
            };
        }
    });
    
    if (Object.keys(normalizedChars).length !== Object.keys(live.characters).length) {
        live.characters = normalizedChars;
        saveSettingsDebounced();
    }

    const charNames = Object.keys(live.characters).filter(name => 
        name.toLowerCase() !== userName.toLowerCase() &&
        !name.toLowerCase().includes('system')
    );

    if (!charNames.length) {
        container.append(`<div class="nhud-no-chars" style="color:#a08080; font-size:11px; text-align:center;">Нет персонажей в этом чате</div>`);
        return;
    }

    const sorted = charNames.sort((a, b) => {
        if (a.toLowerCase() === charName.toLowerCase()) return -1;
        if (b.toLowerCase() === charName.toLowerCase()) return 1;
        return a.localeCompare(b);
    });

    const tMode = settings.ui?.thoughtsMode || "individual";
    let unifiedThoughtsContent = "";

    sorted.forEach((name, idx) => {
        const liveData = live.characters[name];
        const globalChar = settings.characters.find(c => c.name && c.name.toLowerCase() === name.toLowerCase()) || {};
        
        const avatarHtml = globalChar.avatar 
            ? `<img src="${globalChar.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'"/>`
            : `<div style="width:100%;height:100%;background:#1a1628;color:#6060a0;display:flex;align-items:center;justify-content:center;font-weight:bold;border-radius:4px;">${name[0].toUpperCase()}</div>`;

        const showEmoji = settings.design?.showStatusEmojis !== false;
        const outfit = liveData.outfit ? `<div style="font-size:0.75em; color:#8080a0; margin-top:2px;">${showEmoji ? '👗 ' : ''}${liveData.outfit}</div>` : '';
        const state = liveData.state ? `<div style="font-size:0.75em; color:#a0a090; margin-top:2px;">${showEmoji ? '🎭 ' : ''}${liveData.state}</div>` : '';
        const formattedThoughts = liveData.thoughts ? formatPopupText(liveData.thoughts) : '';

        // Собираем мысли для единого окна
        if (tMode === "unified" && liveData.thoughts) {
             unifiedThoughtsContent += `
                <div style="margin-bottom:12px; border-left:2px solid var(--nhud-accent); padding-left:8px;">
                    <div style="color:var(--nhud-text-main); font-weight:bold; margin-bottom:4px;">${name}</div>
                    <div style="font-size:0.9em; color:var(--nhud-text-muted);">${formattedThoughts}</div>
                </div>`;
        }

        // Рендерим мысли внутри карточки для индивидуального режима (выглядят как аккуратный блок)
        const individualThoughtsHtml = (tMode === "individual" && liveData.thoughts) 
            ? `<div style="margin-top:6px; font-size:0.8em; color:#52a8e0; background:rgba(16,16,21,0.6); border:1px solid #203050; padding:6px; border-radius:4px; border-left:2px solid #52a8e0;">
                 <div style="font-weight:bold; font-size:0.85em; margin-bottom:2px; color:#4288b0;">💭 Мысли:</div>
                 ${formattedThoughts}
               </div>`
            : '';

        const card = $(`
            <div style="display:flex; gap:8px; background:rgba(0,0,0,0.2); border:1px solid var(--nhud-border); border-radius:6px; padding:6px;">
                <div style="width:36px; height:36px; flex-shrink:0;">${avatarHtml}</div>
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; font-weight:bold; color:var(--nhud-text-main); font-size:0.9em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${name}
                    </div>
                    ${outfit}
                    ${state}
                    ${individualThoughtsHtml}
                </div>
            </div>
        `);

        container.append(card);
    });

    // Кнопка вызова единого окна мыслей (вставляется над персонажами)
    if (tMode === "unified" && unifiedThoughtsContent) {
        const unifiedBtn = $(`<button class="nhud-info-btn" style="width:100%; margin-bottom:8px; background:rgba(82, 168, 224, 0.15); border:1px solid #3a5a80; color:#80b0e0; border-radius:4px; padding:4px; cursor:pointer; font-weight:bold; transition:0.2s;">💭 Сводка мыслей</button>`);
        
        unifiedBtn.hover(
            function() { $(this).css("background", "rgba(82, 168, 224, 0.3)"); },
            function() { $(this).css("background", "rgba(82, 168, 224, 0.15)"); }
        );

        unifiedBtn.on('click', function(e) {
            e.stopPropagation();
            const popup = $("#nhud-infoblock-popup");
            const isSame = popup.is(":visible") && popup.attr("data-current") === "unified_thoughts";
            
            const sidebarRect = $("#narrative-hud-sidebar")[0].getBoundingClientRect();
            const btnRect = $(this)[0].getBoundingClientRect();
            popup.css({ top: btnRect.top + "px", left: (sidebarRect.left - parseInt(getComputedStyle(document.body).getPropertyValue('--nhud-prompt-width') || 300) - 10) + "px" });

            if (isSame) {
                popup.fadeOut(150).removeAttr("data-current"); 
                $(".nhud-info-btn").removeClass("active");
            } else {
                $(".nhud-info-btn").removeClass("active"); 
                $(this).addClass("active");
                $("#nhud-infoblock-popup-title").text("Сводка мыслей");
                $("#nhud-infoblock-popup-content").html(unifiedThoughtsContent);
                popup.attr("data-current", "unified_thoughts").fadeIn(150);
            }
        });
        
        container.prepend(unifiedBtn);
    }

    $(document).off('click.thoughts').on('click.thoughts', () => $('.nhud-thoughts-popup').hide());
}

// ─── Settings: Trackers ─────────────────────────────────────────────────
export function renderSettingsTrackers() {
    const trackers = getChatTrackers();
    const live = getLive();
    const list = $("#nhud-settings-tracker-list");
    list.empty();
    
    const isDynamic = getSettings().design?.barDynamic !== false;

    trackers.forEach((tracker, idx) => {
        const currentVal = live.trackerValues[tracker.id] !== undefined ? live.trackerValues[tracker.id] : tracker.max;
        
        const colorPickerStyle = isDynamic ? 'display:none;' : 'display:block;';

        const row = $(`
            <div class="nhud-settings-tracker-row" data-idx="${idx}" style="display:flex; gap:6px; margin-bottom:8px; align-items:center;">
                <input class="nhud-s-label nhud-input" type="text" placeholder="Название" value="${tracker.label}" style="flex:1;" />
                <input class="nhud-s-id nhud-input" type="text" placeholder="id" value="${tracker.id}" style="width:70px;" />
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:0.6em; color:#606080; line-height:1;">Тек.</span>
                    <input class="nhud-s-val nhud-input" type="number" min="0" max="${tracker.max}" value="${currentVal}" style="width:45px; background:#2a2040; color:#52e0a3; padding:4px;" />
                </div>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:0.6em; color:#606080; line-height:1;">Макс.</span>
                    <input class="nhud-s-max nhud-input" type="number" min="1" value="${tracker.max}" style="width:45px; padding:4px;" />
                </div>
                <input class="nhud-s-color" type="color" value="${tracker.color}" style="width:28px; height:28px; padding:0; border:none; border-radius:4px; cursor:pointer; margin-top:10px; ${colorPickerStyle}" />
                <button class="nhud-s-delete nhud-s-delete-btn" style="width:24px; padding:2px 0; margin-top:10px;">✕</button>
            </div>
        `);
        
        row.find(".nhud-s-label").on("input", e => { trackers[idx].label = e.target.value; saveSettingsDebounced(); renderTrackers(); });
        row.find(".nhud-s-id").on("input",    e => { trackers[idx].id    = e.target.value; saveSettingsDebounced(); });
        row.find(".nhud-s-val").on("input",   e => { 
            const val = parseInt(e.target.value) || 0;
            live.trackerValues[tracker.id] = Math.min(Math.max(0, val), trackers[idx].max);
            saveSettingsDebounced(); 
            renderTrackers(); 
        });
        row.find(".nhud-s-max").on("input",   e => { 
            trackers[idx].max = parseInt(e.target.value) || 100; 
            row.find(".nhud-s-val").attr("max", trackers[idx].max);
            saveSettingsDebounced(); 
            renderTrackers(); 
        });
        row.find(".nhud-s-color").on("input", e => { trackers[idx].color = e.target.value; saveSettingsDebounced(); renderTrackers(); });
        row.find(".nhud-s-delete").on("click",() => { 
            trackers.splice(idx,1); 
            saveSettingsDebounced(); 
            renderSettingsTrackers(); 
            renderTrackers(); 
        });
        list.append(row);
    });

    const placeholder = $("#nhud-settings-rel-container-placeholder");
    if (placeholder.length && placeholder.find("#nhud-settings-rel-container").length === 0) {
        placeholder.html(`
            <div id="nhud-settings-rel-container" style="padding-top:5px;">
                <details open style="border:1px solid var(--nhud-border); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                    <summary style="font-weight:bold; color:var(--nhud-accent); cursor:pointer; padding:5px; outline:none; user-select:none;">❤️ Отношения с персонажами</summary>
                    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; margin:10px 0;">
                        <button id="nhud-s-rel-statuses-btn" class="nhud-add-btn" style="margin:0; padding:4px 8px; background:rgba(200, 100, 150, 0.15); border:1px solid #803a5a; color:#e080b0; transition:0.2s;" title="Настроить статусы отношений">🏷️ Статусы</button>
                        
                        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                            <button id="nhud-open-analytics-btn" class="nhud-add-btn" style="margin:0; padding:4px 8px; background:rgba(82, 168, 224, 0.15); border:1px solid #3a5a80; color:#80b0e0; transition:0.2s;" onmouseover="this.style.background='rgba(82,168,224,0.3)'" onmouseout="this.style.background='rgba(82,168,224,0.15)'">📈 Аналитика</button>
                            <label style="font-size:0.75em; color:#d0d0a0; display:flex; gap:6px; cursor:pointer; align-items:center; background:rgba(200,200,100,0.1); padding:4px 8px; border-radius:4px; border:1px solid #606040; white-space:nowrap;">
                                <input type="checkbox" id="nhud-s-rel-hints-toggle" />
                                💡 Подсказки
                            </label>
                        </div>
                    </div>
                    <div id="nhud-s-rel-statuses-wrapper" style="display:none; margin-bottom:10px; padding:8px; background:rgba(0,0,0,0.2); border:1px dashed #803a5a; border-radius:4px;">
                        <div style="font-size:0.7em; color:#e080b0; margin-bottom:4px; text-transform:uppercase;">Доступные статусы (через запятую):</div>
                        <textarea id="nhud-s-rel-statuses" class="nhud-textarea" rows="2" style="width:100%; box-sizing:border-box; font-size:0.8em; color:#a090c0; border-color:#803a5a; resize:vertical;" placeholder="Враг, Незнакомец, Друг..."></textarea>
                    </div>
                    <div id="nhud-settings-rel-list"></div>
                </details>
            </div>
        `);

        if (getSettings().modules.analytics === false) {
            $("#nhud-open-analytics-btn").hide();
        }

        $("#nhud-open-analytics-btn").on("click", (e) => {
            e.preventDefault();
            if (typeof openAnalyticsPopup === 'function') openAnalyticsPopup();
        });

        $("#nhud-s-rel-statuses-btn").on("click", (e) => {
            e.preventDefault();
            $("#nhud-s-rel-statuses-wrapper").slideToggle(150);
        });

        $("#nhud-s-rel-hints-toggle").on('change', function() {
            getSettings().relationshipSettings.hintsEnabled = this.checked;
            saveSettingsDebounced();
            renderSettingsTrackers();
        });
        $("#nhud-s-rel-statuses").on('change', function() {
            getSettings().relationshipSettings.statuses = $(this).val();
            saveSettingsDebounced();
        });
    }

    const relSettings = getSettings().relationshipSettings;
    $("#nhud-s-rel-hints-toggle").prop('checked', relSettings.hintsEnabled);
    $("#nhud-s-rel-statuses").val(relSettings.statuses);

    const relList = $("#nhud-settings-rel-list");
    relList.empty();

    const userName = getUserName();
    const charNames = Object.keys(live.characters).filter(name => 
        name.toLowerCase() !== userName.toLowerCase() && !name.toLowerCase().includes('system')
    );

    if (charNames.length === 0) {
        relList.append('<div class="nhud-hint">В этом чате пока нет персонажей.</div>');
    } else {
        charNames.forEach(name => {
            const char = live.characters[name];
            const relVal = char.relationship !== undefined ? char.relationship : 50;
            const status = char.relationship_status || "";
            const thoughts = char.relationship_thoughts || "";
            const hint = char.relationship_hint || "";
            
            const globalChar = getSettings().characters.find(c => c.name?.toLowerCase() === name.toLowerCase()) || {};
            const avatarHtml = globalChar.avatar 
                ? `<img src="${globalChar.avatar}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"/>`
                : `<div style="width:100%;height:100%;background:#1a1628;color:#6060a0;display:flex;align-items:center;justify-content:center;font-weight:bold;">${name[0].toUpperCase()}</div>`;

            let barColor = "#a090c0"; 
            if (relVal < 30) barColor = "#e05252"; 
            else if (relVal < 45) barColor = "#e0a352"; 
            else if (relVal >= 80) barColor = "#e052a8"; 
            else if (relVal >= 60) barColor = "#52e0a3"; 

            const card = $(`
                <div style="display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid #3a3050; margin-bottom:10px;">
                    <div style="display:flex; gap:10px; align-items:flex-start;">
                        <div style="width:42px; height:42px; border-radius:4px; overflow:hidden; border:1px solid #4a4060; flex-shrink:0;">
                            ${avatarHtml}
                        </div>
                        <div style="flex:1; min-width:0;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                <span style="font-weight:bold; color:#e0d0a0; font-size:0.9em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</span>
                                <div style="display:flex; gap:4px; align-items:center;">
                                    ${getSettings().modules.analytics !== false ? `<button class="nhud-s-rel-journal-btn" data-name="${name}" title="Открыть журнал связей" style="background:none; border:none; cursor:pointer; font-size:14px; padding:0 4px; transition:0.2s;">📜</button>` : ''}
                                    <button class="nhud-s-rel-toggle-btn" data-name="${name}" title="Скрыть полоску из HUD" style="background:none; border:none; cursor:pointer; font-size:14px; padding:0 4px; transition:0.2s; filter: grayscale(${char.ignoreRelationship ? '100%' : '0'});">${char.ignoreRelationship ? '👁️‍🗨️' : '👁️'}</button>
                                    <input class="nhud-input nhud-s-rel-status" value="${status}" style="width:110px; padding:2px 4px; font-size:0.75em; text-align:right; color:#c0b0a0; border-color:#4a3030;" placeholder="Статус..." />
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <div style="flex:1; height:6px; background:#1a1628; border-radius:3px; overflow:hidden; border:1px solid #2a2040;">
                                    <div style="width:${relVal}%; height:100%; background:${barColor};"></div>
                                </div>
                                <input class="nhud-input nhud-s-rel-val" type="number" min="0" max="100" value="${relVal}" style="width:40px; padding:2px; font-size:0.75em; text-align:center;" />
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div style="font-size:0.65em; color:#52a8e0; text-transform:uppercase; margin-bottom:2px; font-weight:bold;">💭 Отношение к тебе</div>
                        <textarea class="nhud-textarea nhud-s-rel-thoughts" rows="2" style="font-size:0.75em; padding:4px; border-color:#203050; color:#a0c0e0;" placeholder="Что персонаж думает о тебе...">${thoughts}</textarea>
                    </div>
                    
                    ${relSettings.hintsEnabled ? `
                    <div style="margin-top:2px;">
                        <div style="font-size:0.65em; color:#d0d0a0; text-transform:uppercase; margin-bottom:2px; font-weight:bold;">💡 Цель / Подсказка</div>
                        <textarea class="nhud-textarea nhud-s-rel-hint" rows="2" style="font-size:0.75em; padding:4px; border-color:#606040; color:#e0e0b0; background:#202015;" placeholder="Возможное действие...">${hint}</textarea>
                    </div>` : ''}
                </div>
            `);

            // ОБРАБОТЧИК КНОПКИ ЖУРНАЛА
            card.find('.nhud-s-rel-journal-btn').on('click', function(e) {
                e.stopPropagation();
                if (typeof openRelationshipJournal === 'function') {
                    openRelationshipJournal($(this).data('name'));
                }
            }); // <--- ВОТ ЭТА ПРОПУЩЕННАЯ СКОБКА

            // ОБРАБОТЧИК КНОПКИ ТОГГЛА
            card.find('.nhud-s-rel-toggle-btn').on('click', function(e) {
                e.stopPropagation();
                live.characters[name].ignoreRelationship = !live.characters[name].ignoreRelationship;
                saveSettingsDebounced();
                renderSettingsTrackers();
                renderRelationships();
                if (typeof renderMiniSims === 'function') renderMiniSims();
            });

            card.find('.nhud-s-rel-val').on('input', e => {
                live.characters[name].relationship = Math.min(Math.max(0, parseInt(e.target.value) || 0), 100);
                saveSettingsDebounced(); 
                renderRelationships();
            });
            
            card.find('.nhud-s-rel-status').on('input', e => {
                live.characters[name].relationship_status = e.target.value; 
                saveSettingsDebounced();
            });
            
            card.find('.nhud-s-rel-thoughts').on('input', e => {
                live.characters[name].relationship_thoughts = e.target.value; 
                saveSettingsDebounced();
            });
            
            card.find('.nhud-s-rel-hint').on('input', e => {
                live.characters[name].relationship_hint = e.target.value; 
                saveSettingsDebounced();
            });

            relList.append(card);
        });
    }
}

export function renderSettingsPrompts() {
    const settings = getSettings();
    $("#nhud-prompt-system").val(settings.prompts.system);
    $("#nhud-prompt-language").val(settings.prompts.language || "Russian");
    const rs = settings.requestSettings;
    $("#nhud-auto-send").prop("checked", settings.autoSend);
    $("#nhud-send-with-main").prop("checked", rs.sendWithMain || false);
    $("#nhud-light-mode").prop("checked", rs.lightMode || false);
    $("#nhud-context-messages").val(rs.contextMessages || 10);
    $("#nhud-max-tokens").val(rs.maxTokens || 2000);
    $("#nhud-temperature").val(rs.temperature || 0.7);
}

export function extractDataFromText(messageId) {
    const ctx = getSTContext();
    if (!ctx?.chat?.[messageId]) return;
    
    const text = ctx.chat[messageId].mes;
    const extractedData = { characters: [] };
    const charMap = {};

    // Вспомогательная функция для добавления данных персонажу
    const addCharData = (name, key, value) => {
        const cleanName = name.trim();
        if (!charMap[cleanName]) charMap[cleanName] = { name: cleanName };
        charMap[cleanName][key] = value.trim();
    };

    // 1. Ищем костюмы (costume:Имя=Описание)
    const costumeRegex = /costume:\s*([^=]+?)\s*=\s*(.+?)(?=\n|$)/gi;
    let match;
    while ((match = costumeRegex.exec(text)) !== null) {
        addCharData(match[1], 'outfit', match[2]);
    }

    // 2. Ищем настроение/состояние (mood:Имя=Описание)
    const moodRegex = /mood:\s*([^=]+?)\s*=\s*(.+?)(?=\n|$)/gi;
    while ((match = moodRegex.exec(text)) !== null) {
        addCharData(match[1], 'state', match[2]);
    }

    // 3. Ищем отношения (relationship:Имя=Значение ИЛИ relationship_status:Имя=Статус)
    // Формат: relationship:Диана=80 или relationship_status:Диана=Друг
    const relRegex = /relationship:\s*([^=]+?)\s*=\s*(\d+)/gi;
    while ((match = relRegex.exec(text)) !== null) {
        addCharData(match[1], 'relationship', parseInt(match[2]));
    }
    const relStatusRegex = /relationship_status:\s*([^=]+?)\s*=\s*(.+?)(?=\n|$)/gi;
    while ((match = relStatusRegex.exec(text)) !== null) {
        addCharData(match[1], 'relationship_status', match[2]);
    }

    // Собираем найденных персонажей в массив
    extractedData.characters = Object.values(charMap);

    if (extractedData.characters.length > 0) {
        const swipeId = getCurrentSwipeId(messageId);
        // Кормим собранные данные нашей стандартной функции обновления
        applyJsonUpdate(extractedData, messageId, swipeId);
        toastr.success(`Успешно извлечены данные для ${extractedData.characters.length} перс.`);
    } else {
        toastr.warning("Не найдено данных в формате 'ключ:Имя=значение'");
    }
}

// ─── Фаза 1: Управление и Виджеты ─────────────────────────────────────────

export function makeDraggable(elementId, handleId, posKey) {
    const el = document.getElementById(elementId);
    const handle = document.getElementById(handleId) || el;
    if (!el || !handle) return;

    let isDragging = false, startX, startY, initX, initY;

    handle.addEventListener('mousedown', (e) => {
        // Не мешаем кликать по кнопкам и полям ввода
        if (['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = el.getBoundingClientRect();
        initX = rect.left;
        initY = rect.top;
        
        el.style.transition = 'none'; 
        handle.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        let newLeft = initX + (e.clientX - startX);
        let newTop = initY + (e.clientY - startY);

        // Границы экрана (не даем улететь за верхний бар Таверны (40px) и за края экрана)
        const rect = el.getBoundingClientRect();
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - rect.height));

        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
        el.style.right = 'auto'; 
        el.style.bottom = 'auto';
    }

    function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        handle.style.cursor = 'grab';
        document.body.style.userSelect = '';
        el.style.transition = ''; 
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // Сохраняем новые координаты навсегда
        const settings = getSettings();
        if (!settings.ui) settings.ui = {};
        settings.ui[posKey] = { left: el.style.left, top: el.style.top, right: 'auto' };
        saveSettingsDebounced();
    }
}

export function buildFloatingWidget() {
    if ($("#nhud-widget").length) return;
    
    const settings = getSettings();
    const pos = settings.ui?.widgetPos || { left: "20px", top: "80px" };
    
    $("body").append(`
        <div id="nhud-widget" style="position:fixed; left:${pos.left}; top:${pos.top}; width:54px; height:54px; background:rgba(20, 10, 15, 0.95); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; display:grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap:2px; padding:3px; z-index:9999; box-shadow: 0 4px 15px rgba(0,0,0,0.8), 0 0 8px rgba(150, 20, 40, 0.4); cursor:grab;">
            <div class="nhud-w-btn" id="nhud-w-settings" title="Левая панель (Настройки)" style="background:#2a101a; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; transition:0.2s;">⚙️</div>
            <div class="nhud-w-btn" id="nhud-w-hud" title="Правая панель (HUD)" style="background:#2a101a; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; transition:0.2s;">📊</div>
            <div class="nhud-w-btn" id="nhud-w-sims" title="Трекер отношений" style="background:#2a101a; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; transition:0.2s;">❤️</div>
            <div class="nhud-w-btn" id="nhud-w-conn" title="Мини-подключение" style="background:#2a101a; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; transition:0.2s;">🔌</div>
        </div>
    `);
    
    // Стили для наведения уже есть в теге <style> который создается ниже
    let styleTag = document.getElementById("nhud-widget-styles");
    if (!styleTag) {
        $("<style id='nhud-widget-styles'>").text(`
            .nhud-w-btn:hover { background: var(--nhud-border, #501020) !important; box-shadow: inset 0 0 5px rgba(255,100,100,0.3); }
            #nhud-widget:active { cursor: grabbing !important; }
        `).appendTo("head");
    }

    $("#nhud-w-settings").on("click", (e) => { e.stopPropagation(); openSettingsPanel(); });
    $("#nhud-w-hud").on("click", (e) => { e.stopPropagation(); $("#narrative-hud-sidebar").fadeToggle(200); });
    
    // Новые клики для мини-окон
    $("#nhud-w-sims").on("click", (e) => { e.stopPropagation(); toggleMiniSims(); });
    $("#nhud-w-conn").on("click", (e) => { e.stopPropagation(); toggleMiniConn(); });
    
    makeDraggable("nhud-widget", "nhud-widget", "widgetPos");
}

// ─── ГЛОБАЛЬНЫЕ НАСТРОЙКИ (ЦЕНТР ЧАТА) ──────────────────────────────────
export function buildGlobalSettingsModal() {
    if ($("#nhud-global-settings").length) return;
    
    const settings = getSettings();
    if (!settings.modules) settings.modules = { trackers:true, relationships:true, characters:true, thoughts:true, customBlocks:true, datetime:true };
    if (!settings.prompts.trackersPrompt) {
        settings.prompts.trackersPrompt = "Update numerical values of the trackers based on the latest events.";
        settings.prompts.charsPrompt = "Track character states, outfits, and relationship with the user.";
        settings.prompts.datetimePrompt = "Update the current in-game datetime, weather, and location.";
    }

    const d = settings.design || {};
    const ui = settings.ui || {};
    const m = settings.modules;
    const p = settings.prompts;

    $("body").append(`
        <div id="nhud-global-settings" style="display:none; position:fixed; top:40px; bottom:20px; z-index:9992; background:#151220; border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, #2a101a, #1a0a10); padding:10px 15px; border-bottom:1px solid var(--nhud-border, #4a1525);">
                <span style="font-weight:bold; color:var(--nhud-text-main, #e0c0c0);">🎨 Внешний вид и Система</span>
                <button id="nhud-global-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); font-size:18px; cursor:pointer; padding:0;">✕</button>
            </div>
            
            <div style="display:flex; background:#1a0a10; border-bottom:1px solid var(--nhud-border, #3a1525);">
                <button class="nhud-g-tab active" data-tab="visuals" style="flex:1; padding:8px; background:none; border:none; color:var(--nhud-text-main, #e0c0c0); font-weight:bold; cursor:pointer;">🎨 Внешний вид</button>
                <button class="nhud-g-tab" data-tab="system" style="flex:1; padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">⚙️ Система</button>
                <button class="nhud-g-tab" data-tab="faq" style="flex:1; padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">❓ FAQ & Обучение</button>
            </div>
            
            <div id="nhud-global-content" style="flex:1; overflow-y:auto; padding:15px; background:rgba(0,0,0,0.2);">
                
                <div class="nhud-g-tab-content active" data-tab="visuals" style="display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <button id="nhud-theme-mimic" class="nhud-send-btn" style="flex:1; padding:8px; background:#2a101a; border:1px solid #5a2035; color:#e0c0c0; border-radius:4px; cursor:pointer;">🎭 Мимикрировать под ST</button>
                        <button id="nhud-theme-reset" class="nhud-send-btn" style="flex:1; padding:8px; background:#2a101a; border:1px solid #5a2035; color:#e0c0c0; border-radius:4px; cursor:pointer;">🔄 Сбросить дизайн</button>
                    </div>

                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid #3a1525; border-radius:4px; padding:5px;"><summary style="cursor:pointer; color:#d05070; font-weight:bold; outline:none; padding:5px;">⚙️ Левая панель (Настройки) & Раскладка</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                            <div class="nhud-field-group">
                                <div class="nhud-field-group">
                                <label>Режим вкладок</label>
                                <select id="nhud-d-tabsMode" class="nhud-select" style="width:100%;">
                                    <option value="top-text" ${ui.tabsMode === 'top-text' ? 'selected' : ''}>Сверху (Иконка + Текст)</option>
                                    <option value="top-icon" ${ui.tabsMode === 'top-icon' ? 'selected' : ''}>Сверху (Только иконки)</option>
                                    <option value="side-icon" ${ui.tabsMode === 'side-icon' ? 'selected' : ''}>Сбоку (Только иконки)</option>
                                </select>
                            </div>
                            <div class="nhud-field-group">
                                <label>Отображение мыслей (💭)</label>
                                <select id="nhud-d-thoughtsMode" class="nhud-select" style="width:100%;">
                                    <option value="individual" ${ui.thoughtsMode === 'individual' ? 'selected' : ''}>У каждого персонажа</option>
                                    <option value="unified" ${ui.thoughtsMode === 'unified' ? 'selected' : ''}>Единым окном (Кнопка)</option>
                                </select>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input id="nhud-d-setBgC" type="color" value="${d.setBgColor || '#140a0f'}" style="width:40px; height:30px; cursor:pointer;"/>
                                <label style="flex:1; color:#a08080;">Цвет фона</label>
                                <input id="nhud-d-setBgO" type="range" min="0" max="1" step="0.05" value="${d.setBgOpacity ?? 0.95}" style="width:80px;" title="Прозрачность"/>
                            </div>
                            <div class="nhud-field-group">
                                <label>URL картинки на фон</label>
                                <input id="nhud-d-setImg" class="nhud-input" type="text" value="${d.setBgImage || ''}" placeholder="https://..." />
                            </div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid #3a1525; border-radius:4px; padding:5px;"><summary style="cursor:pointer; color:#d05070; font-weight:bold; outline:none; padding:5px;">📊 Правая панель (HUD)</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input id="nhud-d-hudBgC" type="color" value="${d.hudBgColor || '#140a0f'}" style="width:40px; height:30px; cursor:pointer;"/>
                                <label style="flex:1; color:#a08080;">Цвет фона</label>
                                <input id="nhud-d-hudBgO" type="range" min="0" max="1" step="0.05" value="${d.hudBgOpacity ?? 0.95}" style="width:80px;" title="Прозрачность"/>
                            </div>
                            <div class="nhud-field-group">
                                <label>URL картинки на фон</label>
                                <input id="nhud-d-hudImg" class="nhud-input" type="text" value="${d.hudBgImage || ''}" placeholder="https://..." />
                            </div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid #3a1525; border-radius:4px; padding:5px;"><summary style="cursor:pointer; color:#d05070; font-weight:bold; outline:none; padding:5px;">🎨 Центральное окно (Дизайн)</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input id="nhud-d-cenBgC" type="color" value="${d.cenBgColor || '#151220'}" style="width:40px; height:30px; cursor:pointer;"/>
                                <label style="flex:1; color:#a08080;">Цвет фона</label>
                                <input id="nhud-d-cenBgO" type="range" min="0" max="1" step="0.05" value="${d.cenBgOpacity ?? 0.98}" style="width:80px;" title="Прозрачность"/>
                            </div>
                            <div class="nhud-field-group">
                                <label>URL картинки на фон</label>
                                <input id="nhud-d-cenImg" class="nhud-input" type="text" value="${d.cenBgImage || ''}" placeholder="https://..." />
                            </div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid #3a1525; border-radius:4px; padding:5px;"><summary style="cursor:pointer; color:#d05070; font-weight:bold; outline:none; padding:5px;">💬 Всплывающие окна (Промпты)</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input id="nhud-d-prmBg" type="color" value="${d.promptBgColor || '#1a0a10'}" style="width:40px; height:30px; cursor:pointer;"/>
                                <label style="flex:1; color:#a08080;">Цвет фона окна</label>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input id="nhud-d-prmTxtC" type="color" value="${d.promptTextColor || '#e0b0b0'}" style="width:30px; height:25px;"/>
                                <label style="font-size:12px; color:#a08080;">Цвет текста</label>
                                <input id="nhud-d-prmSize" type="number" value="${d.promptFontSize || 14}" style="width:50px;" class="nhud-input"/>
                                <label style="font-size:12px; color:#a08080;">Размер (px)</label>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input id="nhud-d-prmHBg" type="color" value="${d.promptHeaderBg || '#2a101a'}" style="width:40px; height:30px; cursor:pointer;"/>
                                <label style="flex:1; color:#a08080;">Цвет шапки</label>
                            </div>
                            <div class="nhud-field-group">
                                <label>URL картинки на фон</label>
                                <input id="nhud-d-prmImg" class="nhud-input" type="text" value="${d.promptBgImage || ''}" placeholder="https://..." />
                            </div>
                            <div class="nhud-field-group">
                                <label>Ширина окна (px)</label>
                                <input id="nhud-d-prmW" class="nhud-input" type="number" min="200" max="800" value="${d.promptWidth || 300}" />
                            </div>
                            <label style="display:flex; align-items:center; gap:8px; color:var(--nhud-text-main); cursor:pointer;">
                                <input type="checkbox" id="nhud-d-prmMerge" ${d.promptMerged ? 'checked' : ''}>
                                Слить шапку с фоном (Монолит)
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; color:var(--nhud-text-main); cursor:pointer; border-top: 1px dashed var(--nhud-border); padding-top: 8px;">
                                <input type="checkbox" id="nhud-d-showEmoji" ${d.showStatusEmojis !== false ? 'checked' : ''}>
                                Показывать смайлики (👗, 🎭)
                            </label>
                            <div style="border-top: 1px dashed var(--nhud-border); padding-top: 8px;">
                                <label style="display:flex; align-items:center; gap:8px; color:var(--nhud-text-main); cursor:pointer; margin-bottom:8px;">
                                    <input type="checkbox" id="nhud-d-barDyn" ${d.barDynamic !== false ? 'checked' : ''}>
                                    Градиент полосок (от %%)
                                </label>
                                <div style="display:flex; gap:10px; align-items:center;">
                                    <input id="nhud-d-barS" type="color" value="${d.barColorStart || '#52e0a3'}" style="width:30px; height:25px;"/>
                                    <span style="font-size:11px;">100%</span>
                                    <input id="nhud-d-barE" type="color" value="${d.barColorEnd || '#e05252'}" style="width:30px; height:25px;"/>
                                    <span style="font-size:11px;">0%</span>
                                </div>
                            </div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid #3a1525; border-radius:4px; padding:5px;"><summary style="cursor:pointer; color:#d05070; font-weight:bold; outline:none; padding:5px;">🧊 Плавающий виджет (Кубик)</summary>
                        <div style="padding:10px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input id="nhud-d-border" type="color" value="${d.borderColor || '#4a1525'}" style="width:30px; height:30px;"/>
                                <label style="font-size:12px; color:#a08080;">Цвет границ</label>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input id="nhud-d-textM" type="color" value="${d.textMain || '#e0b0b0'}" style="width:30px; height:30px;"/>
                                <label style="font-size:12px; color:#a08080;">Осн. текст</label>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input id="nhud-d-textMu" type="color" value="${d.textMuted || '#a08080'}" style="width:30px; height:30px;"/>
                                <label style="font-size:12px; color:#a08080;">Тус. текст</label>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <input id="nhud-d-accent" type="color" value="${d.accent || '#d05070'}" style="width:30px; height:30px;"/>
                                <label style="font-size:12px; color:#a08080;">Акцент</label>
                            </div>
                            <div style="grid-column: span 2; display:flex; gap:10px; align-items:center; border-top:1px dashed #3a1525; padding-top:10px; margin-top:5px;">
                                <input id="nhud-d-inpC" type="color" value="${d.inputBgColor || '#000000'}" style="width:30px; height:30px; cursor:pointer;"/>
                                <label style="font-size:12px; color:#a08080;">Фон плашек и инпутов</label>
                                <input id="nhud-d-inpO" type="range" min="0" max="1" step="0.05" value="${d.inputBgOpacity ?? 0.3}" style="flex:1;" title="Прозрачность плашек"/>
                            </div>
                        </div>
                    </details>
                    
                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid #3a1525; border-radius:4px; padding:5px;"><summary style="cursor:pointer; color:#d05070; font-weight:bold; outline:none; padding:5px;">💻 Custom CSS</summary>
                        <textarea id="nhud-d-css" class="nhud-textarea" rows="4" placeholder="/* Твой CSS код */" style="width:100%; box-sizing:border-box; font-family:monospace; font-size:11px; margin-top:5px;">${d.customCss || ''}</textarea>
                    </details>
                </div>

                <div class="nhud-g-tab-content" data-tab="system" style="display:none; flex-direction:column; gap:10px;">
                    
                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;" open>
                        <summary style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">🔌 Управление модулями (Визуал + Промт)</summary>
                        <div style="padding:10px; display:grid; grid-template-columns: 1fr 1fr; gap:10px; color:var(--nhud-text-main);">
                            <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-trackers" ${m.trackers?'checked':''}> Трекеры (Здоровье и др.)</label>
                            <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-rel" ${m.relationships?'checked':''}> Отношения (Трекер отношений)</label>
                            <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-chars" ${m.characters?'checked':''}> Персонажи (Одежда, состояние)</label>
                            <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-thoughts" ${m.thoughts?'checked':''}> Мысли персонажей</label>
                            <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-blocks" ${m.customBlocks?'checked':''}> Кастомные блоки (Монолог и т.д.)</label>
                            <label class="nhud-checkbox-group"><input type="checkbox" id="nhud-m-date" ${m.datetime?'checked':''}> Дата, время и погода</label>
                            <label class="nhud-checkbox-group" style="grid-column: span 2; border-top: 1px dashed var(--nhud-border); padding-top: 5px;"><input type="checkbox" id="nhud-m-analytics" ${m.analytics !== false ? 'checked':''}> 📈 Графики динамики отношений (Аналитика)</label>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;">
                        <summary style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">📝 Системные промты</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:10px;">
                            <div class="nhud-section-hint">Здесь можно отредактировать базовые инструкции, которые мод отправляет нейросети при активных модулях.</div>
                            
                            <div class="nhud-field-group" style="background: rgba(200,50,80,0.1); padding: 8px; border: 1px solid var(--nhud-border); border-radius: 4px;">
                                <label style="color:#d0d0a0; font-weight:bold;">🌐 Язык ответов (Language)</label>
                                <input id="nhud-p-lang" class="nhud-input" type="text" value="${p.language || 'Russian'}" placeholder="Russian / English / etc..." />
                                <div class="nhud-hint">Укажи язык на котором ИИ должен заполнять JSON.</div>
                            </div>

                            <div class="nhud-field-group">
                                <label>Главный системный промт (База)</label>
                                <textarea id="nhud-p-sys" class="nhud-textarea" rows="3">${p.system}</textarea>
                            </div>
                            <div class="nhud-field-group">
                                <label>Промт для Трекеров</label>
                                <textarea id="nhud-p-trackers" class="nhud-textarea" rows="2">${p.trackersPrompt}</textarea>
                            </div>
                            <div class="nhud-field-group">
                                <label>Промт для Персонажей / Отношений</label>
                                <textarea id="nhud-p-chars" class="nhud-textarea" rows="2">${p.charsPrompt}</textarea>
                            </div>
                            
                            <div class="nhud-field-group">
                                <label>Промт для Журнала связей (Причина изменения)</label>
                                <textarea id="nhud-p-relReason" class="nhud-textarea" rows="2">${p.relReasonPrompt || 'short reason why relationship changed (if it did)'}</textarea>
                            </div>

                            <div class="nhud-field-group">
                                <label>Промт для Даты и Времени</label>
                                <textarea id="nhud-p-date" class="nhud-textarea" rows="2">${p.datetimePrompt}</textarea>
                            </div>
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;" open>
                        <summary style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">📊 Расход токенов (Примерная оценка)</summary>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:5px; font-size:13px;">
                            <div style="display:flex; justify-content:space-between; color:var(--nhud-text-muted);">
                                <span>Системные инструкции:</span> <span id="nhud-tokens-sys">0</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; color:var(--nhud-text-muted);">
                                <span>Кастомные блоки:</span> <span id="nhud-tokens-custom">0</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; color:var(--nhud-text-muted);">
                                <span>Структура JSON (Скелет):</span> <span id="nhud-tokens-json">0</span>
                            </div>
                            <div style="border-top:1px dashed var(--nhud-border); margin-top:5px; padding-top:5px; display:flex; justify-content:space-between; color:var(--nhud-text-main); font-weight:bold;">
                                <span>Итого к запросу:</span> <span id="nhud-tokens-total">0 токенов</span>
                            </div>
                            <div class="nhud-section-hint" style="margin-top:5px;">* Оценка примерная. 1 токен ≈ 4 англ. символа или 2 рус. символа. Зависит от токенизатора модели.</div>
                        </div>
                    </details>

                </div>

                <div class="nhud-g-tab-content" data-tab="faq" style="display:none; flex-direction:column; gap:10px;">
                    <div style="background:rgba(82, 168, 224, 0.15); border:1px solid #3a5a80; padding:15px; border-radius:6px; text-align:center;">
                        <h3 style="margin-top:0; color:#80b0e0; font-size:16px;">Первый раз здесь?</h3>
                        <p style="font-size:13px; color:#d0d0a0; margin-bottom:15px;">Запустите интерактивный тур, чтобы узнать, где что находится и как этим пользоваться.</p>
                        <button id="nhud-start-tour-btn" class="nhud-send-btn" style="padding:10px 20px; font-size:14px; background:#2a4060; border-color:#52a8e0; border-radius:4px; color:#e0e0e0; cursor:pointer; font-weight:bold; transition:0.2s;">🚀 Начать интерактивный тур</button>
                    </div>

                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;">
                        <summary style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">❓ Как работают инфоблоки (Мысли, Комментарии)?</summary>
                        <div style="padding:10px; font-size:13px; color:var(--nhud-text-main); line-height:1.4;">
                            Инфоблоки — это кастомные поля, которые нейросеть заполняет помимо основного текста. Нажав на кнопку (например, "💭 Комментарии") на правой панели HUD, вы откроете плавающее окно. Окно можно перетаскивать и менять его размер за правый нижний угол.
                        </div>
                    </details>
                    
                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;">
                        <summary style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">❓ Что такое "Лайт-режим" (Фоновый парсинг)?</summary>
                        <div style="padding:10px; font-size:13px; color:var(--nhud-text-main); line-height:1.4;">
                            <b>Обычный режим:</b> Мод добавляет огромный системный промпт к основному запросу ИИ. Это надежно, но тратит много токенов.<br><br>
                            <b>Лайт-режим:</b> ИИ отвечает как обычно. А мод <i>незаметно в фоне</i> делает второй, дешевый запрос к API, чтобы вытащить из готового текста статы и эмоции. Это экономит контекст чата!
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;">
                        <summary style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">❓ Куда пропал выбор цвета у трекеров?</summary>
                        <div style="padding:10px; font-size:13px; color:var(--nhud-text-main); line-height:1.4;">
                            В настройках дизайна (Внешний вид -> Всплывающие окна) у вас включена галочка <b>«Градиент полосок (от %%)»</b>. В этом режиме все бары плавно меняют цвет от 100% к 0%. Отключите галочку, чтобы красить каждый трекер индивидуально.
                        </div>
                    </details>

                    <details class="nhud-design-acc" style="background:rgba(0,0,0,0.3); border:1px solid var(--nhud-border); border-radius:4px; padding:5px;">
                        <summary style="cursor:pointer; color:var(--nhud-accent); font-weight:bold; outline:none; padding:5px;">❓ Почему статы не обновляются?</summary>
                        <div style="padding:10px; font-size:13px; color:var(--nhud-text-main); line-height:1.4;">
                            Убедитесь, что во вкладке "Подкл." (Левая панель) включена <b>"Авто-отправка"</b> или выбран профиль API. Вы всегда можете принудительно заставить ИИ пересчитать статы, нажав маленькую кнопку <b>[▶]</b> в правом верхнем углу панели HUD или в мини-виджете подключения (🔌).
                        </div>
                    </details>
                </div>
            </div>
        </div>
    `);
    
    // --- КАЛЬКУЛЯТОР ТОКЕНОВ ---
    function estimateTokens(text) {
        if (!text) return 0;
        return Math.ceil(text.length / 3); // Грубая, но надежная оценка
    }

    function updateTokenTracker() {
        const s = getSettings();
        const sm = s.modules;
        const sp = s.prompts;
        
        let sysText = sp.system || '';
        if (sm.trackers) sysText += sp.trackersPrompt || '';
        if (sm.characters || sm.relationships) sysText += sp.charsPrompt || '';
        if (sm.datetime) sysText += sp.datetimePrompt || '';
        
        const sysTokens = estimateTokens(sysText);
        
        let customText = '';
        if (sm.customBlocks && s.promptBlocks) {
            s.promptBlocks.forEach(b => { if (b.enabled) customText += b.prompt || ''; });
        }
        const customTokens = estimateTokens(customText);
        
        let jsonOverhead = 50; // Базовые скобки
        if (sm.trackers) jsonOverhead += 30;
        if (sm.characters) jsonOverhead += 50;
        if (sm.relationships) jsonOverhead += 20;
        if (sm.customBlocks) jsonOverhead += 40;
        
        $("#nhud-tokens-sys").text(sysTokens);
        $("#nhud-tokens-custom").text(customTokens);
        $("#nhud-tokens-json").text(jsonOverhead);
        $("#nhud-tokens-total").text(sysTokens + customTokens + jsonOverhead + " токенов");
    }

    function saveAndApply() { 
        saveSettingsDebounced(); 
        applyDesignTheme();
        updateTokenTracker(); 
    }

    // --- ОБРАБОТЧИКИ МОДУЛЕЙ И ПРОМТОВ ---
    const modBinds = { trackers: '#nhud-m-trackers', relationships: '#nhud-m-rel', characters: '#nhud-m-chars', thoughts: '#nhud-m-thoughts', customBlocks: '#nhud-m-blocks', datetime: '#nhud-m-date', analytics: '#nhud-m-analytics' };
    for (const [key, id] of Object.entries(modBinds)) {
        $(id).on("change", e => { 
            getSettings().modules[key] = e.target.checked; 
            saveAndApply(); 
            
            // ФИКС: Логика скрытия/показа аналитики
            if (key === 'analytics') {
                if (e.target.checked) {
                    $("#nhud-open-analytics-btn").show();
                } else {
                    $("#nhud-open-analytics-btn").hide();
                    $("#nhud-analytics-popup").fadeOut(150); // Прячем сам график, если он открыт
                }
            }
        });
    }

    $("#nhud-p-lang").on("input", e => { getSettings().prompts.language = e.target.value; saveAndApply(); }); // Обработчик языка
    $("#nhud-p-sys").on("input", e => { getSettings().prompts.system = e.target.value; saveAndApply(); });
    $("#nhud-p-relReason").on("input", e => { getSettings().prompts.relReasonPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-chars").on("input", e => { getSettings().prompts.charsPrompt = e.target.value; saveAndApply(); });
    $("#nhud-p-date").on("input", e => { getSettings().prompts.datetimePrompt = e.target.value; saveAndApply(); });

    // --- ОБРАБОТЧИКИ ДИЗАЙНА (ОСТАЮТСЯ КАК БЫЛИ) ---
    $("#nhud-d-tabsMode").on("change", e => { getSettings().ui.tabsMode = e.target.value; saveAndApply(); });
    $("#nhud-d-thoughtsMode").on("change", e => { getSettings().ui.thoughtsMode = e.target.value; saveAndApply(); renderCharacters(); });
    $("#nhud-d-prmTxtC").on("input", e => { getSettings().design.promptTextColor = e.target.value; saveAndApply(); });
    $("#nhud-d-prmSize").on("input", e => { getSettings().design.promptFontSize = parseInt(e.target.value) || 14; saveAndApply(); });
    
    const binds = {
        hudBgColor: '#nhud-d-hudBgC', hudBgOpacity: '#nhud-d-hudBgO', hudBgImage: '#nhud-d-hudImg',
        setBgColor: '#nhud-d-setBgC', setBgOpacity: '#nhud-d-setBgO', setBgImage: '#nhud-d-setImg',
        widBgColor: '#nhud-d-widBgC', widBgOpacity: '#nhud-d-widBgO', widBgImage: '#nhud-d-widImg',
        cenBgColor: '#nhud-d-cenBgC', cenBgOpacity: '#nhud-d-cenBgO', cenBgImage: '#nhud-d-cenImg',
        promptBgColor: '#nhud-d-prmBg', promptHeaderBg: '#nhud-d-prmHBg', promptBgImage: '#nhud-d-prmImg', promptWidth: '#nhud-d-prmW',
        inputBgColor: '#nhud-d-inpC', inputBgOpacity: '#nhud-d-inpO',
        borderColor: '#nhud-d-border', textMain: '#nhud-d-textM', textMuted: '#nhud-d-textMu', accent: '#nhud-d-accent', customCss: '#nhud-d-css'
    };

    for (const [key, id] of Object.entries(binds)) {
        $(id).on("input", e => { 
            const val = (e.target.type === 'range' || e.target.type === 'number') ? parseFloat(e.target.value) : e.target.value;
            getSettings().design[key] = val; 
            saveAndApply(); 
        });
    }
    $("#nhud-d-prmMerge").on("change", e => { getSettings().design.promptMerged = e.target.checked; saveAndApply(); });
    $("#nhud-d-showEmoji").on("change", e => { getSettings().design.showStatusEmojis = e.target.checked; saveAndApply(); renderCharacters(); });
    $("#nhud-d-barDyn").on("change", e => { 
        getSettings().design.barDynamic = e.target.checked; 
        saveAndApply(); 
        renderRelationships(); 
        renderTrackers(); 
        renderSettingsTrackers(); // Перерисовываем список трекеров в настройках, чтобы скрыть/показать цвета
    });
    $("#nhud-d-barS").on("input", e => { getSettings().design.barColorStart = e.target.value; saveAndApply(); });
    $("#nhud-d-barE").on("input", e => { getSettings().design.barColorEnd = e.target.value; saveAndApply(); });
    $("#nhud-theme-reset").on("click", () => {
        if (!confirm("Сбросить дизайн?")) return;
        const s = getSettings();
        s.design = {
            hudBgColor: "#140a0f", hudBgOpacity: 0.95, hudBgImage: "",
            setBgColor: "#140a0f", setBgOpacity: 0.95, setBgImage: "",
            widBgColor: "#140a0f", widBgOpacity: 0.95, widBgImage: "",
            cenBgColor: "#151220", cenBgOpacity: 0.98, cenBgImage: "",
            inputBgColor: "#000000", inputBgOpacity: 0.3,
            borderColor: "#4a1525", textMain: "#e0b0b0", textMuted: "#a08080", accent: "#d05070", customCss: ""
        };
        saveAndApply();
        for (const [key, id] of Object.entries(binds)) $(id).val(s.design[key]);
    });

    $("#nhud-theme-mimic").on("click", () => {
        const root = getComputedStyle(document.body);
        const bgHex = root.getPropertyValue('--SmartThemeBlurTintColor').trim() || '#1e1e1e';
        const border = root.getPropertyValue('--SmartThemeBorderColor').trim() || '#555555';
        const textM = root.getPropertyValue('--default-text-color').trim() || '#dddddd';
        
        const s = getSettings();
        const baseBg = bgHex.startsWith('#') ? bgHex.substring(0,7) : '#222222';
        s.design.hudBgColor = baseBg; s.design.setBgColor = baseBg; s.design.widBgColor = baseBg; s.design.cenBgColor = baseBg;
        s.design.borderColor = border; s.design.textMain = textM; s.design.textMuted = '#999999';
        saveAndApply();
        for (const [key, id] of Object.entries(binds)) $(id).val(s.design[key] || '');
    });

    // Вкладки центрального окна
    $("#nhud-global-settings .nhud-g-tab").on("click", function() {
        const tab = $(this).data("tab");
        $(".nhud-g-tab").css({ color: "var(--nhud-text-muted, #a08080)", fontWeight: "normal" });
        $(this).css({ color: "var(--nhud-text-main, #e0c0c0)", fontWeight: "bold" });
        
        // Жесткое переключение
        $(".nhud-g-tab-content").hide();
        $(`.nhud-g-tab-content[data-tab="${tab}"]`).css("display", "flex").hide().fadeIn(200);
    });
    
    $("#nhud-global-close").on("click", closeGlobalSettings);
        const chatObserver = new ResizeObserver(() => updateGlobalSettingsPosition());
        const chatEl = document.getElementById("chat");
        if (chatEl) chatObserver.observe(chatEl);

        // Запуск интерактивного тура
        $("#nhud-start-tour-btn").on("click", () => startInteractiveTour());

        // Запускаем калькулятор токенов при открытии
        updateTokenTracker();
}

export function updateGlobalSettingsPosition() {
    const chatEl = document.getElementById("chat");
    const panel = $("#nhud-global-settings");
    
    if (!panel.length) return;

    // 🔴 ГЛАВНЫЙ ФИКС: Вырываем окно из ловушки слоев и переносим в корень страницы!
    if (panel.parent().prop("tagName") !== "BODY") {
        panel.appendTo("body");
    }
    
    let rect = chatEl ? chatEl.getBoundingClientRect() : { width: 0, left: 0 };
    
    // Пороги: экран <= 1200px или чат стал уже 600px
    if (window.innerWidth <= 1200 || rect.width < 600) {
        panel.css({ 
            position: "fixed",
            left: "2vw", 
            width: "96vw", 
            top: "5vh",          
            height: "90vh",      
            bottom: "auto",
            zIndex: 9500,        // 9500 - идеально: выше панелей Таверны, но ниже всплывающих алертов
            display: "flex"      
        });
    } else {
        panel.css({ 
            position: "fixed",
            left: rect.left + "px", 
            width: rect.width + "px", 
            top: "40px",
            height: "calc(100vh - 60px)",
            bottom: "auto",
            zIndex: 9500,
            display: "flex"
        });
    }
}

export function openGlobalSettings() {
    if (!$("#nhud-global-settings").length) buildGlobalSettingsModal();
    
    const chatEl = document.getElementById("chat");
    const rect = chatEl ? chatEl.getBoundingClientRect() : { width: 0 };
    
    // Прячем левую панель по новым порогам
    if (window.innerWidth <= 1200 || rect.width < 600) {
        $("#nhud-settings-panel").hide();
    }
    
    // Задаем координаты
    updateGlobalSettingsPosition();
    
    // Бронебойное появление окна без глюков jQuery fadeIn
    $("#nhud-global-settings")
        .stop(true, true)
        .css({ display: "flex", opacity: 0 })
        .animate({ opacity: 1 }, 200);
}

export function closeGlobalSettings() {
    $("#nhud-global-settings").fadeOut(200);
}

// Универсальная функция для перетаскивания окон
export function makeWindowDraggable(panelId, handleId) {
    const el = document.getElementById(panelId);
    const handle = document.getElementById(handleId) || el;
    if (!el || !handle) return;

    let isDragging = false, startX, startY, initX, initY;

    handle.onmousedown = (e) => {
        if (['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
        isDragging = true;
        startX = e.clientX; 
        startY = e.clientY;
        const rect = el.getBoundingClientRect();
        initX = rect.left; 
        initY = rect.top;
        
        handle.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        
        document.onmousemove = (e) => {
            if (!isDragging) return;
            let newLeft = initX + (e.clientX - startX);
            let newTop = initY + (e.clientY - startY);

            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - el.offsetWidth));
            newTop = Math.max(40, Math.min(newTop, window.innerHeight - el.offsetHeight));

            el.style.left = newLeft + 'px';
            el.style.top = newTop + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.transform = 'none';
        };

        document.onmouseup = () => {
            if (!isDragging) return;
            isDragging = false;
            handle.style.cursor = 'grab';
            document.body.style.userSelect = '';
            document.onmousemove = null;
            document.onmouseup = null;
            
            const settings = getSettings();
            // Сохраняем позицию в зависимости от типа окна
            if (panelId === 'nhud-infoblock-popup') {
                settings.design.promptPos = { left: el.style.left, top: el.style.top };
            } else {
                if (!settings.ui) settings.ui = {};
                settings.ui[panelId + 'Pos'] = { left: el.style.left, top: el.style.top };
            }
            saveSettingsDebounced();
        };
    };
}

// ─── ДИЗАЙН И ТЕМИЗАЦИЯ ─────────────────────────────────────────────────
export function applyDesignTheme() {
    const settings = getSettings();
    const d = settings.design || {};
    const ui = settings.ui || {}; 
    
    // Вспомогательная функция: Hex + Alpha -> RGBA
    function hexToRgba(hex, alpha) {
        if (!hex || !hex.startsWith('#')) return `rgba(20, 10, 15, ${alpha})`;
        let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const hudBg = d.hudBgImage ? `url('${d.hudBgImage}') center/cover no-repeat, ${hexToRgba(d.hudBgColor, d.hudBgOpacity)}` : hexToRgba(d.hudBgColor, d.hudBgOpacity);
    const setBg = d.setBgImage ? `url('${d.setBgImage}') center/cover no-repeat, ${hexToRgba(d.setBgColor, d.setBgOpacity)}` : hexToRgba(d.setBgColor, d.setBgOpacity);
    const widBg = d.widBgImage ? `url('${d.widBgImage}') center/cover no-repeat, ${hexToRgba(d.widBgColor, d.widBgOpacity)}` : hexToRgba(d.widBgColor, d.widBgOpacity);
    const cenBg = d.cenBgImage ? `url('${d.cenBgImage}') center/cover no-repeat, ${hexToRgba(d.cenBgColor, d.cenBgOpacity)}` : hexToRgba(d.cenBgColor, d.cenBgOpacity);
    const prmBg = d.promptBgImage ? `url('${d.promptBgImage}') center/cover no-repeat, ${d.promptBgColor || '#1a0a10'}` : (d.promptBgColor || '#1a0a10');
    
    const inputBg = hexToRgba(d.inputBgColor || '#000000', d.inputBgOpacity ?? 0.3);

    let tabsCss = "";
    const tabsMode = ui.tabsMode || "top-text";
    if (tabsMode === "top-text") tabsCss = `#nhud-settings-body { flex-direction: column !important; } #nhud-settings-tabs { flex-direction: row !important; border-bottom: 1px solid var(--nhud-border) !important; border-right: none !important; width: 100% !important; } .nhud-tab-text { display: inline; } .nhud-tab { font-size: 13px; flex: 1; }`;
    else if (tabsMode === "top-icon") tabsCss = `#nhud-settings-body { flex-direction: column !important; } #nhud-settings-tabs { flex-direction: row !important; border-bottom: 1px solid var(--nhud-border) !important; border-right: none !important; width: 100% !important; } .nhud-tab-text { display: none; } .nhud-tab { font-size: 16px; padding: 8px 0 !important; flex: 1; }`;
    else if (tabsMode === "side-icon") tabsCss = `#nhud-settings-body { flex-direction: row !important; } #nhud-settings-tabs { flex-direction: column !important; width: 44px !important; border-right: 1px solid var(--nhud-border) !important; border-bottom: none !important; } .nhud-tab-text { display: none; } .nhud-tab { font-size: 16px; padding: 12px 0 !important; flex: none !important; width: 100%; }`;

// Прячем отключенные модули из правой панели (HUD)
    const m = settings.modules || {};
    let hideModulesCss = "";
    if (!m.trackers) hideModulesCss += "#nhud-trackers-section { display: none !important; } ";
    if (!m.relationships) hideModulesCss += "#nhud-relationships-section { display: none !important; } ";
    if (!m.characters) hideModulesCss += "#nhud-characters-section { display: none !important; } ";
    if (!m.customBlocks) hideModulesCss += "#nhud-infoblock-buttons { display: none !important; } ";
    if (!m.datetime) hideModulesCss += "#nhud-datetime-bar { display: none !important; } ";

    const cssText = `
        :root {
            --nhud-border: ${d.borderColor || '#4a1525'};
            --nhud-prompt-bg: ${prmBg};
            --nhud-prompt-header: ${d.promptMerged ? 'transparent' : (d.promptHeaderBg || '#2a101a')};
            --nhud-prompt-border: ${d.promptMerged ? 'none' : '1px solid var(--nhud-border)'};
            --nhud-prompt-width: ${window.innerWidth < 768 ? '95vw' : (d.promptWidth || 300) + 'px'};
            --nhud-prompt-text-color: ${d.promptTextColor || 'var(--nhud-text-main)'};
            --nhud-prompt-font-size: ${d.promptFontSize || 14}px;
            --nhud-bar-start: ${d.barColorStart || '#52e0a3'};
            --nhud-bar-end: ${d.barColorEnd || '#e05252'};
            --nhud-text-main: ${d.textMain || '#e0b0b0'};
            --nhud-text-muted: ${d.textMuted || '#a08080'};
            --nhud-accent: ${d.accent || '#d05070'};
        }
        ${tabsCss}
        ${hideModulesCss}
        
        #narrative-hud-sidebar { background: ${hudBg} !important; border-color: var(--nhud-border) !important; color: var(--nhud-text-main) !important; background-blend-mode: overlay; }
        #nhud-settings-panel { background: ${setBg} !important; border-color: var(--nhud-border) !important; color: var(--nhud-text-main) !important; background-blend-mode: overlay; }
        #nhud-widget { background: ${widBg} !important; border-color: var(--nhud-border) !important; background-blend-mode: overlay; }
        #nhud-global-settings { background: ${cenBg} !important; border-color: var(--nhud-border) !important; color: var(--nhud-text-main) !important; background-blend-mode: overlay; }
        
        /* Прозрачность плашек и инпутов */
        .nhud-input, .nhud-textarea, .nhud-select, .nhud-char-card, .nhud-settings-tracker-row, .nhud-accordion-char-edit, .nhud-stats-box {
            background-color: ${inputBg} !important;
            border-color: var(--nhud-border) !important;
            color: var(--nhud-text-main) !important;
        }
        
        .nhud-divider { background: var(--nhud-border) !important; }
        #nhud-top-bar, #nhud-settings-header, #nhud-global-settings > div:first-child, #nhud-mini-sims-header, #nhud-mini-conn-header { 
            background: linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8)) !important; 
            border-bottom: 1px solid var(--nhud-border) !important;
        }
        
        #nhud-api-status, .nhud-section-hint { color: var(--nhud-text-muted) !important; }
        #nhud-datetime-bar, #nhud-settings-header span { color: var(--nhud-text-main) !important; }
        
        ${d.customCss || ''}

        /* --- МОБИЛЬНАЯ АДАПТАЦИЯ И УЗКИЕ ЭКРАНЫ --- */
        @media screen and (max-width: 1000px) {
            #narrative-hud-sidebar {
                width: 100% !important; 
                max-width: 100vw !important;
                left: 0 !important;
                right: 0 !important;
                border-left: none !important;
                z-index: 10001 !important;
            }
            /* Жестко центрируем вообще ВСЕ всплывающие окна */
            #nhud-infoblock-popup, #nhud-analytics-popup, #nhud-rel-journal, #nhud-mini-sims, #nhud-mini-conn, #nhud-smart-cleaner-modal {
                position: fixed !important;
                left: 2vw !important;
                width: 96vw !important;
                top: 5vh !important;
                max-height: 90vh !important;
                transform: none !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                z-index: 10005 !important;
            }
            #nhud-analytics-canvas { width: 100% !important; height: auto !important; }
            #nhud-widget { transform: scale(1.2); }
            #nhud-global-settings { width: 100vw !important; left: 0 !important; border-radius: 0 !important; z-index: 2147483647 !important; }
            #nhud-settings-panel { width: 100% !important; max-width: 100vw !important; left: 0 !important; border-right: none !important; z-index: 10001 !important; }
            .nhud-settings-tracker-row, .nhud-prompt-block-header { flex-wrap: wrap !important; }
            .nhud-s-label, .nhud-pb-label { min-width: 100px !important; flex: 1 1 100% !important; }
            .nhud-tab-text { display: none !important; }
        }
    `;

        // Обновляем или создаем тег <style>
    let styleTag = document.getElementById("nhud-dynamic-theme");
    if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "nhud-dynamic-theme";
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = cssText;
}
// ─── МИНИ-ОКНА (СИМС И ПОДКЛЮЧЕНИЕ) ─────────────────────────────────────

export function toggleMiniSims() {
    let popup = $("#nhud-mini-sims");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-mini-sims" style="display:none; position:fixed; top:150px; left:100px; width:340px; min-width:260px; height:450px; min-height:200px; z-index:9993; background:#151220; border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 5px 20px rgba(0,0,0,0.9); flex-direction:column; resize:both; overflow:hidden;">
                <div id="nhud-mini-sims-header" style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8)); padding:8px 10px; border-bottom:1px solid var(--nhud-border, #4a1525); cursor:grab; flex-shrink:0;">
                    <span style="font-weight:bold; color:var(--nhud-text-main, #e0c0c0); font-size:13px;">❤️ Отношения (Трекер отношений)</span>
                    <button id="nhud-mini-sims-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:0; font-size:16px;">✕</button>
                </div>
                <div id="nhud-mini-sims-content" style="flex:1; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.2);"></div>
            </div>
        `);
        // Делаем перетаскиваемым за шапку
        makeWindowDraggable("nhud-mini-sims", "nhud-mini-sims-header");
        $("#nhud-mini-sims-close").on("click", () => $("#nhud-mini-sims").fadeOut(150));
        popup = $("#nhud-mini-sims");
    }
    
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderMiniSims(); popup.fadeIn(150); }
}

export function renderMiniSims() {
    const popup = $("#nhud-mini-sims-content");
    if (!popup.length) return;
    
    popup.empty();
    const live = getLive();
    const settings = getSettings();
    const relSettings = settings.relationshipSettings;
    const userName = getUserName();
    const charNames = Object.keys(live.characters).filter(name => 
        name.toLowerCase() !== userName.toLowerCase() && !name.toLowerCase().includes('system') && !live.characters[name].ignoreRelationship
    );

    if (!charNames.length) {
        popup.append('<div style="color:var(--nhud-text-muted); font-size:12px; text-align:center; margin-top:20px;">В этом чате пока нет персонажей</div>');
        return;
    }

    charNames.forEach(name => {
        const char = live.characters[name];
        const relVal = char.relationship !== undefined ? char.relationship : 50;
        const status = char.relationship_status || "";
        const thoughts = char.relationship_thoughts || "";
        const hint = char.relationship_hint || "";
        
        const globalChar = settings.characters.find(c => c.name?.toLowerCase() === name.toLowerCase()) || {};
        const avatarHtml = globalChar.avatar 
            ? `<img src="${globalChar.avatar}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"/>`
            : `<div style="width:100%;height:100%;background:#1a1628;color:#6060a0;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;">${name[0].toUpperCase()}</div>`;

        let barColor = "#a090c0"; 
        if (relVal < 30) barColor = "#e05252"; 
        else if (relVal < 45) barColor = "#e0a352"; 
        else if (relVal >= 80) barColor = "#e052a8"; 
        else if (relVal >= 60) barColor = "#52e0a3"; 

        const card = $(`
            <div style="display:flex; flex-direction:column; gap:8px; background:rgba(255,255,255,0.03); padding:10px; border-radius:6px; border:1px solid #3a3050;">
                <div style="display:flex; gap:10px; align-items:flex-start;">
                    <div style="width:48px; height:48px; border-radius:6px; overflow:hidden; border:1px solid #4a4060; flex-shrink:0;">
                        ${avatarHtml}
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <span style="font-weight:bold; color:#e0d0a0; font-size:0.95em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</span>
                            <div style="display:flex; gap:4px; align-items:center;">
                                ${getSettings().modules.analytics !== false ? `<button class="nhud-m-rel-journal-btn" data-name="${name}" title="Открыть журнал связей" style="background:none; border:none; cursor:pointer; font-size:14px; padding:0 4px; transition:0.2s;">📜</button>` : ''}
                                <input class="nhud-input nhud-m-rel-status" value="${status}" style="width:110px; padding:2px 4px; font-size:0.8em; text-align:right; color:#c0b0a0; border-color:#4a3030;" placeholder="Статус..." />
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="flex:1; height:8px; background:#1a1628; border-radius:4px; overflow:hidden; border:1px solid #2a2040;">
                                <div class="nhud-m-rel-bar" style="width:${relVal}%; height:100%; background:${barColor}; transition:0.3s;"></div>
                            </div>
                            <input class="nhud-input nhud-m-rel-val" type="number" min="0" max="100" value="${relVal}" style="width:45px; padding:2px; font-size:0.8em; text-align:center;" />
                        </div>
                    </div>
                </div>
                
                <div>
                    <div style="font-size:0.7em; color:#52a8e0; text-transform:uppercase; margin-bottom:4px; font-weight:bold;">💭 Отношение к тебе</div>
                    <textarea class="nhud-textarea nhud-m-rel-thoughts" rows="2" style="font-size:0.8em; padding:6px; border-color:#203050; color:#a0c0e0; resize:vertical;" placeholder="Что персонаж думает о тебе...">${thoughts}</textarea>
                </div>
                
                ${relSettings.hintsEnabled ? `
                <div style="margin-top:4px;">
                    <div style="font-size:0.7em; color:#d0d0a0; text-transform:uppercase; margin-bottom:4px; font-weight:bold;">💡 Цель / Подсказка</div>
                    <textarea class="nhud-textarea nhud-m-rel-hint" rows="2" style="font-size:0.8em; padding:6px; border-color:#606040; color:#e0e0b0; background:#202015; resize:vertical;" placeholder="Возможное действие...">${hint}</textarea>
                </div>` : ''}
            </div>
        `);

        // ОБРАБОТЧИК КНОПКИ ЖУРНАЛА
        card.find('.nhud-m-rel-journal-btn').on('click', function(e) {
            e.stopPropagation();
            if (typeof openRelationshipJournal === 'function') {
                openRelationshipJournal($(this).data('name'));
            }
        });

        // Двухсторонняя привязка
        card.find('.nhud-m-rel-val').on('input', e => {
            const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), 100);
            live.characters[name].relationship = val;
            card.find('.nhud-m-rel-bar').css('width', val + '%');
            saveSettingsDebounced(); renderRelationships(); renderSettingsTrackers();
        });
        card.find('.nhud-m-rel-status').on('input', e => {
            live.characters[name].relationship_status = e.target.value; saveSettingsDebounced(); renderSettingsTrackers();
        });
        card.find('.nhud-m-rel-thoughts').on('input', e => {
            live.characters[name].relationship_thoughts = e.target.value; saveSettingsDebounced(); renderSettingsTrackers();
        });
        card.find('.nhud-m-rel-hint').on('input', e => {
            live.characters[name].relationship_hint = e.target.value; saveSettingsDebounced(); renderSettingsTrackers();
        });

        popup.append(card);
    });
}

export function toggleMiniConn() {
    let popup = $("#nhud-mini-conn");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-mini-conn" style="display:none; position:fixed; top:200px; left:100px; width:220px; z-index:9993; background:#151220; border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 5px 20px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-mini-conn-header" style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8)); padding:8px 10px; border-bottom:1px solid var(--nhud-border, #4a1525); cursor:grab;">
                    <span style="font-weight:bold; color:var(--nhud-text-main, #e0c0c0); font-size:12px;">🔌 Подключение</span>
                    <button id="nhud-mini-conn-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); cursor:pointer; padding:0; font-size:14px;">✕</button>
                </div>
                <div id="nhud-mini-conn-content" style="padding:15px 10px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.2);">
                    <select id="nhud-mc-profile" class="nhud-select" style="width:100%; font-size:12px; padding:6px; background:#1a0a10; border:1px solid var(--nhud-border); color:var(--nhud-text-main);"></select>
                    <button id="nhud-mc-send" class="nhud-send-btn" style="width:100%; padding:8px; background:rgba(60, 20, 30, 0.4); border:1px solid var(--nhud-border); color:var(--nhud-text-main); border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px; transition:0.2s;">▶ Обновить статы</button>
                </div>
            </div>
        `);
        // Делаем перетаскиваемым
        makeWindowDraggable("nhud-mini-conn", "nhud-mini-conn-header");
        $("#nhud-mini-conn-close").on("click", () => $("#nhud-mini-conn").fadeOut(150));
        
        $("#nhud-mc-profile").on("change", function() {
            const settings = getSettings();
            const val = $(this).val();
            settings.activeProfile = val === "__quiet__" ? null : val;
            settings.useSTProfile = val !== "__quiet__";
            saveSettingsDebounced(); 
            renderProfileSelect(); // Синхронизирует с основным HUD
        });

        // Импортируем функцию sendToAPI для работы кнопки отправки
        $("#nhud-mc-send").on("click", () => {
            import('../index.js').then(m => m.sendToAPI(true)).catch(e => console.error(e));
        });

        popup = $("#nhud-mini-conn");
    }
    
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderMiniConn(); popup.fadeIn(150); }
}

export function renderMiniConn() {
    const popup = $("#nhud-mini-conn");
    if (!popup.length) return;
    
    const settings = getSettings();
    const sel = $("#nhud-mc-profile");
    sel.empty();
    
    if (settings.requestSettings?.lightMode) {
        sel.append('<option value="__quiet__" disabled>❌ ST (Лайт активен)</option>');
    } else {
        sel.append(`<option value="__quiet__" ${!settings.useSTProfile ? 'selected' : ''}>🔄 Подключение ST</option>`);
    }
    
    try {
        getSTProfiles().forEach(p => {
            const selected = settings.useSTProfile && settings.activeProfile === p.name ? 'selected' : '';
            const shortName = p.name.length > 20 ? p.name.substring(0, 20) + '…' : p.name;
            sel.append(`<option value="${p.name}" ${selected}>${shortName}</option>`);
        });
    } catch (e) {
        console.warn("[Narrative HUD] Не удалось загрузить профили:", e);
    }
}

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
            // ФИКС: Высчитываем реальный индекс в массиве, чтобы удалять именно то, что нужно
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

        // ФИКС: Обработчик удаления
        content.find('.nhud-del-rel-event').on('click', function(e) {
            e.stopPropagation();
            if(!confirm("Удалить это событие из истории? График перерисуется.")) return;
            const idxToRemove = parseInt($(this).data('idx'));
            history.splice(idxToRemove, 1);
            getSettings().liveData.relHistory[charName] = history;
            saveSettingsDebounced();
            openRelationshipJournal(charName); // Обновляем журнал
            if ($("#nhud-analytics-popup").is(":visible")) {
                renderAnalyticsChart(charName); // Обновляем график на лету!
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
    
    // Ищем только тех, у кого есть записи в истории
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
    
    ctx.clearRect(0, 0, w, h); // Очищаем холст
    
    if (history.length === 0) {
        $("#nhud-analytics-empty").css("display", "flex");
        return;
    }
    $("#nhud-analytics-empty").hide();

    // 1. Подготавливаем данные
    const points = [];
    const firstEntry = history[0];
    // Добавляем стартовую точку (каким отношение было ДО первого изменения)
    points.push({ val: firstEntry.val - firstEntry.delta, label: "Старт" }); 
    history.forEach((entry, i) => {
        // Подпись оси X: номер сообщения или просто шаг
        points.push({ val: entry.val, label: "#" + entry.messageId });
    });

    // 2. Настройки сетки
    ctx.strokeStyle = "#1a2530"; // Цвет линий сетки
    ctx.lineWidth = 1;
    ctx.fillStyle = "#607080";   // Цвет текста осей
    ctx.font = "11px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const padL = 35, padR = 20, padT = 20, padB = 30;
    const graphW = w - padL - padR;
    const graphH = h - padT - padB;

    // 3. Рисуем горизонтальную сетку (Ось Y: 0, 25, 50, 75, 100)
    [0, 25, 50, 75, 100].forEach(val => {
        const y = padT + graphH - (val / 100) * graphH;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
        ctx.fillText(val, padL - 8, y);
    });

    // 4. Вычисляем координаты точек для графика
    const stepX = points.length > 1 ? graphW / (points.length - 1) : graphW / 2;
    const coords = points.map((p, i) => ({
        x: padL + i * stepX,
        y: padT + graphH - (p.val / 100) * graphH,
        label: p.label,
        val: p.val
    }));

    // 5. Рисуем красивую заливку под линией (Градиент)
    if (coords.length > 1) {
        const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
        grad.addColorStop(0, "rgba(82, 168, 224, 0.4)"); // Сверху ярче
        grad.addColorStop(1, "rgba(82, 168, 224, 0.0)"); // Снизу прозрачно
        
        ctx.beginPath();
        ctx.moveTo(coords[0].x, padT + graphH); // Начинаем снизу
        coords.forEach(c => ctx.lineTo(c.x, c.y)); // Ведем по точкам
        ctx.lineTo(coords[coords.length-1].x, padT + graphH); // Опускаем вниз
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
    }

    // 6. Рисуем саму линию графика
    if (coords.length > 1) {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#52a8e0"; // Неоново-синий цвет линии
        ctx.lineJoin = "round";
        coords.forEach((c, i) => {
            if (i === 0) ctx.moveTo(c.x, c.y);
            else ctx.lineTo(c.x, c.y);
        });
        ctx.stroke();
    }

    // 7. Рисуем точки (узлы) и подписи оси X
    coords.forEach((c, i) => {
        // Узелок
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#151220";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#e0e0e0";
        ctx.stroke();

        // Цифра значения над точкой
        ctx.fillStyle = "#e0e0e0";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(c.val, c.x, c.y - 8);

        // Подпись оси X снизу
        ctx.fillStyle = "#8080a0";
        ctx.textBaseline = "top";
        ctx.fillText(c.label, c.x, padT + graphH + 8);
    });
}

export function openSmartCleaner() {
    const chatId = NarrativeStorage.getCurrentChatId();
    const settings = getSettings();
    const chatData = settings.chatData[chatId] || {};
    
    // Вычисляем только "живые" (активные) свайпы для текущего чата
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
    
    // Генерируем список всех папок-чатов для удаления
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
    
    // Обработчик удаления папок (чатов)
    html.find(".nhud-sc-del-chat").on("click", function() {
        const id = $(this).data("chat");
        if (!confirm(`Удалить все данные чата из хранилища мода?\nID: ${id}`)) return;
        NarrativeStorage.deleteChat(id);
        $(this).closest(".nhud-sc-chat-row").fadeOut(150, function() { $(this).remove(); });
        toastr.success("Папка чата удалена из базы!");
        renderStorageStats();
        renderSettingsCharacterAccordion(); // Обновляем и вкладку персонажей
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

// ─── ИНТЕРАКТИВНОЕ ОБУЧЕНИЕ (ONBOARDING TOUR) ───────────────────────────

export function startInteractiveTour() {
    if (typeof closeGlobalSettings === 'function') closeGlobalSettings();
    if (typeof closeSettingsPanel === 'function') closeSettingsPanel();
    
    const sidebar = $("#narrative-hud-sidebar");
    if (!sidebar.is(":visible")) sidebar.fadeIn(200);

    const steps = [
        // --- ПРАВАЯ ПАНЕЛЬ ---
        { 
            target: "#narrative-hud-sidebar", title: "Главная панель (HUD)", 
            text: "Здесь отображается вся игровая информация в реальном времени. Панель можно скрыть крестиком сверху.",
            action: () => { if (!$("#narrative-hud-sidebar").is(":visible")) $("#narrative-hud-sidebar").fadeIn(200); }
        },
        { 
            target: "#nhud-toggle-widget-btn", parent: true, title: "Управление", 
            text: "Эти кнопки скрывают плавающий кубик (🧊), обновляют статы вручную (▶) и открывают левую панель настроек (⚙️)." 
        },
        { 
            target: "#nhud-trackers-section", title: "Трекеры", 
            text: "Ваши физиологические показатели: Здоровье, Сытость, Усталость и прочее." 
        },
        { 
            target: "#nhud-infoblock-buttons", title: "Инфоблоки (Кнопки)", 
            text: "Нажмите на любую из этих кнопок, чтобы открыть всплывающее окно с дополнительным лором: мыслями, комментариями и т.д." 
        },
        { 
            target: "#nhud-characters-section", title: "Персонажи", 
            text: "Здесь видно всех персонажей в текущей сцене, их одежду, настроение и текущие мысли." // Отношения убрали!
        },
        // --- ЛЕВАЯ ПАНЕЛЬ ---
        { 
            target: "#nhud-settings-panel", title: "Левая панель (Настройки)", 
            text: "Здесь находится 'мозг' расширения. На первой вкладке вы создаете трекеры и настраиваете Отношения.",
            action: () => { 
                if (typeof openSettingsPanel === 'function') openSettingsPanel();
                $('.nhud-tab[data-tab="trackers"]').click();
            }
        },
        { 
            target: "#nhud-settings-rel-container", title: "Отношения (Статусы и Журнал)", 
            text: "Кнопка 'Статусы' (🏷️) задает список статусов (например: Друг, Враг, Коллега). ИИ строго использует их для оценки отношений! А иконка свитка (📜) у персонажа открывает Журнал связей — историю событий и причин изменения симпатии." 
        },
        { 
            target: "#nhud-open-analytics-btn", title: "Аналитика", 
            text: "Нажмите сюда, чтобы построить наглядный график динамики отношений с персонажем." 
        },
        { 
            target: ".nhud-tab-content[data-tab='characters']", title: "Персонажи (Папки и Аватарки)", 
            text: "В этой вкладке лежат все ваши персонажи, расфасованные по папкам-чатам. Здесь вы можете загружать им собственные аватарки, менять имена или удалять лишних!",
            action: () => { $('.nhud-tab[data-tab="characters"]').click(); }
        },
        { 
            target: ".nhud-tab-content[data-tab='connection']", title: "Режимы отправки (Подключение)", 
            text: "Очень важный раздел! Здесь мы выбираем профиль API.\n⚡ 'Лайт-режим' — делает тихий фоновый запрос после ответа бота (экономит контекст).\n🔄 'Авто-отправка' — дергает ИИ обычным запросом.\n📦 'Вшивать в пресет' — склеивает ваш лор и запрос мода в один тяжелый, но надежный системный промпт.",
            action: () => { $('.nhud-tab[data-tab="connection"]').click(); }
        },
        { 
            target: ".nhud-tab-content[data-tab='prompts']", title: "Вкладка Промптов", 
            text: "Редактируйте инструкции для ИИ и создавайте свои инфоблоки. Каждый новый блок появится как кнопка на правой панели.",
            action: () => { $('.nhud-tab[data-tab="prompts"]').click(); }
        },
        { 
            target: ".nhud-tab-content[data-tab='storage']", title: "База Данных", 
            text: "Если чат стал огромным, зайдите сюда и запустите 'Умную очистку', чтобы удалить старую историю.",
            action: () => { $('.nhud-tab[data-tab="storage"]').click(); }
        },
        // --- ГЛОБАЛЬНЫЕ НАСТРОЙКИ ---
        { 
            target: "#nhud-global-settings", title: "Глобальные настройки", 
            text: "Это центральное окно. На вкладке 'Внешний вид' можно изменить цвета панелей, прозрачность окон и шрифты.",
            action: () => { 
                if (typeof closeSettingsPanel === 'function') closeSettingsPanel();
                if (typeof openGlobalSettings === 'function') openGlobalSettings();
                $('.nhud-g-tab[data-tab="visuals"]').click();
            }
        },
        { 
            target: ".nhud-g-tab-content[data-tab='system']", title: "Система и Токены", 
            text: "Отключайте ненужные модули, чтобы ИИ на них не отвлекался! Калькулятор внизу подскажет примерный расход токенов. На этом обучение окончено! 🎉",
            action: () => { $('.nhud-g-tab[data-tab="system"]').click(); }
        }
    ];

    let currentStep = 0;

    $("body").append(`
        <div id="nhud-tour-overlay" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); z-index:10005; pointer-events:none; backdrop-filter:blur(2px);"></div>
        <div id="nhud-tour-highlight" style="position:fixed; border:3px solid #52a8e0; border-radius:6px; box-shadow:0 0 20px rgba(82,168,224,0.6), inset 0 0 10px rgba(82,168,224,0.2); z-index:10006; pointer-events:none; transition:all 0.4s ease-in-out;"></div>
        <div id="nhud-tour-tooltip" style="position:fixed; width:280px; background:#151220; border:1px solid #52a8e0; border-radius:8px; padding:15px; z-index:10007; box-shadow:0 10px 30px rgba(0,0,0,0.9); transition:all 0.4s ease-in-out; display:flex; flex-direction:column; gap:10px; opacity:0;">
            <div id="nhud-tour-title" style="font-weight:bold; color:#e0c0c0; font-size:15px;"></div>
            <div id="nhud-tour-text" style="color:#a08080; font-size:13px; line-height:1.4;"></div>
            <div style="display:flex; justify-content:space-between; margin-top:5px;">
                <button id="nhud-tour-close" style="background:none; border:1px solid #5a2035; color:#d05070; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; transition:0.2s;">✕ Закрыть</button>
                <button id="nhud-tour-next" style="background:#2a4060; border:1px solid #52a8e0; color:#80b0e0; padding:5px 15px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px; transition:0.2s;">Далее ➔</button>
            </div>
        </div>
    `);

    function showStep(index) {
        if (index >= steps.length) { endTour(); return; }
        const step = steps[index];
        
        // 1. Выполняем действие (переключаем вкладки/окна)
        if (step.action) step.action();

        // 2. Ждем, пока интерфейс перерисуется, и ищем элемент
        setTimeout(() => {
            let target = $(step.target);
            if (step.parent) target = target.parent();

            // Если кнопка скрыта (например, отключена аналитика), пропускаем шаг
            if (!target.length || !target.is(":visible")) {
                showStep(index + 1);
                return;
            }

            const rect = target[0].getBoundingClientRect();
            
            $("#nhud-tour-highlight").css({
                top: rect.top - 5 + "px",
                left: rect.left - 5 + "px",
                width: rect.width + 10 + "px",
                height: rect.height + 10 + "px"
            });

            $("#nhud-tour-title").text(step.title);
            $("#nhud-tour-text").text(step.text);
            
            if (index === steps.length - 1) {
                $("#nhud-tour-next").text("Завершить ✔️").css({background: "#2a5030", borderColor: "#52e0a3", color: "#80e0b0"});
            }

            // Умное позиционирование!
            let ttTop = rect.bottom + 15;
            let ttLeft = rect.left + (rect.width / 2) - 140;

            // Если панель во весь экран, ставим тултип внутри неё сверху
            if (rect.height > window.innerHeight * 0.5) {
                ttTop = Math.max(20, rect.top + window.innerHeight * 0.15);
            } else if (ttTop + 150 > window.innerHeight) {
                ttTop = rect.top - 160; // Ставим НАД элементом, если не влезает снизу
            }

            // Жесткие ограничители, чтобы окно никогда не улетало за экран
            if (ttTop < 10) ttTop = 10;
            if (ttLeft < 10) ttLeft = 10;
            if (ttLeft + 280 > window.innerWidth) ttLeft = window.innerWidth - 290;

            $("#nhud-tour-tooltip").css({ top: ttTop + "px", left: ttLeft + "px", opacity: 1 });
            currentStep = index;
        }, 150);
    }

    function endTour() {
        $("#nhud-tour-overlay, #nhud-tour-highlight, #nhud-tour-tooltip").fadeOut(300, function() { $(this).remove(); });
    }

    $("#nhud-tour-close").hover(
        function() { $(this).css("background", "rgba(90, 32, 53, 0.3)"); },
        function() { $(this).css("background", "none"); }
    ).on("click", endTour);

    $("#nhud-tour-next").hover(
        function() { $(this).css("background", "rgba(82, 168, 224, 0.3)"); },
        function() { $(this).css("background", "#2a4060"); }
    ).on("click", () => showStep(currentStep + 1));

    showStep(0);
}
