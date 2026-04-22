// ui/SettingsUI.js
import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../../script.js";
import { extensionName } from "../core/constants.js";
import { NarrativeStorage } from "../storage/NarrativeStorage.js";
import { getUserName, parseJsonFromMessage, getSTProfiles } from "../utils/helpers.js";
import { getSettings, getLive, getChatTrackers, updateGlobalAvatar } from "../core/StateManager.js";
import { openRelationshipJournal, openAnalyticsPopup, openSmartCleaner } from "./Modals.js";
import { updateHistoryButtons } from "./MessageActions.js";
import { renderTrackers, renderRelationships, renderCharacters, renderInfoBlockButtons, renderProfileSelect, applyDesignTheme, renderMiniSims } from "./UIManager.js";
import { renderSettingsFactions } from "./FactionSettings.js";
import { renderSettingsHeroSheet } from "./HeroSettings.js";
import { renderSettingsQuests } from "./QuestSettings.js";
import { renderSettingsCodex } from "./CodexSettings.js";
import { renderSettingsCalendar } from "./CalendarSettings.js";

export function updateSettingsPosition() {
    const chatEl = document.getElementById("chat");
    const panel = $("#nhud-settings-panel");
    if (!panel.length) return;

    // Встраиваем ползунок и кнопку, если их еще нет
    if (!$("#nhud-left-resize-handle").length) {
        initLeftPanelResize();
    }

    const topOffset = $('#top-bar').outerHeight() || 40; // Отступ от шапки ST
    
    import('../core/StateManager.js').then(m => {
        const settings = m.getSettings();
        if (!settings.ui) settings.ui = {};
        const mode = settings.ui.leftMode || "chat"; 
        const handle = $("#nhud-left-resize-handle");

        if (panel.is(":visible")) {
            panel.css({ top: topOffset + "px" });
            
            if (window.innerWidth <= 768) {
                panel.css({ width: "100%" });
                handle.hide();
            } else {
                if (mode === "screen") {
                    // Режим 1: Ручная ширина (с ползунком)
                    const w = settings.ui.leftWidth || 300;
                    panel.css({ width: w + "px" });
                    handle.show();
                    $("#nhud-left-mode-toggle").html("◨").attr("title", "Привязать к границе чата");
                } else {
                    // Режим 2: Привязка к границе чата
                    if (chatEl) {
                        const rect = chatEl.getBoundingClientRect();
                        panel.css({ width: Math.max(250, rect.left) + "px" });
                    }
                    handle.hide();
                    $("#nhud-left-mode-toggle").html("◧").attr("title", "Ручная ширина");
                }
            }
        }
    });
}

// Новая функция, которая добавляет логику перетаскивания и переключения
function initLeftPanelResize() {
    const panel = $("#nhud-settings-panel");
    
    // Добавляем кнопку переключения (в правый верхний угол, левее крестика закрытия)
    panel.append('<button id="nhud-left-mode-toggle" class="nhud-left-mode-toggle">◧</button>');
    // Добавляем ползунок изменения ширины на правую границу
    panel.append('<div id="nhud-left-resize-handle" class="nhud-left-resize-handle"></div>');

    // Клик по кнопке переключения
    $("#nhud-left-mode-toggle").on("click", () => {
        import('../core/StateManager.js').then(m => {
            const settings = m.getSettings();
            if (!settings.ui) settings.ui = {};
            settings.ui.leftMode = settings.ui.leftMode === "screen" ? "chat" : "screen";
            import('../../../../../script.js').then(sc => sc.saveSettingsDebounced()); 
            updateSettingsPosition();
        });
    });

    // Логика перетаскивания (ресайза)
    let isResizing = false, startX, startWidth;

    $("#nhud-left-resize-handle").on("mousedown", function(e) {
        import('../core/StateManager.js').then(m => {
            if (m.getSettings().ui?.leftMode === "chat") return;
            isResizing = true; 
            startX = e.clientX; 
            startWidth = panel.width();
            $("body").css("user-select", "none"); 
            e.preventDefault();
        });
    });
    
    $(document).on("mousemove.nhudleftresize", function(e) {
        if (!isResizing) return;
        const newWidth = startWidth + (e.clientX - startX); // Тянем вправо - увеличиваем
        const finalWidth = Math.min(Math.max(220, newWidth), window.innerWidth / 1.5);
        panel.css("width", finalWidth + "px");
    });
    
    $(document).on("mouseup.nhudleftresize", () => {
        if (isResizing) { 
            isResizing = false; 
            $("body").css("user-select", ""); 
            import('../core/StateManager.js').then(m => {
                m.getSettings().ui.leftWidth = panel.width();
                import('../../../../../script.js').then(sc => sc.saveSettingsDebounced()); 
            });
        }
    });

    // Следим за ресайзом окна чата, чтобы панель адаптировалась
    const chatObserver = new ResizeObserver(() => { 
        import('../core/StateManager.js').then(m => {
            if (m.getSettings().ui?.leftMode !== "screen") updateSettingsPosition(); 
        });
    });
    const chatEl = document.getElementById("chat");
    if (chatEl) chatObserver.observe(chatEl);
}

export function openSettingsPanel() {
    if (!$("#nhud-settings-panel").length) buildSettingsPanel();
    else {
        renderSettingsTrackers(); 
        renderSettingsCharacterAccordion();
        renderSettingsProfileSelect(); 
        renderSettingsPrompts(); 
        renderPromptBlocks();
        renderParserSettings();
        renderSettingsFactions();
        renderSettingsHeroSheet();
    }
    updateSettingsPosition();
    // FIX: явно задаём display: flex перед fade, чтобы flex-свойства работали
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

        <div id="nhud-settings-panel" class="nhud-settings-panel">
            <div id="nhud-settings-header" class="nhud-settings-header">
                <span class="nhud-settings-header-title">⚔️ Narrative HUD</span>
                <button id="nhud-settings-close" class="nhud-settings-close-btn">✕</button>
            </div>
            
            <div id="nhud-settings-body" class="nhud-settings-body">
                
                <div id="nhud-settings-tabs" class="nhud-settings-tabs">
                    <button class="nhud-tab active" data-tab="trackers" title="Трекеры">📊 <span class="nhud-tab-text">Трекеры</span></button>
                    <button class="nhud-tab" data-tab="property" title="Имущество">🎒 <span class="nhud-tab-text">Имущество</span></button>
                    <button class="nhud-tab" data-tab="journal" title="Журнал">📜 <span class="nhud-tab-text">Журнал</span></button>
                    <button class="nhud-tab" data-tab="halloffame" title="Зал Славы">🏆 <span class="nhud-tab-text">Зал Славы</span></button>
                    <button class="nhud-tab" data-tab="characters" title="Персонажи">👥 <span class="nhud-tab-text">Перс.</span></button>
                    <button class="nhud-tab" data-tab="prompts" title="Промты">📝 <span class="nhud-tab-text">Промты</span></button>
                    <button class="nhud-tab" data-tab="api" title="API и JSON">🔌 <span class="nhud-tab-text">API</span></button>
                    <button class="nhud-tab" data-tab="storage" title="База Данных">🗄️ <span class="nhud-tab-text">База</span></button>
                </div>
                
                <div id="nhud-settings-content" class="nhud-settings-content">

                    <div class="nhud-tab-content active-tab" data-tab="trackers">
                        <div id="nhud-settings-rel-container-placeholder" class="nhud-rel-container-placeholder"></div>
                        <details class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-factions">🏴‍☠️ Отношения с фракциями</summary>
                            <div id="nhud-settings-factions-list" style="margin-top:10px;"></div>
                        </details>
                        <details class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-hero">🧬 Статы Героя</summary>
                            <div id="nhud-settings-hero-sheet" style="margin-top:10px;"></div>
                        </details>
                    </div>

                    <div class="nhud-tab-content" data-tab="property">
                        <details open class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-trackers">📉 Основные трекеры (Здоровье, Мана...)</summary>
                            <div class="nhud-section-hint" style="margin-top:10px;">Название · ID (для JSON) · Макс · Цвет</div>
                            <div id="nhud-settings-tracker-list"></div>
                            <button id="nhud-add-tracker" class="nhud-add-btn">+ Добавить трекер</button>
                        </details>

                        <details class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-estate">🏠 Недвижимость</summary>
                            <div id="nhud-settings-estate-list" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
                            <button id="nhud-add-estate" class="nhud-add-btn">+ Добавить недвижимость</button>
                        </details>

                        <details class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-vehicles">🚗 Транспорт</summary>
                            <div id="nhud-settings-vehicles-list" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
                            <button id="nhud-add-vehicle" class="nhud-add-btn">+ Добавить транспорт</button>
                        </details>

                        <details class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-outfit">👗 Гардероб персонажей</summary>
                            <div id="nhud-settings-outfit-list" style="margin-top:10px;"></div>
                        </details>

                        <details open class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-player-outfit">
                                👤 Мой наряд (Гардероб Игрока)
                                <span id="nhud-player-outfit-eye" class="nhud-player-outfit-eye" title="Включить/выключить инъекцию в промпт">👁️</span>
                            </summary>
                            <div style="margin-top:8px;">
                                <div class="nhud-player-outfit-hint">Этот текст будет виден ИИ (read-only). ИИ НЕ будет его менять.</div>
                                <textarea id="nhud-player-outfit-text" class="nhud-textarea nhud-player-outfit-textarea" rows="3" placeholder="Опиши свой наряд... Например: Джинсы, черная водолазка, кожаная куртка, кроссовки."></textarea>
                            </div>
                        </details>

                        <details class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-player-inv">🎒 Инвентарь Игрока</summary>
                            <div class="nhud-money-row">
                                <input id="nhud-settings-money" type="number" class="nhud-input nhud-money-input player" placeholder="0" />
                                <input id="nhud-settings-currency" type="text" class="nhud-input nhud-currency-input" placeholder="Валюта" />
                            </div>
                            <div id="nhud-settings-player-inv-list" style="margin-top:6px;"></div>
                            <div class="nhud-add-item-row">
                                <input id="nhud-add-player-inv-input" type="text" class="nhud-input" style="flex:1;" placeholder="Название предмета" />
                                <button id="nhud-add-player-inv-btn" class="nhud-add-btn" style="width:auto; padding:4px 10px;">+</button>
                            </div>
                        </details>

                        <details class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-bot-inv">🤖 Инвентарь Бота</summary>
                            <div class="nhud-money-row">
                                <input id="nhud-settings-bot-money" type="number" class="nhud-input nhud-money-input bot" placeholder="0" />
                                <input id="nhud-settings-bot-currency" type="text" class="nhud-input nhud-currency-input" placeholder="Валюта" />
                            </div>
                            <div id="nhud-settings-bot-inv-list" style="margin-top:6px;"></div>
                            <div class="nhud-add-item-row">
                                <input id="nhud-add-bot-inv-input" type="text" class="nhud-input" style="flex:1;" placeholder="Название предмета" />
                                <button id="nhud-add-bot-inv-btn" class="nhud-add-btn" style="width:auto; padding:4px 10px;">+</button>
                            </div>
                        </details>
                    </div>

                    <div class="nhud-tab-content" data-tab="journal">
                        <details open class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-quests">📜 Квесты</summary>
                            <div id="nhud-settings-quests-list" style="margin-top:10px;"></div>
                        </details>
                        <details open class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-codex">📖 Сюжетный Кодекс</summary>
                            <div id="nhud-settings-codex-list" style="margin-top:10px;"></div>
                        </details>
                        <details open class="nhud-details-card">
                            <summary class="nhud-acc-header nhud-acc-header-calendar">📅 Календарь событий</summary>
                            <div id="nhud-settings-calendar-wrap" style="margin-top:10px;"></div>
                        </details>
                    </div>

                    <div class="nhud-tab-content" data-tab="halloffame">
                        <div class="nhud-hof-header">
                            <h3 class="nhud-hof-title">🏆 Зал Славы</h3>
                            <div class="nhud-hof-desc">Здесь хранятся ваши великие (и не очень) свершения</div>
                        </div>
                        <div id="nhud-hall-of-fame-list" style="display:flex; flex-direction:column; gap:10px;"></div>
                    </div>

                    <div class="nhud-tab-content" data-tab="characters">
                        <div class="nhud-characters-hint">Нажми на чат чтобы раскрыть персонажей. Аватарки сохраняются глобально.</div>
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
                        <div class="nhud-field-group nhud-checkbox-group" style="margin-top: 10px; background: rgba(82, 168, 224, 0.05); padding: 8px; border-radius: 4px; border: 1px solid rgba(82, 168, 224, 0.2); flex-direction: column; align-items: flex-start; gap: 8px;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <input id="nhud-module-comics" type="checkbox" />
                                <label for="nhud-module-comics" style="color:#52a8e0; font-weight:bold; cursor:pointer;">📸 Запрашивать промпты для картинки (Comics)</label>
                            </div>
                            
                            <div id="nhud-comics-prompt-container" style="width: 100%; display: none;">
                                <div class="nhud-section-hint" style="margin-bottom: 4px;">Инструкция для ИИ (стиль, язык, структура тегов):</div>
                                <textarea id="nhud-comics-prompt" class="nhud-textarea" rows="4" placeholder="VISUAL PROMPT RULE: If the scene has a vivid cinematic moment..."></textarea>
                            </div>
                        </div>
                        <div style="border-top:1px solid var(--nhud-border);padding-top:12px;margin-top:4px;">
                            <div class="nhud-section-hint">Блоки промтов — каждый блок это отдельное поле в JSON ответе:</div>
                            <div id="nhud-prompt-blocks-list"></div>
                            <button id="nhud-add-prompt-block" class="nhud-add-btn">+ Добавить блок</button>
                            <div style="height: 60px; width: 100%; flex-shrink: 0;"></div>
                        </div>
                    </div>

                    <div class="nhud-tab-content" data-tab="api">
                        <h4 class="nhud-api-section-title">🔌 Подключение</h4>
                        <div id="nhud-proxy-instruction-btn" class="nhud-proxy-instruction-btn">
                            <span class="nhud-proxy-instruction-title">⚠️ ВАЖНО: ОЗНАКОМЬТЕСЬ С ИНСТРУКЦИЕЙ ПО ПРОКСИ!</span>
                            <div class="nhud-proxy-instruction-desc">Нажмите здесь, чтобы узнать, как правильно настроить профили OpenRouter и сторонних API</div>
                        </div>
                        <div class="nhud-field-group"><label>Профиль подключения</label><select id="nhud-settings-profile-select" class="nhud-select"></select></div>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-auto-send" type="checkbox" /><label for="nhud-auto-send" style="color:#d0b0b0;">Авто-отправка после каждого сообщения бота</label></div>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-send-with-main" type="checkbox" /><label for="nhud-send-with-main" style="color:#d0b0b0;">Отправлять вместе с основным запросом (Вшивать в пресет)</label></div>
                        <div class="nhud-field-group nhud-checkbox-group nhud-light-mode-section">
                            <input id="nhud-light-mode" type="checkbox" />
                            <label for="nhud-light-mode" class="nhud-light-mode-label"><strong>⚡ Лайт-режим (Экономия токенов)</strong></label>
                        </div>
                        <div class="nhud-light-mode-info">
                            Уникальный алгоритм фонового парсинга для слабых моделей (ДЕЛАЕТ ДВА ЗАПРОСА).<br>
                            Вместо того чтобы заставлять ИИ писать тяжелый JSON в каждом ответе, мод делает два запроса:<br>
                            1. ИИ пишет красивый художественный ответ (без лишних инструкций).<br>
                            2. Мод незаметно делает второй, "тихий" запрос с минимальным контекстом для извлечения статов и прочего.<br>
                            <span style="color:#52e0a3;">Результат: огромная экономия контекста и никаких сломанных ответов бота!</span>
                        </div>
                        <div class="nhud-parser-section">
                            <div class="nhud-section-hint">Параметры запроса:</div>
                            <div class="nhud-field-group"><label>Сообщений контекста</label><input id="nhud-context-messages" class="nhud-input" type="number" min="1" max="50" style="width:80px;" /></div>
                            <div class="nhud-field-group"><label>Макс. токенов ответа</label><input id="nhud-max-tokens" class="nhud-input" type="number" min="100" max="8000" style="width:100px;" /></div>
                            <div class="nhud-field-group"><label>Температура (0.0 — 2.0)</label><input id="nhud-temperature" class="nhud-input" type="number" min="0" max="2" step="0.1" style="width:80px;" /></div>
                        </div>

                        <h4 class="nhud-parser-section-title">🔍 Парсер JSON</h4>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-parser-enabled" type="checkbox" /><label for="nhud-parser-enabled">Включить автоматический парсинг JSON</label></div>
                        <div class="nhud-field-group"><label>Открывающий тег</label><input id="nhud-parser-open-tag" class="nhud-input" type="text" placeholder="[NHUD]" /></div>
                        <div class="nhud-field-group"><label>Закрывающий тег</label><input id="nhud-parser-close-tag" class="nhud-input" type="text" placeholder="[/NHUD]" /></div>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-parser-auto-remove" type="checkbox" /><label for="nhud-parser-auto-remove">Автоматически удалять теги из сообщений</label></div>
                        <div class="nhud-field-group"><button id="nhud-parser-test" class="nhud-add-btn nhud-parser-test-btn">🔍 Тест парсера</button></div>
                    </div>

                    <div class="nhud-tab-content" data-tab="storage">
                        <div class="nhud-field-group">
                            <label>Статистика текущего чата</label>
                            <div id="nhud-storage-stats" class="nhud-stats-box"><div>Загрузка...</div></div>
                        </div>
                        <div class="nhud-field-group">
                            <label>Экспорт / Импорт</label>
                            <div class="nhud-storage-actions">
                                <button id="nhud-export-btn" class="nhud-add-btn nhud-export-btn">📤 Экспорт чата</button>
                                <label class="nhud-add-btn nhud-import-label" style="cursor:pointer;">📥 Импорт<input id="nhud-import-file" type="file" accept=".json" class="nhud-import-input" /></label>
                            </div>
                        </div>
                        <div class="nhud-field-group nhud-clear-section">
                            <label>Очистка</label>
                            <div class="nhud-clear-actions">
                                <button id="nhud-smart-clean-btn" class="nhud-send-btn nhud-smart-clean-btn">🧠 Умная очистка</button>
                                <button id="nhud-clear-chat-btn" class="nhud-s-delete nhud-clear-chat-btn">🗑️ Текущий чат</button>
                                <button id="nhud-clear-all-btn" class="nhud-s-delete nhud-clear-all-btn">⚠️ Все чаты</button>
                            </div>
                            <div class="nhud-factory-reset-section">
                                <div class="nhud-factory-reset-hint">⚠️ Полный сброс — удаляет ВСЕ настройки мода (промты, дизайн, модули) до заводских. Данные чатов сохранятся.</div>
                                <button id="nhud-factory-reset-btn" class="nhud-s-delete nhud-factory-reset-btn">🔴 Сброс до заводских настроек</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `);

    $("#nhud-settings-tabs").off("click").on("click", ".nhud-tab", function() {
        const tab = $(this).data("tab");
        $(".nhud-tab").css({ color: "var(--nhud-text-muted, #a08080)", fontWeight: "normal" });
        $(this).css({ color: "var(--nhud-text-main, #e0c0c0)", fontWeight: "bold" });
        $(".nhud-tab-content").removeClass("active-tab");
        $(`.nhud-tab-content[data-tab="${tab}"]`).addClass("active-tab");
        
        if (tab === "trackers") { renderSettingsFactions(); renderSettingsHeroSheet(); }
        if (tab === "property") { renderSettingsTrackers(); if (typeof renderSettingsProperty === 'function') { renderSettingsProperty(); renderOutfitPanel(); renderAutoInventories(); } }
        if (tab === "journal") { renderSettingsQuests(); renderSettingsCodex(); renderSettingsCalendar(); }
        if (tab === "storage") renderStorageStats();
        if (tab === "characters") renderSettingsCharacterAccordion();
        if (tab === "api") { renderSettingsProfileSelect(); renderParserSettings(); }
        if (tab === "halloffame") renderHallOfFame();
    });

    // Бинды кнопок Имущества
    $("#nhud-add-estate").on("click", () => {
        const inv = getSettings().chatData[NarrativeStorage.getCurrentChatId()]?.inventory;
        if (inv) { inv.estate.push({ name: "Новая недвижимость", desc: "", bgUrl: "" }); saveSettingsDebounced(); if(typeof renderPropertyCards === 'function') renderPropertyCards('estate'); }
    });
    
    $("#nhud-add-vehicle").on("click", () => {
        const inv = getSettings().chatData[NarrativeStorage.getCurrentChatId()]?.inventory;
        if (inv) { inv.vehicles.push({ name: "Новый транспорт", desc: "", bgUrl: "" }); saveSettingsDebounced(); if(typeof renderPropertyCards === 'function') renderPropertyCards('vehicles'); }
    });

    // Все старые бинды...
    $("#nhud-settings-close").on("click", closeSettingsPanel);
    $("#nhud-settings-profile-select").on("change", function() { const settings = getSettings(); const val = $(this).val(); settings.activeProfile = val === "__quiet__" ? null : val; settings.useSTProfile = val !== "__quiet__"; saveSettingsDebounced(); renderSettingsProfileSelect(); });
    $("#nhud-prompt-system").on("input",   e => { getSettings().prompts.system   = e.target.value; saveSettingsDebounced(); });
    $("#nhud-prompt-language").on("input", e => { getSettings().prompts.language = e.target.value; saveSettingsDebounced(); });
    $("#nhud-auto-send").on("change",      e => { getSettings().autoSend = e.target.checked; saveSettingsDebounced(); });
    $("#nhud-module-comics").on("change", e => { const s = getSettings(); if(!s.modules) s.modules={}; s.modules.comics = e.target.checked; saveSettingsDebounced(); e.target.checked ? $("#nhud-comics-prompt-container").slideDown(200) : $("#nhud-comics-prompt-container").slideUp(200); });
    $("#nhud-comics-prompt").on("input",  e => { const s = getSettings(); if(!s.prompts) s.prompts={}; s.prompts.comicsPrompt = e.target.value; saveSettingsDebounced(); });
    $("#nhud-send-with-main").on("change", e => { getSettings().requestSettings.sendWithMain = e.target.checked; saveSettingsDebounced(); });
    $("#nhud-light-mode").on("change",     e => { const settings = getSettings(); const isLight = e.target.checked; settings.requestSettings.lightMode = isLight; if (isLight && !settings.useSTProfile) { const profiles = getSTProfiles(); if (profiles.length > 0) { settings.activeProfile = profiles[0].name; settings.useSTProfile = true; toastr.info(`Профиль изменен на ${profiles[0].name}`, "⚡ Лайт-режим"); } else { toastr.warning("Для Лайт-режима требуется создать API профиль!", "Внимание"); } } saveSettingsDebounced(); renderSettingsProfileSelect(); });
    $("#nhud-context-messages").on("input",e => { getSettings().requestSettings.contextMessages = parseInt(e.target.value)||10; saveSettingsDebounced(); });
    $("#nhud-max-tokens").on("input",      e => { getSettings().requestSettings.maxTokens = parseInt(e.target.value)||2000; saveSettingsDebounced(); });
    $("#nhud-temperature").on("input",     e => { getSettings().requestSettings.temperature = parseFloat(e.target.value)||0.7; saveSettingsDebounced(); });
    $("#nhud-add-tracker").off("click").on("click", () => { const trackers = getChatTrackers(); trackers.push({ id: `tracker_${Date.now()}`, label: "Новый", max: 100, color: "#52b8e0" }); saveSettingsDebounced(); renderSettingsTrackers(); renderTrackers(); });
    $("#nhud-add-prompt-block").on("click", () => { const s = getSettings(); const id = `block_${Date.now()}`; s.promptBlocks.push({ id, label: "Новый блок", prompt: "", enabled: true }); saveSettingsDebounced(); renderPromptBlocks(); renderInfoBlockButtons(); });
    $("#nhud-parser-enabled").on("change", e => { getSettings().jsonParser.enabled = e.target.checked; saveSettingsDebounced(); });
    $("#nhud-parser-open-tag").on("input", e => { getSettings().jsonParser.openTag = e.target.value; saveSettingsDebounced(); });
    $("#nhud-parser-close-tag").on("input", e => { getSettings().jsonParser.closeTag = e.target.value; saveSettingsDebounced(); });
    $("#nhud-parser-auto-remove").on("change", e => { getSettings().jsonParser.autoRemoveTags = e.target.checked; saveSettingsDebounced(); });
    
    $("#nhud-parser-test").on("click", () => {
        const testText = prompt("Введите текст с JSON для теста:", "[NHUD]\\n{\\n  \\\"trackers\\\": {\\n    \\\"health\\\": 85\\n  }\\n}\\n[/NHUD]");
        if (!testText) return; const settings = getSettings(); const jsonData = parseJsonFromMessage(testText, settings.jsonParser.openTag, settings.jsonParser.closeTag);
        if (jsonData) alert("✅ JSON найден:\\n" + JSON.stringify(jsonData, null, 2)); else alert("❌ JSON не найден или невалидный");
    });
    
    $("#nhud-export-btn").on("click", () => { const data = NarrativeStorage.exportChatBlocks(); if (!data) { toastr.warning("Нет данных для экспорта"); return; } const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `narrative-hud-${data.chatId || 'chat'}.json`; a.click(); URL.revokeObjectURL(url); toastr.success("Экспорт завершён"); });
    $("#nhud-import-file").on("change", function() { const file = this.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const data = JSON.parse(e.target.result); NarrativeStorage.importChatBlocks(data.chatId || NarrativeStorage.getCurrentChatId(), data); toastr.success("Импорт завершён"); updateHistoryButtons(); renderStorageStats(); } catch(err) { toastr.error("Ошибка импорта: " + err.message); } }; reader.readAsText(file); });
    $("#nhud-smart-clean-btn").on("click", () => { if (typeof openSmartCleaner === 'function') openSmartCleaner(); });
    $("#nhud-clear-chat-btn").on("click", () => { if (!confirm("Очистить все блоки в текущем чате?")) return; NarrativeStorage.deleteCurrentChat(); updateHistoryButtons(); renderStorageStats(); toastr.success("Данные текущего чата очищены"); });
    $("#nhud-clear-all-btn").on("click", () => { if (!confirm("⚠️ Очистить ВСЕ данные всех чатов?")) return; NarrativeStorage.purgeAllData(); updateHistoryButtons(); renderStorageStats(); toastr.success("Все данные очищены"); });

    $("#nhud-factory-reset-btn").on("click", () => {
    if (!confirm("⚠️ ПОЛНОЕ УНИЧТОЖЕНИЕ ВСЕХ ДАННЫХ МОДА?\n\nБудут удалены:\n— Все настройки (промпты, дизайн, модули)\n— Все данные чатов (персонажи, трекеры, квесты)\n— Весь прогресс во всех чатах\n\nВосстановление НЕВОЗМОЖНО.\n\nПродолжить?")) return;
    if (!confirm("Вы точно уверены? Это нельзя отменить.")) return;

    import('../core/constants.js').then(({ extensionName }) => {
        import('../../../../extensions.js').then(({ extension_settings }) => {
            import('../../../../../script.js').then(({ saveSettingsDebounced }) => {
                // Полное уничтожение — удаляем весь объект расширения
                delete extension_settings[extensionName];
                
                // Чистим localStorage на всякий случай
                try {
                    Object.keys(localStorage).forEach(key => {
                        if (key.includes('narrative') || key.includes('nhud')) {
                            localStorage.removeItem(key);
                        }
                    });
                } catch(e) {}

                // Сохраняем пустоту на диск
                saveSettingsDebounced();

                toastr.warning("Данные уничтожены. Перезагрузка...", "💥 Полный сброс", { timeOut: 2000 });

                // Перезагружаем страницу через 2 секунды
                setTimeout(() => location.reload(), 2000);
            });
        });
    });
});
    
    $("#nhud-proxy-instruction-btn").hover(function() { $(this).css("background", "rgba(224, 82, 82, 0.25)"); }, function() { $(this).css("background", "rgba(224, 82, 82, 0.15)"); }).on("click", () => {
        $("#nhud-custom-proxy-modal").remove();
        const html = `
            <div id="nhud-custom-proxy-modal" class="nhud-proxy-modal">
                <div class="nhud-proxy-modal-content">
                    <button id="nhud-close-proxy-modal" class="nhud-proxy-modal-close">✕</button>
                    <h3 class="nhud-proxy-modal-title">Настройка сторонних API</h3>
                    <p class="nhud-proxy-modal-instructions">Из-за особенностей работы Таверны, для корректной маршрутизации запросов расширения необходимо создать отдельный профиль:</p>
                    <ol class="nhud-proxy-list">
                        <li>В главном меню API выберите <b>Chat Completion -> OpenAI</b></li>
                        <li>Разверните вкладку <b>Прокси</b>. Назовите пресет, вставьте ссылку на прокси (обязательно с <code class="nhud-proxy-code">/v1</code> на конце) и ваш ключ.</li>
                        <li style="color:#52e0a3; font-weight:bold;">ОБЯЗАТЕЛЬНО: Нажмите иконку дискеты (💾) для СОХРАНЕНИЯ ПРЕСЕТА ПРОКСИ!</li>
                        <li>Сверните вкладку Прокси.</li>
                        <li>Поставьте галочку <b>«Показать "сторонние" модели (предоставленные API)»</b>.</li>
                        <li>В списке моделей пролистайте вниз и выберите нужную модель вашего прокси.</li>
                        <li>Сохраните сам профиль (кнопка сверху).</li>
                    </ol>
                    <p class="nhud-proxy-modal-success">Вы великолепны! После этого пресет можно использовать в расширении!</p>
                </div>
            </div>
        `;
        $("body").append(html);
        $("#nhud-close-proxy-modal").on("click", () => $("#nhud-custom-proxy-modal").fadeOut(200, function() { $(this).remove(); }));
        $("#nhud-custom-proxy-modal").on("click", function(e) { if (e.target === this) $(this).fadeOut(200, function() { $(this).remove(); }); });
    });

    renderSettingsTrackers();
    renderSettingsCharacterAccordion();
    renderSettingsProfileSelect();
    renderSettingsPrompts();
    renderPromptBlocks();
    renderParserSettings();
    renderSettingsFactions();
    renderSettingsHeroSheet();
    if (typeof renderSettingsProperty === 'function') renderSettingsProperty();
    
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
                    <span class="nhud-accordion-title" title="${chatId}">💬 ${shortId}</span>
                    <span class="nhud-accordion-count">${charNames.length} перс.</span>
                    <button class="nhud-rename-chat-btn nhud-char-action-btn nhud-char-rename-btn" data-chat="${chatId}" title="Перепривязать к новому имени чата">✏️</button>
                    <button class="nhud-s-delete nhud-delete-chat-btn nhud-char-action-btn" data-chat="${chatId}" title="Удалить данные чата">🗑️</button>
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
            <div class="nhud-acc-add-row">
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
            data.liveData.characters[name] = { outfit: { head: "", torso: "", legs: "", feet: "", accessories: "" }, state: "", thoughts: "" };
            extension_settings[extensionName] = settings;
            saveSettingsDebounced();
            renderSettingsCharacterAccordion();
            if (chatId === NarrativeStorage.getCurrentChatId()) {
                getSettings().liveData.characters[name] = { outfit: { head: "", torso: "", legs: "", feet: "", accessories: "" }, state: "", thoughts: "" };
                renderCharacters();
            }
        });

        body.append(addRow);

        if (data.liveData?.ignoredCharacters && data.liveData.ignoredCharacters.length > 0) {
            const unignoreRow = $(`
                <div style="padding:8px; border-top:1px dashed #3a1525; margin-top:8px;">
                    <div style="font-size:0.7em; color:#a08080; margin-bottom:6px;">В игноре (нажми, чтобы вернуть):</div>
                    <div class="nhud-ignored-list"></div>
                </div>
            `);
            
            const ignoredContainer = unignoreRow.find('.nhud-ignored-list');
            
            data.liveData.ignoredCharacters.forEach(ignoredName => {
                const badge = $(`
                    <button class="nhud-unignore-single-btn nhud-unignore-btn" title="Вернуть ${ignoredName} в HUD">
                        👻 ${ignoredName}
                    </button>
                `);
                
                badge.on('click', function() {
                    data.liveData.ignoredCharacters = data.liveData.ignoredCharacters.filter(n => n !== ignoredName);
                    
                    if (!data.liveData.characters) data.liveData.characters = {};
                    data.liveData.characters[ignoredName] = { outfit: { head: "", torso: "", legs: "", feet: "", accessories: "" }, state: "", thoughts: "" };
                    
                    extension_settings[extensionName] = settings;
                    saveSettingsDebounced();
                    
                    if (chatId === NarrativeStorage.getCurrentChatId()) {
                        getSettings().liveData.ignoredCharacters = getSettings().liveData.ignoredCharacters.filter(n => n !== ignoredName);
                        getSettings().liveData.characters[ignoredName] = { outfit: { head: "", torso: "", legs: "", feet: "", accessories: "" }, state: "", thoughts: "" };
                        
                        renderCharacters();
                        if (typeof renderRelationships === 'function') renderRelationships();
                        if (typeof renderSettingsTrackers === 'function') renderSettingsTrackers();
                    }
                    
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
                <div class="nhud-char-avatar-wrap">
                    <img src="${globalChar.avatar || ''}"
                         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                         class="nhud-char-avatar-img"
                         style="${globalChar.avatar ? '' : 'display:none;'}"/>
                    <div class="nhud-char-avatar-placeholder" style="${globalChar.avatar ? 'display:none;' : 'display:flex;'}">
                        ${name[0].toUpperCase()}
                    </div>
                </div>
                <div style="flex:1;min-width:0;">
                    <div class="nhud-char-name">${name}</div>
                    ${liveData?.outfit ? (() => { const o = liveData.outfit; if (typeof o === 'object') { const worn = Object.values(o).filter(v => v && typeof v === 'string').map(v => v.substring(0,30)); return worn.length ? `<div class="nhud-char-outfit-preview">👗 ${worn.join(', ').substring(0,60)}</div>` : ''; } else if (typeof o === 'string') { return `<div class="nhud-char-outfit-preview">👗 ${o.substring(0,60)}</div>`; } return ''; })() : ''}
                    ${liveData?.state  ? `<div class="nhud-char-state-preview">${liveData.state.substring(0,70)}${liveData.state.length>70?'…':''}</div>` : ''}
                </div>
                ${liveData?.isHiddenFromScene ? `<button class="nhud-acc-return-scene nhud-char-action-btn nhud-char-return-scene-btn" title="Вернуть персонажа в сцену (на экраны)">🏃</button>` : ''}
                <button class="nhud-acc-ghost-char nhud-char-action-btn nhud-char-ghost-btn" title="Превратить в призрака 👻 (Добавить в Игнор)">👻</button>
                <button class="nhud-acc-delete-char nhud-s-delete nhud-char-action-btn" title="Просто удалить из текущего кэша">✕</button>
            </div>
            <div class="nhud-accordion-char-avatar-edit">
                <label style="font-size:0.72em;color:#505070;text-transform:uppercase;letter-spacing:0.05em;">Аватар</label>
                <div class="nhud-avatar-row">
                    <div class="nhud-avatar-btns">
                        <input class="nhud-acc-avatar-url nhud-input" type="text"
                               placeholder="URL..."
                               value="${globalChar.avatar && !globalChar.avatar.startsWith('data:') ? globalChar.avatar : ''}" />
                        <label class="nhud-file-btn">
                            📁 С компа
                            <input class="nhud-acc-avatar-file" type="file" accept="image/*" style="display:none;" />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `);

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

    block.find('.nhud-acc-return-scene').on('click', () => {
        liveData.isHiddenFromScene = false;
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
        if (chatId === NarrativeStorage.getCurrentChatId()) {
            getSettings().liveData.characters[name].isHiddenFromScene = false;
            renderCharacters();
            if (typeof renderRelationships === 'function') renderRelationships();
            if (typeof renderSettingsTrackers === 'function') renderSettingsTrackers();
        }
        renderSettingsCharacterAccordion();
    });

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
        block.find('.nhud-char-avatar-placeholder').hide();
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
            block.find('.nhud-char-avatar-placeholder').hide();
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

    // УБРАЛИ idx из цикла, работаем напрямую с объектом block
    settings.promptBlocks.forEach(block => {
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

        // Функция-пинок для мгновенного обновления промпта в ядре ST
        const forceUpdate = () => {
            import('../index.js').then(m => {
                if (m.injectPromptIntoRequest) m.injectPromptIntoRequest();
            });
        };

        row.find(".nhud-pb-enabled").on("change", function() {
            block.enabled = this.checked; // Меняем свойство напрямую у объекта!
            saveSettingsDebounced(); 
            renderInfoBlockButtons();
            forceUpdate();
        });
        
        row.find(".nhud-pb-label").on("input", e => {
            block.label = e.target.value;
            saveSettingsDebounced(); 
            renderInfoBlockButtons();
        });
        
        row.find(".nhud-pb-id").on("input", e => {
            block.id = e.target.value;
            saveSettingsDebounced();
            renderInfoBlockButtons();
            forceUpdate();
        });
        
        row.find(".nhud-pb-prompt").on("input", e => {
            block.prompt = e.target.value;
            saveSettingsDebounced();
            forceUpdate();
        });
        
        row.find(".nhud-pb-delete").on("click", () => {
            // Удаляем блок надежно, фильтруя массив по ID
            settings.promptBlocks = settings.promptBlocks.filter(b => b.id !== block.id);
            saveSettingsDebounced(); 
            renderPromptBlocks(); 
            renderInfoBlockButtons();
            forceUpdate();
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

export function renderSettingsTrackers() {
    const trackers = getChatTrackers();
    const live = getLive();
    const list = $("#nhud-settings-tracker-list");
    list.empty();
    
    const isDynamic = getSettings().design?.barDynamic !== false;

    // --- 1. РЕНДЕР ТРЕКЕРОВ ИГРОКА ---
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

    // --- 2. РЕНДЕР ШАБЛОНОВ ДЛЯ БОТОВ (НОВОЕ) ---
    let botContainer = $("#nhud-settings-bot-trackers-container");
    if (!botContainer.length) {
        $("#nhud-add-tracker").after(`
            <div id="nhud-settings-bot-trackers-container" style="margin-top:20px; border-top:1px dashed var(--nhud-border); padding-top:15px;">
                <div style="font-weight:bold; color:#52a8e0; margin-bottom:10px;">🤖 Шаблоны кастомных трекеров NPC</div>
                <div style="font-size:11px; color:#a08080; margin-bottom:10px;">Эти трекеры будут добавлены всем активным NPC. ИИ сможет ими управлять.</div>
                <div id="nhud-settings-bot-tracker-list"></div>
                <button id="nhud-add-bot-tracker" class="nhud-add-btn" style="background:rgba(82, 168, 224, 0.15); border-color:#3a5a80; color:#80b0e0;">+ Добавить шаблон NPC</button>
            </div>
        `);

        $("#nhud-add-bot-tracker").on("click", () => {
            const settings = getSettings();
            if (!settings.botTrackers) settings.botTrackers = [];
            settings.botTrackers.push({ id: `bot_stat_${Date.now()}`, label: "Новый стат", max: 100, color: "#e05252" });
            import('../../../../../../script.js').then(s => { if (s.saveSettingsDebounced) s.saveSettingsDebounced(); });
            renderSettingsTrackers();
        });
    }

    const botList = $("#nhud-settings-bot-tracker-list");
    botList.empty();
    const botTrackers = getSettings().botTrackers || [];

    botTrackers.forEach((tracker, idx) => {
        const row = $(`
            <div class="nhud-settings-tracker-row" style="display:flex; gap:6px; margin-bottom:8px; align-items:center; background:rgba(0,0,0,0.2); padding:6px; border-radius:4px; border:1px solid #2a3040;">
                <input class="nhud-bot-t-label nhud-input" type="text" placeholder="Название" value="${tracker.label}" style="flex:1;" />
                <input class="nhud-bot-t-id nhud-input" type="text" placeholder="id (для JSON)" value="${tracker.id}" style="width:100px;" />
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:0.6em; color:#606080; line-height:1;">Макс.</span>
                    <input class="nhud-bot-t-max nhud-input" type="number" min="1" value="${tracker.max}" style="width:50px; padding:4px;" />
                </div>
                <input class="nhud-bot-t-color" type="color" value="${tracker.color}" style="width:28px; height:28px; padding:0; border:none; border-radius:4px; cursor:pointer; margin-top:10px;" title="Цвет полоски" />
                <button class="nhud-bot-t-delete nhud-s-delete-btn" style="width:24px; padding:2px 0; margin-top:10px;">✕</button>
            </div>
        `);

        row.find(".nhud-bot-t-label").on("input", e => { botTrackers[idx].label = e.target.value; import('../../../../../../script.js').then(s => { if (s.saveSettingsDebounced) s.saveSettingsDebounced(); }); });
        row.find(".nhud-bot-t-id").on("input", e => { botTrackers[idx].id = e.target.value; import('../../../../../../script.js').then(s => { if (s.saveSettingsDebounced) s.saveSettingsDebounced(); }); });
        row.find(".nhud-bot-t-max").on("input", e => { botTrackers[idx].max = parseInt(e.target.value) || 100; import('../../../../../../script.js').then(s => { if (s.saveSettingsDebounced) s.saveSettingsDebounced(); }); });
        row.find(".nhud-bot-t-color").on("input", e => { botTrackers[idx].color = e.target.value; import('../../../../../../script.js').then(s => { if (s.saveSettingsDebounced) s.saveSettingsDebounced(); }); });
        row.find(".nhud-bot-t-delete").on("click", () => {
            botTrackers.splice(idx, 1);
            import('../../../../../../script.js').then(s => { if (s.saveSettingsDebounced) s.saveSettingsDebounced(); });
            renderSettingsTrackers();
        });

        botList.append(row);
    });

    // --- 3. БЛОК ОТНОШЕНИЙ ---
    const placeholder = $("#nhud-settings-rel-container-placeholder");
    if (placeholder.length && placeholder.find("#nhud-settings-rel-container").length === 0) {
        placeholder.html(`
            <div id="nhud-settings-rel-container" style="padding-top:5px;">
                <details open style="border:1px solid var(--nhud-border); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                    <summary style="font-weight:bold; color:var(--nhud-accent); cursor:pointer; padding:5px; outline:none; user-select:none;">❤️ Отношения с персонажами</summary>
                    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; margin:10px 0;">
                        <button id="nhud-s-rel-statuses-btn" class="nhud-add-btn" style="margin:0; padding:4px 8px; background:rgba(200, 100, 150, 0.15); border:1px solid #803a5a; color:#e080b0; transition:0.2s;" title="Настроить статусы отношений">🏷️ Статусы</button>
                        
                        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                            <button id="nhud-open-analytics-btn" class="nhud-add-btn" style="margin:0; padding:4px 8px; background:rgba(82, 168, 224, 0.15); border:1px solid #3a5a80; color:#80b0e0; transition:0.2s;">📈 Аналитика</button>
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

        if (getSettings().modules?.analytics === false) {
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
        name.toLowerCase() !== userName.toLowerCase() && !name.toLowerCase().includes('system') && !live.characters[name].isHiddenFromScene
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
                                    ${getSettings().modules?.analytics !== false ? `<button class="nhud-s-rel-journal-btn" data-name="${name}" title="Открыть журнал связей" style="background:none; border:none; cursor:pointer; font-size:14px; padding:0 4px; transition:0.2s;">📜</button>` : ''}
                                    <button class="nhud-s-rel-hide-scene-btn" data-name="${name}" title="Убрать из текущей сцены (сохранится во вкладке Персонажи)" style="background:none; border:none; color:#e05252; cursor:pointer; font-size:14px; padding:0 4px; transition:0.2s;">✕</button>
                                    <button class="nhud-s-rel-toggle-btn" data-name="${name}" title="Скрыть полоску из HUD" style="background:none; border:none; cursor:pointer; font-size:14px; padding:0 4px; transition:0.2s; filter: grayscale(${char.ignoreRelationship ? '100%' : '0'});">${char.ignoreRelationship ? '👁️‍🗨️' : '👁️'}</button>
                                    <textarea class="nhud-input nhud-s-rel-status" style="width:110px; padding:2px 4px; font-size:0.75em; text-align:right; color:#c0b0a0; border-color:#4a3030; resize:vertical; min-height:24px; line-height:1.2; font-family:inherit; background:transparent;" placeholder="Статус..." rows="2">${status}</textarea>
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

            card.find('.nhud-s-rel-hide-scene-btn').on('click', function(e) {
                e.stopPropagation();
                live.characters[name].isHiddenFromScene = true;
                saveSettingsDebounced();
                renderSettingsTrackers();
                import('../../UIManager.js').then(ui => {
                    if (ui.renderCharacters) ui.renderCharacters();
                    if (ui.renderRelationships) ui.renderRelationships();
                });
                import('../../SettingsUI.js').then(su => {
                    if (su.renderSettingsCharacterAccordion) su.renderSettingsCharacterAccordion(); 
                });
            });

            card.find('.nhud-s-rel-journal-btn').on('click', function(e) {
                e.stopPropagation();
                if (typeof openRelationshipJournal === 'function') openRelationshipJournal($(this).data('name'));
            });

            card.find('.nhud-s-rel-toggle-btn').on('click', function(e) {
                e.stopPropagation();
                live.characters[name].ignoreRelationship = !live.characters[name].ignoreRelationship;
                saveSettingsDebounced();
                renderSettingsTrackers();
                import('../../UIManager.js').then(ui => {
                    if (ui.renderRelationships) ui.renderRelationships();
                    if (ui.renderMiniSims) ui.renderMiniSims();
                });
            });

            card.find('.nhud-s-rel-val').on('input', e => {
                live.characters[name].relationship = Math.min(Math.max(0, parseInt(e.target.value) || 0), 100);
                saveSettingsDebounced(); 
                import('../../UIManager.js').then(ui => { if(ui.renderRelationships) ui.renderRelationships(); });
            });
            
            card.find('.nhud-s-rel-status').on('input', e => {
                live.characters[name].relationship_status = e.target.value; saveSettingsDebounced();
            });
            
            card.find('.nhud-s-rel-thoughts').on('input', e => {
                live.characters[name].relationship_thoughts = e.target.value; saveSettingsDebounced();
            });
            
            card.find('.nhud-s-rel-hint').on('input', e => {
                live.characters[name].relationship_hint = e.target.value; saveSettingsDebounced();
            });

            relList.append(card);
        });
    }
    // --- 4. КРАСИВЫЙ БЛОК ТРЕКЕРОВ БОТОВ (ГАРМОШКА В ПЕРСОНАЖАХ) ---
    const relContainer = $("#nhud-settings-rel-container");
    if (relContainer.length && $("#nhud-settings-bta-container").length === 0) {
        // Добавляем HTML гармошки ровно под блоком отношений
        relContainer.after(`
            <div id="nhud-settings-bta-container" style="padding-top:10px;">
                <details open style="border:1px solid var(--nhud-border); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                    <summary style="font-weight:bold; color:#52a8e0; cursor:pointer; padding:5px; outline:none; user-select:none;">🤖 Состояние и Трекеры NPC</summary>
                    <div id="nhud-settings-bta-list" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
                </details>
            </div>
        `);
    }

    const btaList = $("#nhud-settings-bta-list");
    if (btaList.length) {
        btaList.empty();
        let hasTrackers = false;

        // charNames уже вычислены чуть выше в функции, используем их
        charNames.forEach(name => {
            const char = live.characters[name];
            if (char.botTrackersEnabled === false) return; // Пропускаем, если трекеры для этого бота выключены

            const trackersToRender = char.customTrackers?.length > 0 ? char.customTrackers : (getSettings().botTrackers || []);
            if (trackersToRender.length === 0) return;

            hasTrackers = true;
            
            // Карточка персонажа
            const card = $(`
                <div style="background:rgba(255,255,255,0.02); padding:8px 10px; border-radius:6px; border:1px solid #3a3050;">
                    <div style="font-weight:bold; color:#e0d0a0; font-size:12px; margin-bottom:8px;">${name}</div>
                    <div class="nhud-bta-trackers-wrapper"></div>
                </div>
            `);

            const tWrapper = card.find('.nhud-bta-trackers-wrapper');
            
            // Рисуем сами полоски трекеров
            trackersToRender.forEach(t => {
                const val = char.trackerValues?.[t.id] !== undefined ? char.trackerValues[t.id] : t.max;
                const pct = Math.max(0, Math.min(100, Math.round((val / t.max) * 100)));
                
                const tRow = $(`
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-size:11px; color:#c0b0a0; width:90px; overflow:hidden; text-overflow:ellipsis;" title="${t.label}">${t.label}</span>
                        <div style="flex:1; height:6px; background:#1a1628; border-radius:3px; overflow:hidden; border:1px solid #2a2040;">
                            <div style="width:${pct}%; height:100%; background:${t.color || '#e05252'}; transition:0.3s;"></div>
                        </div>
                        <input type="number" class="nhud-bta-val" value="${val}" min="0" max="${t.max}" style="width:40px; padding:2px; font-size:10px; text-align:center; background:rgba(0,0,0,0.4); color:#fff; border:1px solid #4a3050; border-radius:4px;" />
                    </div>
                `);

                // Если ты поменяешь значение ручками — всё сохранится и обновится
                tRow.find('.nhud-bta-val').on('change', function() {
                    if (!char.trackerValues) char.trackerValues = {};
                    char.trackerValues[t.id] = Math.min(Math.max(0, parseInt($(this).val()) || 0), t.max);
                    import('../../../../../../script.js').then(s => { if(s.saveSettingsDebounced) s.saveSettingsDebounced(); });
                    renderSettingsTrackers(); 
                    import('../../UIManager.js').then(ui => { if(ui.renderMiniBots) ui.renderMiniBots(); });
                });
                
                tWrapper.append(tRow);
            });
            btaList.append(card);
        });

        // Заглушка, если трекеров пока нет
        if (!hasTrackers) {
            btaList.append('<div style="color:#606080; font-size:11px; text-align:center; padding:10px;">Нет активных трекеров для персонажей в сцене.</div>');
        }
    }
}

export function renderSettingsPrompts() {
    const settings = getSettings();
    
    if (!$("#nhud-local-token-tracker").length) {
        $("#nhud-prompt-system").parent().before(`
            <details id="nhud-local-token-tracker" class="nhud-local-token-tracker" open>
                <summary class="nhud-cen-head">
                    <span>📊 Расход токенов в ЭТОМ чате</span>
                    <button id="nhud-refresh-local-tokens" title="Пересчитать">🔄</button>
                </summary>
                <div class="nhud-local-token-content">
                    <div class="nhud-local-token-row"><span>Базовые промпты:</span><span id="nhud-local-tokens-base">0</span></div>
                    <div class="nhud-local-token-row nhud-local-token-row-memory"><span>Вшитая память (Имущество, Лор, и т.д.):</span><span id="nhud-local-tokens-memory">0</span></div>
                    <div class="nhud-local-token-row"><span>Структура JSON (Скелет):</span><span>190</span></div>
                    <div style="border-top:1px dashed #802030; margin:4px 0;"></div>
                    <div class="nhud-local-token-row nhud-local-token-row-total"><span>Итого к запросу:</span><span><span id="nhud-local-tokens-total">0</span> токенов</span></div>
                    <div class="nhud-local-token-hint">* Пересчитывается при нажатии 🔄 или переоткрытии вкладки.</div>
                </div>
            </details>
        `);
    }

    $("#nhud-prompt-system").val(settings.prompts.system);
    $("#nhud-prompt-language").val(settings.prompts.language || "Russian");
    const rs = settings.requestSettings;
    $("#nhud-auto-send").prop("checked", settings.autoSend);
    $("#nhud-send-with-main").prop("checked", rs.sendWithMain || false);
    const isComicsEnabled = settings.modules?.comics || false;
    $("#nhud-module-comics").prop("checked", isComicsEnabled);
    
    if (isComicsEnabled) {
        $("#nhud-comics-prompt-container").show();
    } else {
        $("#nhud-comics-prompt-container").hide();
    }

    const defaultComicsPrompt = 'VISUAL PROMPT RULE: If the scene has a vivid cinematic moment, output a "comics" array containing exact prompts for an image generator (describe lighting, angle, character appearance, background).';
    $("#nhud-comics-prompt").val(settings.prompts?.comicsPrompt !== undefined ? settings.prompts.comicsPrompt : defaultComicsPrompt);
    $("#nhud-light-mode").prop("checked", rs.lightMode || false);
    $("#nhud-context-messages").val(rs.contextMessages || 10);
    $("#nhud-max-tokens").val(rs.maxTokens || 2000);
    $("#nhud-temperature").val(rs.temperature || 0.7);

    const calculateLocalTokens = () => {
        const mConf = settings.modules || {};
        const pConf = settings.prompts || {};
        
        let baseText = (pConf.system || "") + "\n\n";
        if(mConf.trackers !== false) baseText += (pConf.trackersPrompt || "") + "\n";
        if(mConf.characters !== false) baseText += (pConf.charsPrompt || "") + "\n";
        if(mConf.datetime !== false) baseText += (pConf.datetimePrompt || "") + "\n";
        if(mConf.achievements !== false) baseText += (pConf.achievementsPrompt || "") + "\n";
        if(mConf.hero !== false) baseText += (pConf.heroPrompt || "") + "\n";
        if(mConf.quests !== false) baseText += (pConf.questsPrompt || "") + "\n";
        if(mConf.codex !== false) baseText += (pConf.codexPrompt || "") + "\n";
        if(mConf.factions !== false) baseText += (pConf.factionsPrompt || "") + "\n";
        (settings.promptBlocks || []).filter(b => b.enabled).forEach(b => { baseText += `For the JSON field "${b.id}": ${b.prompt || ""}\n`; });
        baseText += `\nResponse language: ${pConf.language || 'Russian'}.\nReturn ONLY valid JSON.`;

        let memoryText = "";
        const chatId = NarrativeStorage.getCurrentChatId();
        
        if (chatId && settings.chatData && settings.chatData[chatId]) {
            const cData = settings.chatData[chatId];
            
            if (mConf.hero !== false && cData.heroSheet) {
                memoryText += `\n[User Character Stats: Level ${cData.heroSheet.level} | ` + Object.entries(cData.heroSheet.stats).map(([k,v]) => `${k.replace(/[^а-яА-Яa-zA-Z]/g, '').trim()}: ${v}`).join(', ') + `.]\n`;
            }
            
            if (mConf.codex !== false && cData.codex && cData.codex.length) {
                const actC = cData.codex.filter(c => c.active !== false);
                if (actC.length) {
                    memoryText += `\n[Unlocked Codex Entries]\n`;
                    actC.forEach(c => { memoryText += `- ${c.title || ''}: ${c.text || ''}\n`; });
                    memoryText += `[End Codex]\n`;
                }
            }
            
            // ФИКС: Явное !== false для Инвентаря и защищенный парсинг Недвижимости
            if (mConf.inventory !== false && cData.inventory) {
                const inv = cData.inventory;
                memoryText += `\n[User Inventory & Assets]\nMoney: ${inv.money || 0} ${inv.currency || ''}\n`;
                if (inv.items && inv.items.length) memoryText += `Items: ${inv.items.join(', ')}\n`;
                
                const actVeh = (inv.vehicles || []).filter(v => v && v.active);
                if (actVeh.length) memoryText += `Vehicles: ${actVeh.map(v => `${v.name || ''}${v.desc ? ` (${v.desc})` : ''}`).join(', ')}\n`;
                
                const actEst = (inv.estate || []).filter(e => e && e.active);
                if (actEst.length) memoryText += `Real Estate: ${actEst.map(e => `${e.name || ''}${e.desc ? ` (${e.desc})` : ''}`).join(', ')}\n`;
                
                memoryText += `[End Inventory]\n`;
            }
            
            if (mConf.factions !== false && cData.factions && cData.factions.length) {
                memoryText += `\n[Factions Reputation]\n` + cData.factions.map(f => {
                    let fStr = `${f.name || ''}: ${f.rep || 0}/100`;
                    if (f.descActive && f.desc) fStr += ` (${f.desc})`;
                    return fStr;
                }).join('\n') + `\n[End Factions]\n`;
            }
            
            if (mConf.quests !== false && cData.quests && cData.quests.length) {
                const actQ = cData.quests.filter(q => q.status === 'active').map(q => `- ${q.title || ''}: ${q.desc || ''}`);
                if (actQ.length) memoryText += `\n[Active Quests]\n${actQ.join('\n')}\n[End Quests]\n`;
            }
        }

        const calc = (text) => {
            if (!text) return 0;
            let t = 0;
            for(let i=0; i<text.length; i++) {
                const c = text.charCodeAt(i);
                t += (c >= 1024 && c <= 1279) ? 0.5 : 0.25;
            }
            return Math.ceil(t);
        };

        const baseTokens = calc(baseText);
        const memoryTokens = calc(memoryText);
        const totalTextTokens = baseTokens + memoryTokens;
        
        $("#nhud-local-tokens-base").text(baseTokens);
        $("#nhud-local-tokens-memory").text(memoryTokens);
        $("#nhud-local-tokens-total").text(totalTextTokens + 190); 
        
        $("#nhud-refresh-local-tokens").css("transform", "rotate(180deg)");
        setTimeout(() => $("#nhud-refresh-local-tokens").css("transform", "none"), 300);
    };

    $("#nhud-refresh-local-tokens").off('click').on('click', calculateLocalTokens);
    calculateLocalTokens();
}

export function renderHallOfFame() {
    const list = $("#nhud-hall-of-fame-list");
    if (!list.length) return;
    list.empty();
    
    const settings = getSettings();
    const chatId = NarrativeStorage.getCurrentChatId();

    // Если игрок выключил модуль
    if (!settings.modules?.achievements) {
        list.append('<div class="nhud-hof-disabled">Система достижений отключена в глобальных настройках.</div>');
        return;
    }

    const achievements = settings.chatData?.[chatId]?.achievements || [];
    
    if (achievements.length === 0) {
        list.append('<div class="nhud-hof-empty">В этом чате пока не получено достижений.</div>');
        return;
    }
    
    // Выводим от новых к старым
    [...achievements].reverse().forEach((ach, idx) => {
        const card = $(`
            <div class="nhud-achievement-card">
                <button class="nhud-del-ach" data-idx="${achievements.length - 1 - idx}" title="Удалить навсегда">✕</button>
                <div class="nhud-achievement-icon">
                    ${ach.icon || '🏆'}
                </div>
                <div>
                    <div class="nhud-achievement-title">${ach.title}</div>
                    <div class="nhud-achievement-desc">${ach.desc}</div>
                    <div class="nhud-achievement-date">Получено: ${ach.date}</div>
                </div>
            </div>
        `);
        
        card.find('.nhud-del-ach').hover(
            function() { $(this).css("color", "#e05252"); },
            function() { $(this).css("color", "#804040"); }
        ).on('click', function() {
            if(!confirm("Точно удалить это достижение?")) return;
            const realIdx = parseInt($(this).data('idx'));
            settings.chatData[chatId].achievements.splice(realIdx, 1);
            saveSettingsDebounced();
            renderHallOfFame();
        });
        
        list.append(card);
    });
}

// =========================================================================
// НОВЫЕ ФУНКЦИИ РЕНДЕРА ДЛЯ ЛЕВОЙ ПАНЕЛИ
// =========================================================================

export function renderPropertyCards(type) { // type = 'estate' или 'vehicles'
    const chatId = NarrativeStorage.getCurrentChatId();
    const settings = getSettings();
    if (!settings || !settings.chatData) return;
    const chatData = settings.chatData[chatId];
    if (!chatData) return;
    
    if (!chatData.inventory) chatData.inventory = { money: 0, currency: "Золото", items: [], estate: [], vehicles: [] };
    const inv = chatData.inventory;
    if (!inv[type]) inv[type] = [];

    // Конвертация старых строк в объекты + добавляем флаг expanded (развернуто ли описание)
    inv[type] = inv[type].map(item => typeof item === 'string' ? { name: item, desc: "", bgUrl: "", active: false, expanded: true } : item);

    const container = $(`#nhud-settings-${type}-list`);
    container.empty();

    inv[type].forEach((item, idx) => {
        // Делаем фон чуть темнее, чтобы текст на нем читался хорошо
        const cardBg = item.bgUrl ? `linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url('${item.bgUrl}') center/cover` : `linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8))`;
        
        const isActive = item.active;
        const activeBtnClass = isActive ? "nhud-prop-toggle-btn active" : "nhud-prop-toggle-btn inactive";

        const isExpanded = item.expanded !== false; // По умолчанию описание открыто

        const card = $(`
            <div class="nhud-property-card ${isActive ? 'active' : ''} ${item.bgUrl ? 'has-bg' : ''}" style="background: ${cardBg};">
                
                <div class="nhud-property-header">
                    <div style="display:flex; align-items:center; flex:1; gap:6px;">
                        <button class="nhud-prop-accordion-btn" title="Свернуть/Развернуть описание">${isExpanded ? '▼' : '▶'}</button>
                        <input class="nhud-prop-name nhud-input" type="text" value="${item.name}" placeholder="Название..." />
                    </div>
                    
                    <div style="display:flex; gap:4px; margin-left:6px;">
                        <button class="nhud-prop-toggle-btn ${activeBtnClass}" title="Вшить в память ИИ (Активно)">
                            ${isActive ? '👁️ В памяти' : '👁️‍🗨️ Скрыто'}
                        </button>
                        <button class="nhud-prop-prompt-btn" title="Вставить описание текстом в поле ввода чата">💬</button>
                        <button class="nhud-prop-settings-btn" title="Настройки (URL картинки и Удаление)">⚙️</button>
                    </div>
                </div>

                <div class="nhud-prop-desc-container" style="display:${isExpanded ? 'block' : 'none'};">
                    <textarea class="nhud-prop-desc nhud-textarea" rows="3" placeholder="Красивое описание... (Оно будет вшито в память ИИ, если горит глазик)" style="width:100%; box-sizing:border-box;">${item.desc || ''}</textarea>
                </div>

                <div class="nhud-prop-settings-container">
                    <div class="nhud-prop-settings-title">Технические настройки</div>
                    <input class="nhud-prop-bg nhud-input" type="text" value="${item.bgUrl || ''}" placeholder="URL фона (картинка)" style="width:100%; box-sizing:border-box; margin-bottom:6px;" />
                    <button class="nhud-prop-del-btn nhud-s-delete">🗑️ Удалить карточку навсегда</button>
                </div>
            </div>
        `);

        card.find('.nhud-prop-name').on('change', e => { item.name = e.target.value; saveSettingsDebounced(); });
        card.find('.nhud-prop-desc').on('change', e => { item.desc = e.target.value; saveSettingsDebounced(); });
        card.find('.nhud-prop-bg').on('change', e => { item.bgUrl = e.target.value; saveSettingsDebounced(); renderPropertyCards(type); });
        
        // Гармошка описания
        card.find('.nhud-prop-accordion-btn').on('click', function() {
            item.expanded = !item.expanded;
            saveSettingsDebounced();
            card.find('.nhud-prop-desc-container').slideToggle(150);
            $(this).text(item.expanded ? '▼' : '▶');
        });

        // Открытие шестеренки
        card.find('.nhud-prop-settings-btn').on('click', () => {
            card.find('.nhud-prop-settings-container').slideToggle(150);
        });

        // Глазик
        card.find('.nhud-prop-toggle-btn').on('click', () => {
            item.active = !item.active;
            saveSettingsDebounced();
            renderPropertyCards(type);
        });

        // Кнопка 💬
        card.find('.nhud-prop-prompt-btn').on('click', () => {
            const chatInput = document.getElementById("send_textarea");
            if (chatInput) {
                const textToInsert = `[${item.name}]: ${item.desc}`;
                chatInput.value = chatInput.value ? chatInput.value + "\n" + textToInsert : textToInsert;
                chatInput.dispatchEvent(new Event('input', { bubbles: true }));
                toastr.success(`Описание "${item.name}" добавлено в поле ввода!`);
            }
        });

        // Удаление
        card.find('.nhud-prop-del-btn').on('click', () => {
            if(!confirm("Удалить карточку навсегда?")) return;
            inv[type].splice(idx, 1);
            saveSettingsDebounced();
            renderPropertyCards(type);
        });

        container.append(card);
    });
}

export function renderSettingsProperty() {
    const chatId = NarrativeStorage.getCurrentChatId();
    const settings = getSettings();
    if (!settings || !settings.chatData) return;
    const chatData = settings.chatData[chatId];
    if (!chatData) return;
    if (!chatData.inventory) chatData.inventory = { money: 0, currency: "Золото", items: [], estate: [], vehicles: [] };
    const inv = chatData.inventory;

    // Карточки имущества
    renderPropertyCards('estate');
    renderPropertyCards('vehicles');

    // МОДУЛЬ 1: Гардероб
    renderOutfitPanel();

    // МОДУЛЬ 3: Авто-инвентари
    renderAutoInventories();
}

// ========================================================================
// МОДУЛЬ 1: Гардероб
// ========================================================================

export function renderOutfitPanel() {
    const list = $('#nhud-settings-outfit-list');
    list.empty();
    const settings = getSettings();
    const live = settings.liveData;
    if (!live) return;

    const statsEnabled = settings.modules?.enableOutfitStats;
    const entries = [];

    // User (игрок) — пропускаем, у него отдельный блок "Мой наряд"
    const userName = getUserName ? getUserName() : 'Игрок';

    // Все остальные персонажи
    if (!live.characters) live.characters = {};
    for (const [name, data] of Object.entries(live.characters)) {
        if (name === userName) continue; // пропускаем игрока
        if (typeof data.outfit === 'string') {
            data.outfit = { head: '', torso: data.outfit, legs: '', feet: '', accessories: '' };
        }
        entries.push([name, data]);
    }

    if (entries.length === 0) {
        list.append('<div style="font-size:11px; color:#606080; padding:8px;">Нет персонажей</div>');
        return;
    }

    const slots = [
        { key: 'head', label: '🧢 Голова', placeholder: 'Шляпа, шлем...' },
        { key: 'torso', label: '👕 Торс', placeholder: 'Рубашка, броня...' },
        { key: 'legs', label: '👖 Ноги', placeholder: 'Джинсы, штаны...' },
        { key: 'feet', label: '👞 Обувь', placeholder: 'Ботинки, сапоги...' },
        { key: 'accessories', label: '💍 Аксессуары', placeholder: 'Амулет, кольцо...' }
    ];

    for (const [name, data] of entries) {
        if (!data.outfit || typeof data.outfit !== 'object') {
            data.outfit = { head: '', torso: '', legs: '', feet: '', accessories: '' };
        }

        let slotsHtml = '';
        for (const slot of slots) {
            const val = (data.outfit[slot.key] || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            slotsHtml += `
                <div class="nhud-outfit-slot-row">
                    <span class="nhud-outfit-slot-label">${slot.label}</span>
                    <textarea class="nhud-input nhud-outfit-slot" data-char="${name}" data-slot="${slot.key}"
                        placeholder="${slot.placeholder}" rows="1">${val}</textarea>
                </div>`;
        }

        const card = $(`<div class="nhud-outfit-card">
            <div class="nhud-outfit-card-title">${name}</div>
            ${slotsHtml}
        </div>`);
        list.append(card);
    }

    list.find('.nhud-outfit-slot').on('change', function() {
        const char = $(this).data('char');
        const slot = $(this).data('slot');
        if (!live.characters[char].outfit) live.characters[char].outfit = {};
        live.characters[char].outfit[slot] = $(this).val();
        saveSettingsDebounced();
    });
}

// ========================================================================
// МОДУЛЬ 3: Авто-инвентари (Player & Bot)
// ========================================================================

export function renderAutoInventories() {
    const settings = getSettings();
    const live = settings.liveData;
    if (!live) return;

    // Гардероб Игрока (read-only для ИИ)
    const outfitOn = settings.modules?.injectPlayerOutfit || false;
    $('#nhud-player-outfit-eye').text(outfitOn ? '👁️' : '👁️‍🗨️').toggleClass('off', !outfitOn);
    $('#nhud-player-outfit-eye').off('click').on('click', () => {
        settings.modules.injectPlayerOutfit = !settings.modules.injectPlayerOutfit;
        saveSettingsDebounced();
        renderAutoInventories();
    });
    if (!live.playerOutfitText && typeof live.playerOutfitText !== 'string') live.playerOutfitText = '';
    $('#nhud-player-outfit-text').val(live.playerOutfitText).off('input').on('input', function() {
        live.playerOutfitText = $(this).val();
        saveSettingsDebounced();
    });

    // Кошелёк (из старого chatData.inventory)
    const chatId = NarrativeStorage.getCurrentChatId();
    const chatData = settings.chatData?.[chatId];
    if (chatData) {
        if (!chatData.inventory) chatData.inventory = { money: 0, currency: "Золото", items: [], estate: [], vehicles: [] };
        const inv = chatData.inventory;
        $("#nhud-settings-money").val(inv.money).off('change').on('change', e => { inv.money = parseInt(e.target.value)||0; saveSettingsDebounced(); });
        $("#nhud-settings-currency").val(inv.currency).off('change').on('change', e => { inv.currency = e.target.value; saveSettingsDebounced(); });
    }

    // Player Inventory (из chatData)
    const pList = $('#nhud-settings-player-inv-list');
    pList.empty();
    if (chatData) {
        if (!chatData.inventory) chatData.inventory = { money: 0, currency: "Золото", items: [], estate: [], vehicles: [] };
        const inv = chatData.inventory;

        // Миграция старых данных из playerInventory в inventory.items
        if (chatData.playerInventory && chatData.playerInventory.length > 0) {
            if (!Array.isArray(inv.items)) inv.items = [];
            inv.items = [...new Set([...inv.items, ...chatData.playerInventory])];
            delete chatData.playerInventory; // удаляем старый массив
            saveSettingsDebounced();
        }

        if (!Array.isArray(inv.items)) inv.items = [];
        inv.items.forEach((item, idx) => {
            const itemName = typeof item === 'object' ? (item.name || JSON.stringify(item)) : item;
            pList.append(`<div class="nhud-inv-item-row">
                <span>${itemName}</span>
                <button class="nhud-pinv-del nhud-s-delete" data-idx="${idx}">✕</button>
            </div>`);
        });
        
        pList.find('.nhud-pinv-del').on('click', function() {
            inv.items.splice(parseInt($(this).data('idx')), 1);
            saveSettingsDebounced();
            renderAutoInventories();
            // Обновляем плавающее окно, если оно открыто
            if ($("#nhud-inventory-modal").is(":visible")) {
                import('./components/modals/InventoryModal.js').then(m => m.renderInventory());
            }
        });
        
        $('#nhud-add-player-inv-btn').off('click').on('click', () => {
            const val = $('#nhud-add-player-inv-input').val().trim();
            if (val) {
                if (!inv.items.includes(val)) inv.items.push(val);
                saveSettingsDebounced();
                renderAutoInventories();
                $('#nhud-add-player-inv-input').val('');
                // Обновляем плавающее окно, если оно открыто
                if ($("#nhud-inventory-modal").is(":visible")) {
                    import('./components/modals/InventoryModal.js').then(m => m.renderInventory());
                }
            }
        });
    }

    // Bot Inventory (из chatData)
    const bList = $('#nhud-settings-bot-inv-list');
    bList.empty();

    if (chatData) {
        // --- ФИКС ДЕНЕГ БОТА ---
        // Инициализируем переменные, если их еще нет в базе
        if (chatData.botMoney === undefined) chatData.botMoney = 0;
        if (chatData.botCurrency === undefined) chatData.botCurrency = "Валюта";

        // Привязываем значения к инпутам и вешаем обработчики сохранения
        $("#nhud-settings-bot-money").val(chatData.botMoney).off('change').on('change', e => { 
            chatData.botMoney = parseInt(e.target.value) || 0; 
            saveSettingsDebounced(); 
        });
        $("#nhud-settings-bot-currency").val(chatData.botCurrency).off('change').on('change', e => { 
            chatData.botCurrency = e.target.value; 
            saveSettingsDebounced(); 
        });
        // -----------------------

        if (!Array.isArray(chatData.botInventory)) chatData.botInventory = [];
        chatData.botInventory.forEach((item, idx) => {
            bList.append(`<div class="nhud-inv-item-row">
                <span>${item}</span>
                <button class="nhud-binv-del nhud-s-delete" data-idx="${idx}">✕</button>
            </div>`);
        });
        bList.find('.nhud-binv-del').on('click', function() {
            chatData.botInventory.splice(parseInt($(this).data('idx')), 1);
            saveSettingsDebounced();
            renderAutoInventories();
        });
        $('#nhud-add-bot-inv-btn').off('click').on('click', () => {
            const val = $('#nhud-add-bot-inv-input').val().trim();
            if (val) {
                if (!chatData.botInventory.includes(val)) chatData.botInventory.push(val);
                saveSettingsDebounced();
                renderAutoInventories();
                $('#nhud-add-bot-inv-input').val('');
            }
        });
    }
}

// Re-exports из настроек-модулей
export { renderSettingsFactions } from "./FactionSettings.js";
export { renderSettingsHeroSheet } from "./HeroSettings.js";
export { renderSettingsQuests } from "./QuestSettings.js";
export { renderSettingsCodex } from "./CodexSettings.js";
export { renderSettingsCalendar } from "./CalendarSettings.js";

// --- БРОНЕБОЙНЫЙ ФИКС ЗАЛИПАНИЯ ВКЛАДОК ---
document.addEventListener('click', function(e) {
    // Ищем вкладку по ПРАВИЛЬНОМУ классу .nhud-tab
    const tab = e.target.closest('.nhud-tab, .nhud-s-tab, .nhud-g-tab');
    if (!tab) return;

    // Ищем любой родительский контейнер, где лежат вкладки
    const menuContainer = tab.closest('#nhud-settings-panel, #nhud-global-settings, .nhud-left-panel, .nhud-sidebar');
    if (menuContainer) {
        // Сдираем active со всех
        menuContainer.querySelectorAll('.nhud-tab, .nhud-s-tab, .nhud-g-tab').forEach(t => {
            t.classList.remove('active');
        });
        // Вешаем только на нажатую
        tab.classList.add('active');
    }
}, true);