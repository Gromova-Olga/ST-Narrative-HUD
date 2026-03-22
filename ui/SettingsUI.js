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
    panel.append('<button id="nhud-left-mode-toggle" style="position:absolute; top:-5px; right:15px; background:none; border:none; color:var(--nhud-accent, #d05070); font-size:16px; font-weight:bold; cursor:pointer; padding:0; z-index:100; transition:0.2s;">◧</button>');
    // Добавляем ползунок изменения ширины на правую границу
    panel.append('<div id="nhud-left-resize-handle" style="position:absolute; right:-4px; top:0; bottom:0; width:8px; cursor:ew-resize; z-index:10; background:transparent;"></div>');

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

        <div id="nhud-settings-panel" style="display:none; position:fixed; top:40px; bottom:0; left:0; z-index:9990; background:var(--nhud-left-bg, #151220); border-right:1px solid var(--nhud-border, #3a1525); flex-direction:column; box-shadow:5px 0 25px rgba(0,0,0,0.8);">
            <div id="nhud-settings-header" style="display:flex; justify-content:space-between; align-items:center; background:var(--nhud-left-head, linear-gradient(180deg, #2a101a, #1a0a10)); padding:10px 15px; border-bottom:1px solid var(--nhud-border, #4a1525);">
                <span style="font-weight:bold; color:var(--nhud-left-text, #e0c0c0); text-shadow:0 2px 4px rgba(0,0,0,0.5);">⚔️ Narrative HUD</span>
                <button id="nhud-settings-close" style="background:none; border:none; color:var(--nhud-accent, #d05070); font-size:18px; cursor:pointer; padding:0;">✕</button>
            </div>
            
            <div id="nhud-settings-body" style="display:flex; flex:1; overflow:hidden; flex-direction:column;">
                
                <div id="nhud-settings-tabs" style="display:flex; flex-wrap:wrap; background:rgba(0,0,0,0.4); border-bottom:1px solid var(--nhud-border, #3a1525); flex-shrink:0;">
                    <button class="nhud-tab active" data-tab="trackers" title="Трекеры" style="padding:8px; background:none; border:none; color:var(--nhud-left-text, #e0c0c0); font-weight:bold; cursor:pointer;">📊 <span class="nhud-tab-text">Трекеры</span></button>
                    <button class="nhud-tab" data-tab="property" title="Имущество" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">🎒 <span class="nhud-tab-text">Имущество</span></button>
                    <button class="nhud-tab" data-tab="journal" title="Журнал" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">📜 <span class="nhud-tab-text">Журнал</span></button>
                    <button class="nhud-tab" data-tab="halloffame" title="Зал Славы" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">🏆 <span class="nhud-tab-text">Зал Славы</span></button>
                    <button class="nhud-tab" data-tab="characters" title="Персонажи" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">👥 <span class="nhud-tab-text">Перс.</span></button>
                    <button class="nhud-tab" data-tab="prompts" title="Промты" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">📝 <span class="nhud-tab-text">Промты</span></button>
                    <button class="nhud-tab" data-tab="api" title="API и JSON" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">🔌 <span class="nhud-tab-text">API</span></button>
                    <button class="nhud-tab" data-tab="storage" title="База Данных" style="padding:8px; background:none; border:none; color:var(--nhud-text-muted, #a08080); cursor:pointer;">🗄️ <span class="nhud-tab-text">База</span></button>
                </div>
                
                <div id="nhud-settings-content" style="flex:1; overflow-y:auto; padding:15px; background:rgba(0,0,0,0.2);">

                    <div class="nhud-tab-content active-tab" data-tab="trackers">
                        <div id="nhud-settings-rel-container-placeholder"></div>
                        <details style="margin-top:10px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#a090c0; cursor:pointer; padding:5px; outline:none; user-select:none;">🏴‍☠️ Отношения с фракциями</summary>
                            <div id="nhud-settings-factions-list" style="margin-top:10px;"></div>
                        </details>
                        <details style="margin-top:10px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#52a8e0; cursor:pointer; padding:5px; outline:none; user-select:none;">🧬 Статы Героя</summary>
                            <div id="nhud-settings-hero-sheet" style="margin-top:10px;"></div>
                        </details>
                    </div>

                    <div class="nhud-tab-content" data-tab="property">
                        <details open style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:var(--nhud-accent, #d05070); cursor:pointer; padding:5px; outline:none; user-select:none;">📉 Основные трекеры (Здоровье, Мана...)</summary>
                            <div class="nhud-section-hint" style="margin-top:10px;">Название · ID (для JSON) · Макс · Цвет</div>
                            <div id="nhud-settings-tracker-list"></div>
                            <button id="nhud-add-tracker" class="nhud-add-btn">+ Добавить трекер</button>
                        </details>
                        
                        <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid var(--nhud-border); margin-bottom:15px;">
                            <div style="font-size:11px; color:#a0a0b8; text-transform:uppercase; margin-bottom:6px; font-weight:bold;">💰 Кошелек</div>
                            <div style="display:flex; gap:6px;">
                                <input id="nhud-settings-money" type="number" class="nhud-input" style="flex:1; font-weight:bold; color:#52e0a3; font-size:14px;" />
                                <input id="nhud-settings-currency" type="text" class="nhud-input" style="width:100px; text-align:center;" placeholder="Валюта" />
                            </div>
                        </div>

                        <details open style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#e0a352; cursor:pointer; padding:5px; outline:none; user-select:none;">🎒 Инвентарь</summary>
                            <div id="nhud-settings-inventory-list" style="margin-top:10px;"></div>
                        </details>

                        <details style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#a0d0e0; cursor:pointer; padding:5px; outline:none; user-select:none;">🏠 Недвижимость</summary>
                            <div id="nhud-settings-estate-list" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
                            <button id="nhud-add-estate" class="nhud-add-btn">+ Добавить недвижимость</button>
                        </details>

                        <details style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#e080b0; cursor:pointer; padding:5px; outline:none; user-select:none;">🚗 Транспорт</summary>
                            <div id="nhud-settings-vehicles-list" style="margin-top:10px; display:flex; flex-direction:column; gap:8px;"></div>
                            <button id="nhud-add-vehicle" class="nhud-add-btn">+ Добавить транспорт</button>
                        </details>
                    </div>

                    <div class="nhud-tab-content" data-tab="journal">
                        <details open style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#e0c0a0; cursor:pointer; padding:5px; outline:none; user-select:none;">📜 Квесты</summary>
                            <div id="nhud-settings-quests-list" style="margin-top:10px;"></div>
                        </details>
                        <details open style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#b080e0; cursor:pointer; padding:5px; outline:none; user-select:none;">📖 Сюжетный Кодекс</summary>
                            <div id="nhud-settings-codex-list" style="margin-top:10px;"></div>
                        </details>
                        <details open style="margin-bottom:15px; border:1px solid var(--nhud-border, #3a1525); border-radius:4px; padding:5px; background:rgba(0,0,0,0.2);">
                            <summary class="nhud-acc-header" style="font-weight:bold; color:#70d090; cursor:pointer; padding:5px; outline:none; user-select:none;">📅 Календарь событий</summary>
                            <div id="nhud-settings-calendar-wrap" style="margin-top:10px;"></div>
                        </details>
                    </div>

                    <div class="nhud-tab-content" data-tab="halloffame">
                        <div style="text-align:center; margin-bottom:15px;">
                            <h3 style="margin:0; color:#52e0a3; text-shadow:0 0 10px rgba(82,224,163,0.3);">🏆 Зал Славы</h3>
                            <div style="font-size:0.8em; color:var(--nhud-text-muted);">Здесь хранятся ваши великие (и не очень) свершения</div>
                        </div>
                        <div id="nhud-hall-of-fame-list" style="display:flex; flex-direction:column; gap:10px;"></div>
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
                        <div style="border-top:1px solid var(--nhud-border);padding-top:12px;margin-top:4px;">
                            <div class="nhud-section-hint">Блоки промтов — каждый блок это отдельное поле в JSON ответе:</div>
                            <div id="nhud-prompt-blocks-list"></div>
                            <button id="nhud-add-prompt-block" class="nhud-add-btn">+ Добавить блок</button>
                            <div style="height: 60px; width: 100%; flex-shrink: 0;"></div>
                        </div>
                    </div>

                    <div class="nhud-tab-content" data-tab="api">
                        <h4 style="color:#d05070; margin-top:0;">🔌 Подключение</h4>
                        <div id="nhud-proxy-instruction-btn" style="background:rgba(224, 82, 82, 0.15); border:1px solid #e05252; border-radius:4px; padding:10px; margin-bottom:15px; cursor:pointer; text-align:center; transition:0.2s;">
                            <span style="color:#e05252; font-weight:bold; font-size:14px;">⚠️ ВАЖНО: ОЗНАКОМЬТЕСЬ С ИНСТРУКЦИЕЙ ПО ПРОКСИ!</span>
                            <div style="font-size:11px; color:#d0d0a0; margin-top:4px;">Нажмите здесь, чтобы узнать, как правильно настроить профили OpenRouter и сторонних API</div>
                        </div>
                        <div class="nhud-field-group"><label>Профиль подключения</label><select id="nhud-settings-profile-select" class="nhud-select"></select></div>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-auto-send" type="checkbox" /><label for="nhud-auto-send" style="color:#d0b0b0;">Авто-отправка после каждого сообщения бота</label></div>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-send-with-main" type="checkbox" /><label for="nhud-send-with-main" style="color:#d0b0b0;">Отправлять вместе с основным запросом (Вшивать в пресет)</label></div>
                        <div class="nhud-field-group nhud-checkbox-group" style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--nhud-border);">
                            <input id="nhud-light-mode" type="checkbox" />
                            <label for="nhud-light-mode" style="color:#e0d0a0;"><strong>⚡ Лайт-режим (Экономия токенов)</strong></label>
                        </div>
                        <div style="font-size:11px; color:#a0a0b0; padding-left:24px; margin-bottom:8px; line-height:1.4;">
                            Уникальный алгоритм фонового парсинга для слабых моделей (ДЕЛАЕТ ДВА ЗАПРОСА).<br>
                            Вместо того чтобы заставлять ИИ писать тяжелый JSON в каждом ответе, мод делает два запроса:<br>
                            1. ИИ пишет красивый художественный ответ (без лишних инструкций).<br>
                            2. Мод незаметно делает второй, "тихий" запрос с минимальным контекстом для извлечения статов и прочего.<br>
                            <span style="color:#52e0a3;">Результат: огромная экономия контекста и никаких сломанных ответов бота!</span>
                        </div>
                        <div style="border-top:1px solid var(--nhud-border);padding-top:12px;margin-top:8px;">
                            <div class="nhud-section-hint">Параметры запроса:</div>
                            <div class="nhud-field-group"><label>Сообщений контекста</label><input id="nhud-context-messages" class="nhud-input" type="number" min="1" max="50" style="width:80px;" /></div>
                            <div class="nhud-field-group"><label>Макс. токенов ответа</label><input id="nhud-max-tokens" class="nhud-input" type="number" min="100" max="8000" style="width:100px;" /></div>
                            <div class="nhud-field-group"><label>Температура (0.0 — 2.0)</label><input id="nhud-temperature" class="nhud-input" type="number" min="0" max="2" step="0.1" style="width:80px;" /></div>
                        </div>

                        <h4 style="color:#d05070; margin-top:20px; border-top:1px solid var(--nhud-border); padding-top:15px;">🔍 Парсер JSON</h4>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-parser-enabled" type="checkbox" /><label for="nhud-parser-enabled">Включить автоматический парсинг JSON</label></div>
                        <div class="nhud-field-group"><label>Открывающий тег</label><input id="nhud-parser-open-tag" class="nhud-input" type="text" placeholder="[NHUD]" /></div>
                        <div class="nhud-field-group"><label>Закрывающий тег</label><input id="nhud-parser-close-tag" class="nhud-input" type="text" placeholder="[/NHUD]" /></div>
                        <div class="nhud-field-group nhud-checkbox-group"><input id="nhud-parser-auto-remove" type="checkbox" /><label for="nhud-parser-auto-remove">Автоматически удалять теги из сообщений</label></div>
                        <div class="nhud-field-group"><button id="nhud-parser-test" class="nhud-add-btn">🔍 Тест парсера</button></div>
                    </div>

                    <div class="nhud-tab-content" data-tab="storage">
                        <div class="nhud-field-group">
                            <label>Статистика текущего чата</label>
                            <div id="nhud-storage-stats" class="nhud-stats-box" style="background:rgba(0,0,0,0.3); border:1px solid var(--nhud-border); padding:10px; border-radius:4px;"><div>Загрузка...</div></div>
                        </div>
                        <div class="nhud-field-group">
                            <label>Экспорт / Импорт</label>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                <button id="nhud-export-btn" class="nhud-add-btn" style="background:#2a101a; border-color:#5a2035;">📤 Экспорт чата</button>
                                <label class="nhud-add-btn" style="cursor:pointer; background:#2a101a; border-color:#5a2035;">📥 Импорт<input id="nhud-import-file" type="file" accept=".json" style="display:none;" /></label>
                            </div>
                        </div>
                        <div class="nhud-field-group" style="margin-top:16px;border-top:1px dashed var(--nhud-border);padding-top:12px;">
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

    $("#nhud-settings-tabs").off("click").on("click", ".nhud-tab", function() {
        const tab = $(this).data("tab");
        $(".nhud-tab").css({ color: "var(--nhud-text-muted, #a08080)", fontWeight: "normal" });
        $(this).css({ color: "var(--nhud-text-main, #e0c0c0)", fontWeight: "bold" });
        $(".nhud-tab-content").removeClass("active-tab");
        $(`.nhud-tab-content[data-tab="${tab}"]`).addClass("active-tab");
        
        if (tab === "trackers") { renderSettingsFactions(); renderSettingsHeroSheet(); }
        if (tab === "property") { renderSettingsTrackers(); if (typeof renderSettingsProperty === 'function') renderSettingsProperty(); }
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
    
    $("#nhud-proxy-instruction-btn").hover(function() { $(this).css("background", "rgba(224, 82, 82, 0.25)"); }, function() { $(this).css("background", "rgba(224, 82, 82, 0.15)"); }).on("click", () => {
        $("#nhud-custom-proxy-modal").remove();
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
            
            data.liveData.ignoredCharacters.forEach(ignoredName => {
                const badge = $(`
                    <button class="nhud-unignore-single-btn" title="Вернуть ${ignoredName} в HUD" style="background:rgba(82, 168, 224, 0.15); border:1px solid #3a5a80; color:#80b0e0; border-radius:4px; padding:3px 8px; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; transition:0.2s;" onmouseover="this.style.background='rgba(82, 168, 224, 0.3)'" onmouseout="this.style.background='rgba(82, 168, 224, 0.15)'">
                        👻 ${ignoredName}
                    </button>
                `);
                
                badge.on('click', function() {
                    data.liveData.ignoredCharacters = data.liveData.ignoredCharacters.filter(n => n !== ignoredName);
                    
                    if (!data.liveData.characters) data.liveData.characters = {};
                    data.liveData.characters[ignoredName] = { outfit: "", state: "", thoughts: "" };
                    
                    extension_settings[extensionName] = settings;
                    saveSettingsDebounced();
                    
                    if (chatId === NarrativeStorage.getCurrentChatId()) {
                        getSettings().liveData.ignoredCharacters = getSettings().liveData.ignoredCharacters.filter(n => n !== ignoredName);
                        getSettings().liveData.characters[ignoredName] = { outfit: "", state: "", thoughts: "" };
                        
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

            card.find('.nhud-s-rel-journal-btn').on('click', function(e) {
                e.stopPropagation();
                if (typeof openRelationshipJournal === 'function') openRelationshipJournal($(this).data('name'));
            });

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
                saveSettingsDebounced(); renderRelationships();
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
}

export function renderSettingsPrompts() {
    const settings = getSettings();
    
    if (!$("#nhud-local-token-tracker").length) {
        $("#nhud-prompt-system").parent().before(`
            <details id="nhud-local-token-tracker" style="background:rgba(20,0,0,0.3); border:1px solid #802030; border-radius:4px; padding:5px; margin-bottom:15px;" open>
                <summary class="nhud-cen-head" style="cursor:pointer; color:#e05252; font-weight:bold; outline:none; padding:5px; display:flex; justify-content:space-between; align-items:center;">
                    <span>📊 Расход токенов в ЭТОМ чате</span>
                    <button id="nhud-refresh-local-tokens" title="Пересчитать" style="background:none; border:none; color:#a08080; cursor:pointer; font-size:12px; transition:0.3s;">🔄</button>
                </summary>
                <div style="padding:10px; display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--nhud-left-text);">
                    <div style="display:flex; justify-content:space-between;"><span>Базовые промпты:</span><span id="nhud-local-tokens-base">0</span></div>
                    <div style="display:flex; justify-content:space-between; color:#52a8e0; font-weight:bold;"><span>Вшитая память (Имущество, Лор, и т.д.):</span><span id="nhud-local-tokens-memory">0</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>Структура JSON (Скелет):</span><span>190</span></div>
                    <div style="border-top:1px dashed #802030; margin:4px 0;"></div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px; color:#e0c0c0;"><span>Итого к запросу:</span><span><span id="nhud-local-tokens-total">0</span> токенов</span></div>
                    <div style="font-size:9px; color:#a08080; margin-top:4px;">* Пересчитывается при нажатии 🔄 или переоткрытии вкладки.</div>
                </div>
            </details>
        `);
    }

    $("#nhud-prompt-system").val(settings.prompts.system);
    $("#nhud-prompt-language").val(settings.prompts.language || "Russian");
    const rs = settings.requestSettings;
    $("#nhud-auto-send").prop("checked", settings.autoSend);
    $("#nhud-send-with-main").prop("checked", rs.sendWithMain || false);
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
        list.append('<div style="text-align:center; color:#806060; padding:20px; background:rgba(0,0,0,0.2); border-radius:8px; border:1px dashed #3a1525;">Система достижений отключена в глобальных настройках.</div>');
        return;
    }

    const achievements = settings.chatData?.[chatId]?.achievements || [];
    
    if (achievements.length === 0) {
        list.append('<div style="text-align:center; color:#606080; padding:20px; background:rgba(0,0,0,0.2); border-radius:8px; border:1px dashed #3a1525;">В этом чате пока не получено достижений.</div>');
        return;
    }
    
    // Выводим от новых к старым
    [...achievements].reverse().forEach((ach, idx) => {
        const card = $(`
            <div style="display:flex; gap:12px; background:linear-gradient(90deg, rgba(0,0,0,0.4), rgba(42,16,26,0.2)); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; padding:10px; align-items:center; position:relative;">
                <button class="nhud-del-ach" data-idx="${achievements.length - 1 - idx}" style="position:absolute; top:5px; right:5px; background:none; border:none; color:#804040; cursor:pointer; font-size:12px; transition:0.2s;" title="Удалить навсегда">✕</button>
                <div style="font-size:24px; background:rgba(0,0,0,0.3); border:1px solid var(--nhud-accent, #d05070); width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:50%; flex-shrink:0;">
                    ${ach.icon || '🏆'}
                </div>
                <div>
                    <div style="color:#52e0a3; font-weight:bold; font-size:14px; margin-bottom:2px;">${ach.title}</div>
                    <div style="color:var(--nhud-text-main, #e0b0b0); font-size:12px; margin-bottom:4px;">${ach.desc}</div>
                    <div style="color:var(--nhud-text-muted, #606080); font-size:10px;">Получено: ${ach.date}</div>
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
    const chatData = getSettings().chatData[chatId];
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
        const activeBtnStyle = isActive 
            ? "background:var(--nhud-accent, #d05070); color:#fff; border-color:var(--nhud-accent, #d05070); box-shadow:0 0 10px rgba(208,80,112,0.4);" 
            : "background:rgba(255,255,255,0.1); color:#a0a0b0; border-color:transparent;";

        const isExpanded = item.expanded !== false; // По умолчанию описание открыто

        const card = $(`
            <div class="nhud-property-card" style="background: ${cardBg}; border-radius: 6px; border: 1px solid ${isActive ? 'var(--nhud-accent, #d05070)' : '#3a3050'}; transition: 0.2s; margin-bottom: 8px; overflow:hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                
                <div class="nhud-property-header" style="display:flex; justify-content:space-between; align-items:center; padding: 6px 8px; background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; align-items:center; flex:1; gap:6px;">
                        <button class="nhud-prop-accordion-btn" style="background:none; border:none; color:#e0c0c0; cursor:pointer; font-size:12px; padding:0; width:16px; transition:0.2s;" title="Свернуть/Развернуть описание">${isExpanded ? '▼' : '▶'}</button>
                        <input class="nhud-prop-name nhud-input" type="text" value="${item.name}" placeholder="Название..." style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:#e0c0c0; font-weight:bold; flex:1; padding:4px 6px;" />
                    </div>
                    
                    <div style="display:flex; gap:4px; margin-left:6px;">
                        <button class="nhud-prop-toggle-btn" style="border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer; font-weight:bold; transition:0.2s; ${activeBtnStyle}" title="Вшить в память ИИ (Активно)">
                            ${isActive ? '👁️ В памяти' : '👁️‍🗨️ Скрыто'}
                        </button>
                        <button class="nhud-prop-prompt-btn" style="background:rgba(82,168,224,0.2); border:1px solid #3a5a80; color:#80b0e0; border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer; font-weight:bold;" title="Вставить описание текстом в поле ввода чата">💬</button>
                        <button class="nhud-prop-settings-btn" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer;" title="Настройки (URL картинки и Удаление)">⚙️</button>
                    </div>
                </div>

                <div class="nhud-prop-desc-container" style="display:${isExpanded ? 'block' : 'none'}; padding:8px;">
                    <textarea class="nhud-prop-desc nhud-textarea" rows="3" placeholder="Красивое описание... (Оно будет вшито в память ИИ, если горит глазик)" style="font-size:12px; background:rgba(0,0,0,0.4); color:#e0d0c0; border:1px solid rgba(255,255,255,0.1); box-shadow: inset 0 0 10px rgba(0,0,0,0.5); text-shadow: 0 1px 2px #000; width:100%; box-sizing:border-box;">${item.desc || ''}</textarea>
                </div>

                <div class="nhud-prop-settings-container" style="display:none; padding:8px; background:rgba(0,0,0,0.85); border-top:1px dashed #d05070;">
                    <div style="font-size:10px; color:#d05070; margin-bottom:4px; text-transform:uppercase;">Технические настройки</div>
                    <input class="nhud-prop-bg nhud-input" type="text" value="${item.bgUrl || ''}" placeholder="URL фона (картинка)" style="font-size:11px; padding:4px; width:100%; box-sizing:border-box; margin-bottom:6px;" />
                    <button class="nhud-prop-del-btn nhud-s-delete" style="padding:4px; font-size:11px; width:100%;">🗑️ Удалить карточку навсегда</button>
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
    const chatData = getSettings().chatData[chatId];
    if (!chatData) return;
    if (!chatData.inventory) chatData.inventory = { money: 0, currency: "Золото", items: [], estate: [], vehicles: [] };
    const inv = chatData.inventory;

    // Кошелек
    $("#nhud-settings-money").val(inv.money).off('change').on('change', e => { inv.money = parseInt(e.target.value)||0; saveSettingsDebounced(); });
    $("#nhud-settings-currency").val(inv.currency).off('change').on('change', e => { inv.currency = e.target.value; saveSettingsDebounced(); });

    // Обычный инвентарь
    const invList = $("#nhud-settings-inventory-list");
    invList.empty();
    inv.items.forEach((item, idx) => {
        invList.append(`
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:4px; border:1px solid #2a2040; margin-bottom:4px; font-size:12px;">
                <span>${item}</span>
                <button class="nhud-inv-del nhud-s-delete" data-idx="${idx}" style="padding:2px 6px; font-size:10px; margin:0;">✕</button>
            </div>
        `);
    });
    invList.append(`
        <div style="display:flex; gap:4px; margin-top:6px;">
            <input id="nhud-s-inv-add-val" type="text" class="nhud-input" style="flex:1; padding:4px; font-size:11px;" placeholder="Добавить предмет..." />
            <button id="nhud-s-inv-add-btn" class="nhud-add-btn" style="margin:0; padding:4px 8px;">+</button>
        </div>
    `);
    
    invList.find('.nhud-inv-del').on('click', function() {
        inv.items.splice(parseInt($(this).data('idx')), 1); saveSettingsDebounced(); renderSettingsProperty();
    });
    invList.find('#nhud-s-inv-add-btn').on('click', function() {
        const val = $("#nhud-s-inv-add-val").val().trim();
        if (val) { inv.items.push(val); saveSettingsDebounced(); renderSettingsProperty(); }
    });

    // Карточки имущества
    renderPropertyCards('estate');
    renderPropertyCards('vehicles');
}

// =========================================================================
// РЕНДЕРЫ ДЛЯ ЛЕВОЙ ПАНЕЛИ (ТРЕКЕРЫ И ЖУРНАЛ)
// =========================================================================

export function renderSettingsFactions() {
    const container = $("#nhud-settings-factions-list");
    if (!container.length) return;
    container.empty();

    const chatId = NarrativeStorage.getCurrentChatId();
    const chatData = getSettings().chatData[chatId];
    if (!chatData) return;
    
    if (!chatData.factions) chatData.factions = [];
    // Обновляем структуру старых фракций
    chatData.factions = chatData.factions.map(f => ({ ...f, desc: f.desc || "", bgUrl: f.bgUrl || "", descActive: f.descActive || false, expanded: f.expanded !== false }));
    const factions = chatData.factions;

    factions.forEach((f, idx) => {
        let barColor = "#a090c0"; if (f.rep < 30) barColor = "#e05252"; else if (f.rep >= 80) barColor = "#52e0a3"; 
        const cardBg = f.bgUrl ? `linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url('${f.bgUrl}') center/cover` : `linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.7))`;
        
        const isDescActive = f.descActive;
        const activeBtnStyle = isDescActive 
            ? "background:var(--nhud-accent, #d05070); color:#fff; border-color:var(--nhud-accent, #d05070); box-shadow:0 0 10px rgba(208,80,112,0.4);" 
            : "background:rgba(255,255,255,0.1); color:#a0a0b0; border-color:transparent;";

        const card = $(`
            <div style="background:${cardBg}; border:1px solid var(--nhud-border); border-radius:6px; margin-bottom:8px; overflow:hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 8px; background: rgba(0,0,0,0.5); border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; align-items:center; flex:1; gap:6px;">
                        <button class="nhud-f-accordion-btn" style="background:none; border:none; color:#e0c0c0; cursor:pointer; font-size:12px; padding:0; width:16px; transition:0.2s;" title="Свернуть/Развернуть">${f.expanded ? '▼' : '▶'}</button>
                        <input type="text" class="nhud-input nhud-f-name" value="${f.name}" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:var(--nhud-left-text); font-weight:bold; padding:4px 6px; flex:1;" />
                    </div>
                    <div style="display:flex; gap:4px; margin-left:6px;">
                        <button class="nhud-f-desc-toggle" style="border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer; font-weight:bold; transition:0.2s; ${activeBtnStyle}" title="Вшить ОПИСАНИЕ в память ИИ (Сама репутация вшивается всегда)">
                            ${isDescActive ? '👁️ Описание' : '👁️‍🗨️ Без описания'}
                        </button>
                        <button class="nhud-f-settings-btn" style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); color:#fff; border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer;" title="Настройки">⚙️</button>
                    </div>
                </div>

                <div class="nhud-f-desc-container" style="display:${f.expanded ? 'block' : 'none'}; padding:8px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <div style="flex:1; height:8px; background:#1a1628; border-radius:4px; overflow:hidden; border:1px solid #2a2040; box-shadow:inset 0 0 5px rgba(0,0,0,0.8);">
                            <div style="width:${f.rep}%; height:100%; background:${barColor}; box-shadow:0 0 10px ${barColor};"></div>
                        </div>
                        <input type="number" class="nhud-input nhud-f-val" value="${f.rep}" min="0" max="100" style="width:45px; padding:4px; font-size:12px; font-weight:bold; text-align:center; background:rgba(0,0,0,0.6);" />
                    </div>
                    <textarea class="nhud-f-desc nhud-textarea" rows="2" placeholder="Описание фракции (лор)..." style="font-size:11px; background:rgba(0,0,0,0.5); color:#e0d0c0; border:1px solid rgba(255,255,255,0.1); width:100%; box-sizing:border-box;">${f.desc || ''}</textarea>
                </div>

                <div class="nhud-f-settings-container" style="display:none; padding:8px; background:rgba(0,0,0,0.85); border-top:1px dashed #d05070;">
                    <div style="font-size:10px; color:#d05070; margin-bottom:4px; text-transform:uppercase;">Технические настройки</div>
                    <input class="nhud-f-bg nhud-input" type="text" value="${f.bgUrl || ''}" placeholder="URL фона (картинка)" style="font-size:11px; padding:4px; width:100%; box-sizing:border-box; margin-bottom:6px;" />
                    <button class="nhud-f-del nhud-s-delete" style="padding:4px; font-size:11px; width:100%;">🗑️ Удалить фракцию</button>
                </div>
            </div>
        `);
        
        card.find('.nhud-f-del').on('click', () => { if(confirm("Удалить фракцию?")) { factions.splice(idx, 1); saveSettingsDebounced(); renderSettingsFactions(); }});
        card.find('.nhud-f-name').on('change', function() { f.name = $(this).val(); saveSettingsDebounced(); });
        card.find('.nhud-f-val').on('change', function() { f.rep = parseInt($(this).val()) || 0; saveSettingsDebounced(); renderSettingsFactions(); });
        card.find('.nhud-f-desc').on('change', function() { f.desc = $(this).val(); saveSettingsDebounced(); });
        card.find('.nhud-f-bg').on('change', function() { f.bgUrl = $(this).val(); saveSettingsDebounced(); renderSettingsFactions(); });
        
        card.find('.nhud-f-accordion-btn').on('click', function() {
            f.expanded = !f.expanded; saveSettingsDebounced();
            card.find('.nhud-f-desc-container').slideToggle(150);
            $(this).text(f.expanded ? '▼' : '▶');
        });
        card.find('.nhud-f-settings-btn').on('click', () => card.find('.nhud-f-settings-container').slideToggle(150));
        card.find('.nhud-f-desc-toggle').on('click', () => { f.descActive = !f.descActive; saveSettingsDebounced(); renderSettingsFactions(); });

        container.append(card);
    });

    const addBlock = $(`
        <div style="display:flex; gap:6px; margin-top:8px;">
            <input id="nhud-f-new-name" class="nhud-input" placeholder="Новая фракция..." style="flex:1;" />
            <button id="nhud-f-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
        </div>
    `);
    addBlock.find('#nhud-f-add-btn').on('click', () => {
        const name = addBlock.find('#nhud-f-new-name').val().trim();
        if (name) { factions.push({ name: name, rep: 50, desc: "", bgUrl: "", descActive: false, expanded: true }); saveSettingsDebounced(); renderSettingsFactions(); }
    });
    container.append(addBlock);
}

export function renderSettingsHeroSheet() {
    const chatId = NarrativeStorage.getCurrentChatId();
    const chatData = getSettings().chatData[chatId];
    if (!chatData) return;
    
    if (!chatData.heroSheet) chatData.heroSheet = { level: 1, xp: 0, points: 0, stats: { "💪 Сила": 1, "🏃 Ловкость": 1, "🧠 Интеллект": 1, "🗣️ Харизма": 1, "🛡️ Выносливость": 1 } };
    const sheet = chatData.heroSheet;
    
    const content = $("#nhud-settings-hero-sheet");
    content.empty();
    
    const nextLvlXp = sheet.level * 100;
    const xpPct = Math.round((sheet.xp / nextLvlXp) * 100);
    
    // Красивый блок (как в правом меню) с кнопкой шестеренки для редактирования
    const header = $(`
        <div style="position:relative; background:var(--nhud-inp-bg, rgba(0,0,0,0.3)); border-radius:6px; padding:10px; border:1px solid var(--nhud-border); margin-bottom:10px;">
            <button id="nhud-hero-settings-toggle" style="position:absolute; top:8px; right:8px; background:none; border:none; color:#a08080; cursor:pointer; font-size:14px; transition:0.2s;" title="Редактировать значения">⚙️</button>
            <div style="text-align:center; margin-bottom:10px;">
                <div style="font-size:20px; font-weight:bold; color:#e0d0a0; text-shadow:0 0 10px rgba(224,208,160,0.4);">Уровень ${sheet.level}</div>
                <div style="font-size:11px; color:var(--nhud-text-muted);">Свободных очков: <b style="color:#52e0a3; font-size:13px;">${sheet.points}</b></div>
            </div>
            <div style="height:8px; background:#1a1628; border-radius:4px; overflow:hidden; border:1px solid var(--nhud-border);">
                <div style="width:${xpPct}%; height:100%; background:linear-gradient(90deg, #52a8e0, #a0d0e0); box-shadow:0 0 5px #52a8e0;"></div>
            </div>
            <div style="text-align:right; font-size:10px; color:#80a0b0; margin-top:2px;">${sheet.xp} / ${nextLvlXp} XP</div>
        </div>
    `);
    content.append(header);

    // Скрытый блок редактирования главных статов
    const editBlock = $(`
        <div id="nhud-hero-edit-block" style="display:none; background:rgba(0,0,0,0.5); padding:10px; border-radius:6px; border:1px dashed #d05070; margin-bottom:10px;">
            <div style="font-size:10px; color:#d05070; margin-bottom:8px; text-transform:uppercase;">Технические настройки героя</div>
            <div style="display:flex; justify-content:space-between; gap:10px;">
                <div><label style="font-size:10px; color:#a08080;">Уровень</label><input type="number" id="nhud-s-hero-lvl" value="${sheet.level}" class="nhud-input" style="width:100%; padding:4px;" /></div>
                <div><label style="font-size:10px; color:#a08080;">Текущий XP</label><input type="number" id="nhud-s-hero-xp" value="${sheet.xp}" class="nhud-input" style="width:100%; padding:4px;" /></div>
                <div><label style="font-size:10px; color:#a08080;">Своб. Очки</label><input type="number" id="nhud-s-hero-pts" value="${sheet.points}" class="nhud-input" style="width:100%; padding:4px;" /></div>
            </div>
        </div>
    `);
    
    editBlock.find('#nhud-s-hero-lvl').on('change', e => { sheet.level = parseInt(e.target.value)||1; saveSettingsDebounced(); renderSettingsHeroSheet(); });
    editBlock.find('#nhud-s-hero-xp').on('change', e => { sheet.xp = parseInt(e.target.value)||0; saveSettingsDebounced(); renderSettingsHeroSheet(); });
    editBlock.find('#nhud-s-hero-pts').on('change', e => { sheet.points = parseInt(e.target.value)||0; saveSettingsDebounced(); renderSettingsHeroSheet(); });
    
    content.append(editBlock);
    header.find('#nhud-hero-settings-toggle').on('click', () => { editBlock.slideToggle(150); content.find('.nhud-s-stat-del').fadeToggle(150); });

    // Список характеристик
    for (const [stat, val] of Object.entries(sheet.stats)) {
        const statRow = $(`
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:6px 10px; border-radius:4px; border:1px solid #2a2040; margin-bottom:4px;">
                <span style="color:var(--nhud-text-main); font-size:13px; font-weight:bold;">${stat}</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="number" class="nhud-input nhud-s-stat-val" data-stat="${stat}" value="${val}" style="width:40px; padding:2px; text-align:center; font-size:14px; color:#e0d0a0; background:transparent; border:none; font-weight:bold;" />
                    <button class="nhud-s-delete nhud-s-stat-del" data-stat="${stat}" style="display:none; padding:2px 6px; font-size:10px; margin:0;" title="Удалить характеристику">✕</button>
                </div>
            </div>
        `);
        statRow.find('.nhud-s-stat-val').on('change', function() { sheet.stats[$(this).data('stat')] = parseInt($(this).val()) || 0; saveSettingsDebounced(); });
        statRow.find('.nhud-s-stat-del').on('click', function() { delete sheet.stats[$(this).data('stat')]; saveSettingsDebounced(); renderSettingsHeroSheet(); });
        content.append(statRow);
    }

    const addStat = $(`
        <div style="display:flex; gap:4px; margin-top:8px;">
            <input id="nhud-s-stat-new" type="text" class="nhud-input" style="flex:1; padding:6px; font-size:11px;" placeholder="Новая характеристика..." />
            <button id="nhud-s-stat-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
        </div>
    `);
    addStat.find('#nhud-s-stat-add-btn').on('click', () => {
        const sName = addStat.find('#nhud-s-stat-new').val().trim();
        if (sName && !sheet.stats[sName]) { sheet.stats[sName] = 0; saveSettingsDebounced(); renderSettingsHeroSheet(); }
    });
    content.append(addStat);
}

export function renderSettingsQuests() {
    const chatId = NarrativeStorage.getCurrentChatId();
    const chatData = getSettings().chatData[chatId];
    if (!chatData) return;
    if (!chatData.quests) chatData.quests = [];
    const quests = chatData.quests;
    
    const content = $("#nhud-settings-quests-list");
    content.empty();

    content.append(`
        <div style="display:flex; gap:6px; margin-bottom:10px;">
            <input id="nhud-s-q-add-title" class="nhud-input" style="flex:1;" placeholder="Название квеста..." />
            <button id="nhud-s-q-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
        </div>
    `);

    if (quests.length === 0) {
        content.append('<div style="color:#606080; text-align:center; font-size:12px; padding:10px;">Нет заданий...</div>');
    } else {
        const activeCount = quests.filter(q => q.status === 'active').length;
        const compCount = quests.filter(q => q.status === 'completed').length;
        const failCount = quests.filter(q => q.status === 'failed').length;

        // Создаем контейнеры-гармошки
        const makeGroup = (id, title, color, count, isOpen) => `
            <details ${isOpen ? 'open' : ''} style="margin-bottom:8px; border:1px solid var(--nhud-border); border-radius:4px; background:rgba(0,0,0,0.2);">
                <summary style="font-weight:bold; color:${color}; cursor:pointer; padding:6px; outline:none; user-select:none; font-size:12px; background:rgba(0,0,0,0.3);">
                    ${title} (${count})
                </summary>
                <div id="${id}" style="padding:6px; display:flex; flex-direction:column; gap:6px; border-top:1px dashed var(--nhud-border);"></div>
            </details>
        `;

        if (activeCount > 0) content.append(makeGroup("nhud-s-q-active", "⏳ Активные", "#52a8e0", activeCount, true));
        if (compCount > 0) content.append(makeGroup("nhud-s-q-comp", "✅ Выполненные", "#52e0a3", compCount, false));
        if (failCount > 0) content.append(makeGroup("nhud-s-q-fail", "❌ Проваленные", "#e05252", failCount, false));

        // Заполняем гармошки карточками
        quests.forEach((q, idx) => {
            const card = $(`
                <div style="background:var(--nhud-inp-bg, rgba(0,0,0,0.3)); border:1px solid var(--nhud-border); border-radius:6px; padding:8px; position:relative;">
                    <button class="nhud-q-del" data-idx="${idx}" style="position:absolute; top:4px; right:4px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">✕</button>
                    <input class="nhud-input nhud-q-title" data-idx="${idx}" value="${q.title}" style="font-weight:bold; color:#52a8e0; margin-bottom:6px; width:85%; background:transparent; border:none; padding:0;" />
                    <textarea class="nhud-textarea nhud-q-desc" data-idx="${idx}" rows="2" style="font-size:11px; margin-bottom:6px;">${q.desc}</textarea>
                    <select class="nhud-select nhud-q-status" data-idx="${idx}" style="font-size:11px; padding:4px;">
                        <option value="active" ${q.status==='active'?'selected':''}>⏳ Активен</option>
                        <option value="completed" ${q.status==='completed'?'selected':''}>✅ Выполнен</option>
                        <option value="failed" ${q.status==='failed'?'selected':''}>❌ Провален</option>
                    </select>
                </div>
            `);
            
            card.find('.nhud-q-del').on('click', function() { quests.splice(parseInt($(this).data('idx')), 1); saveSettingsDebounced(); renderSettingsQuests(); });
            card.find('.nhud-q-title').on('change', function() { quests[parseInt($(this).data('idx'))].title = $(this).val(); saveSettingsDebounced(); });
            card.find('.nhud-q-desc').on('change', function() { quests[parseInt($(this).data('idx'))].desc = $(this).val(); saveSettingsDebounced(); });
            card.find('.nhud-q-status').on('change', function() { quests[parseInt($(this).data('idx'))].status = $(this).val(); saveSettingsDebounced(); renderSettingsQuests(); });
            
            let targetId = "#nhud-s-q-active";
            if (q.status === 'completed') targetId = "#nhud-s-q-comp";
            if (q.status === 'failed') targetId = "#nhud-s-q-fail";
            content.find(targetId).append(card);
        });
    }

    $("#nhud-s-q-add-btn").off("click").on("click", () => {
        const title = $("#nhud-s-q-add-title").val().trim();
        if (title) { quests.unshift({ title, desc: "Новое задание...", status: "active" }); saveSettingsDebounced(); renderSettingsQuests(); }
    });
}

export function renderSettingsCodex() {
    const chatId = NarrativeStorage.getCurrentChatId();
    const chatData = getSettings().chatData[chatId];
    if (!chatData) return;
    if (!chatData.codex) chatData.codex = [];
    
    chatData.codex = chatData.codex.map(c => ({ ...c, active: c.active !== false }));
    const codex = chatData.codex;
    
    const content = $("#nhud-settings-codex-list");
    content.empty();

    content.append(`
        <div style="display:flex; gap:6px; margin-bottom:10px;">
            <input id="nhud-s-c-add-title" class="nhud-input" style="flex:1;" placeholder="Заголовок статьи..." />
            <button id="nhud-s-c-add-btn" class="nhud-add-btn" style="margin:0; padding:6px 12px;">+</button>
        </div>
    `);

    codex.forEach((entry, idx) => {
        const isActive = entry.active;
        const activeBtnStyle = isActive 
            ? "background:var(--nhud-accent, #d05070); color:#fff; border-color:var(--nhud-accent, #d05070); box-shadow:0 0 10px rgba(208,80,112,0.4);" 
            : "background:rgba(255,255,255,0.1); color:#a0a0b0; border-color:transparent;";

        const card = $(`
            <div style="background:var(--nhud-inp-bg, rgba(0,0,0,0.3)); border:1px solid ${isActive ? 'var(--nhud-accent, #d05070)' : 'var(--nhud-border)'}; border-radius:6px; padding:8px; position:relative; margin-bottom:6px; transition:0.2s;">
                <button class="nhud-c-del" data-idx="${idx}" style="position:absolute; top:4px; right:4px; background:none; border:none; color:#806060; cursor:pointer; font-size:10px;">✕</button>
                
                <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; padding-right:15px;">
                    <input class="nhud-input nhud-c-title" data-idx="${idx}" value="${entry.title}" style="font-weight:bold; color:#b080e0; flex:1; background:transparent; border:none; padding:0;" />
                    <button class="nhud-c-toggle" data-idx="${idx}" style="border-radius:4px; padding:2px 6px; font-size:10px; cursor:pointer; font-weight:bold; transition:0.2s; ${activeBtnStyle}" title="Вшить в память ИИ">
                        ${isActive ? '👁️ В памяти' : '👁️‍🗨️ Скрыто'}
                    </button>
                </div>
                <textarea class="nhud-textarea nhud-c-text" data-idx="${idx}" rows="3" style="font-size:11px;">${entry.text}</textarea>
            </div>
        `);
        
        card.find('.nhud-c-del').on('click', function() { codex.splice(parseInt($(this).data('idx')), 1); saveSettingsDebounced(); renderSettingsCodex(); });
        card.find('.nhud-c-title').on('change', function() { codex[parseInt($(this).data('idx'))].title = $(this).val(); saveSettingsDebounced(); });
        card.find('.nhud-c-text').on('change', function() { codex[parseInt($(this).data('idx'))].text = $(this).val(); saveSettingsDebounced(); });
        card.find('.nhud-c-toggle').on('click', function() {
            entry.active = !entry.active;
            saveSettingsDebounced();
            renderSettingsCodex();
        });
        content.append(card);
    });

    $("#nhud-s-c-add-btn").on("click", () => {
        const title = $("#nhud-s-c-add-title").val().trim();
        if (title) { codex.unshift({ title, text: "Текст статьи...", active: true }); saveSettingsDebounced(); renderSettingsCodex(); }
    });
}

// ─── КАЛЕНДАРЬ (UI) ───
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
}