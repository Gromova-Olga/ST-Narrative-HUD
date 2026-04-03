// ui/Tour.js
import { extensionName } from "../core/constants.js";

/**
 * Запускает интерактивный тур по моду.
 * Показывает шаги с подсветкой элементов и описаниями.
 */
export function startInteractiveTour() {
    if ($("#nhud-tour-overlay").length) return;

    $("#nhud-global-close").trigger("click");
    import('./SettingsUI.js').then(m => { if(m.closeSettingsPanel) m.closeSettingsPanel(); });
    $("#narrative-hud-sidebar").fadeOut(100);

    const steps = [
        { 
            title: "👋 Добро пожаловать в Narrative HUD!", 
            text: "Привет! Я разработала этот мод, чтобы превратить обычный текстовый чат в настоящую RPG с живым миром, экономикой и классным интерфейсом.<br><br>Сейчас я проведу самую подробную экскурсию по всем функциям. Устраивайся поудобнее, мы начинаем!", 
            target: null 
        },
        { 
            title: "🧊 Плавающий виджет (Кубик)", 
            text: "Это твой карманный пульт управления. Его можно свободно перетаскивать мышкой за края.<br><br>Здесь спрятаны кнопки быстрого доступа к мини-окошкам: Инвентарю, Журналу, Отношениям и Настройкам. Кнопка со стрелочками (⟳) внизу меняет форму виджета: квадрат, вертикальная полоса или горизонтальная панель.", 
            target: "#nhud-widget-container", 
            before: () => $("#nhud-widget-container").fadeIn() 
        },
        { 
            title: "📊 Правое окно (HUD)", 
            text: "Главная информационная панель. Она показывает текущее состояние игры в реальном времени: статус твоего персонажа, окружающий мир и тех, кто находится рядом.", 
            target: "#narrative-hud-sidebar", 
            before: () => { $("#narrative-hud-sidebar").fadeIn(); } 
        },
        { 
            title: "🌤️ Шапка, Погода и Кнопки", 
            text: "Сверху отображается текущая локация, время и погода. <b>Фишка:</b> Панель сама меняет цвет свечения (теней) в зависимости от погоды! Для дождя — синий, для солнца — золотой.<br><br>Под иконкой с тремя точками (⋮) скрыто меню принудительного обновления данных и быстрые переходы в настройки.", 
            target: "#nhud-sidebar-menu-btn" 
        },
        { 
            title: "❤️ Бары здоровья и отношений", 
            text: "Здесь выводятся все динамические полоски: Здоровье, Мана, Отношения с персонажами. Если значение падает, цвет плавно меняется с зеленого на красный (это можно выключить в дизайне).", 
            target: "#nhud-trackers-section" 
        },
        { 
            title: "💬 Кнопки Инфоблоков", 
            text: "Когда ИИ сгенерировал Скиллчеки, Дневники или Комментарии, здесь появятся кнопки. Нажав на них, ты открываешь стильное всплывающее окошко с текстом.", 
            target: "#nhud-infoblock-buttons" 
        },
        { 
            title: "👥 Персонажи в сцене", 
            text: "В самом низу — список всех активных персонажей сцены. Здесь видны их аватарки, во что они одеты (👗), какие эмоции испытывают (🎭).<br><br>А кнопка <b>💭 Сводка мыслей</b> позволяет заглянуть им в голову и узнать, что они на самом деле о тебе думают!", 
            target: "#nhud-characters-section" 
        },
        { 
            title: "⚙️ Левое окно (Мастерская)", 
            text: "А теперь переходим к самому главному — настройкам текущего чата. Именно здесь происходит вся магия управления твоей игрой.", 
            target: "#nhud-settings-panel", 
            before: () => { import('./SettingsUI.js').then(m => { if(m.openSettingsPanel) m.openSettingsPanel(); }); } 
        },
        { 
            title: "📝 Вкладка: Промты и Токены", 
            text: "Здесь настраиваются промпты для <b>кастомных инфоблоков</b>. Можно добавлять любые (комментарии, комментаторов, дневники и т.д) — только впиши промпт, и они появятся в виде кнопок в правом окошке!<br><br>А сверху есть <b>Калькулятор Токенов</b>, который считает, сколько памяти съедает всё твое имущество, лор и квесты.", 
            target: ".nhud-tab-content[data-tab='prompts']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='prompts']").trigger('click'); } 
        },
        { 
            title: "📈 Вкладка: Трекеры", 
            text: "Тут находятся: <b>Трекер Отношений</b> (можно менять статусы, смотреть график аналитики и отдельно открыть <b>Журнал связей</b> по кнопке 📜), <b>Фракции</b> и <b>Статы Героя</b>.", 
            target: ".nhud-tab-content[data-tab='trackers']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='trackers']").trigger('click'); } 
        },
        { 
            title: "🏴‍☠️ Оформление Фракций", 
            text: "Раскрой любую фракцию, нажми на шестеренку ⚙️. Ты увидишь поле <b>URL фона</b>. Найди красивую картинку в интернете, вставь ссылку, и карточка фракции обретет крутой фон!<br><br>Кнопка <b>👁️ Описание / 👁️‍🗨️ Без описания</b> позволяет экономить токены. Если глазик горит, ИИ читает лор фракции. Если выключен — знает только репутацию.", 
            target: ".nhud-tab-content[data-tab='trackers']",
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='trackers']").trigger('click'); } 
        },
        { 
            title: "🎒 Вкладка: Имущество", 
            text: "Твой кошелек, обычный рюкзак (где можно добавлять предметы), Недвижимость и Транспорт. Бары сверху (Здоровье и Мана) настраиваются именно здесь! Можешь добавить кастомные!", 
            target: ".nhud-tab-content[data-tab='property']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='property']").trigger('click'); } 
        },
        { 
            title: "🏠 Недвижимость и Транспорт", 
            text: "У каждого дома или машины есть кнопка <b>👁️ В памяти / 👁️‍🗨️ Скрыто</b>. Их описание незаметно вшивается в контекст. Не держи все дома включенными, ИИ должен помнить только то, что нужно прямо сейчас.<br><br>А нажав на шестеренку ⚙️, можно вставить <b>URL картинки дома или машины</b> из интернета, чтобы сделать карточку красивой!", 
            target: ".nhud-tab-content[data-tab='property']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='property']").trigger('click'); } 
        },
        { 
            title: "📜 Вкладка: Журнал", 
            text: "<b>Квесты:</b> ИИ сам обновляет их статусы, но и ты как игрок можешь вручную добавлять новые записи и менять статусы квестов (Активные, Выполненные, Проваленные).<br><br><b>Кодекс:</b> энциклопедия мира. Не забывай выключать глазики 👁️ у старых статей, чтобы беречь токены!", 
            target: ".nhud-tab-content[data-tab='journal']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='journal']").trigger('click'); } 
        },
        { 
            title: "📅 Вкладка: Летопись (Календарь)", 
            text: "Записи сюда может делать и ИИ, и сам игрок. События включаются в контекст при включенном глазике у каждой записи (а даты с записями подсвечиваются в самом календаре зелёным цветом).", 
            target: ".nhud-tab-content[data-tab='calendar']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='calendar']").trigger('click'); } 
        },
        { 
            title: "🏆 Вкладка: Зал Славы", 
            text: "Сделал что-то безумное, смешное, невероятное? ИИ наградит тебя достижением, выдаст иконку и навсегда запишет это событие в твой личный Зал Славы. Все награды хранятся здесь.", 
            target: ".nhud-tab-content[data-tab='halloffame']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='halloffame']").trigger('click'); } 
        },
        { 
            title: "👥 Вкладка: Персонажи", 
            text: "Список всех встреченных персонажей во всех чатах. Кнопка Призрака 👻 <b>вырезает персонажа из контекста</b>, чтобы ИИ больше не мог добавлять его в отслеживание (но его можно вернуть). А красная иконка крестика ✕ — полностью удаляет данные персонажа из памяти (но если ИИ снова о нем заговорит, он вернется).", 
            target: ".nhud-tab-content[data-tab='characters']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='characters']").trigger('click'); } 
        },
        { 
            title: "🔌 Вкладка: API (Режимы запросов)", 
            text: "Здесь настраивается, как мод собирает данные:<br>1. <b>Вместе с основным запросом:</b> Вшивается в ответ (1 запрос, совместный).<br>2. <b>Запрос после ответа:</b> Генерирует второй запрос сразу после ответа (контекст настраивается чуть ниже).<br>3. <b>Лайт-режим:</b> Для слабых моделей. Делает второй 'тихий' запрос с облегченным контекстом.", 
            target: ".nhud-tab-content[data-tab='api']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='api']").trigger('click'); } 
        },
        { 
            title: "🗄️ Вкладка: База данных", 
            text: "Делай бэкапы (Экспорт/Импорт). Бэкапы сохраняют память кастомных инфоблоков и все текущие статы чата. А <b>Умная очистка</b> удаляет 'мусорные' данные от старых свайпов (рероллов), чтобы чат не тормозил.", 
            target: ".nhud-tab-content[data-tab='storage']", 
            before: () => { $("#nhud-settings-tabs .nhud-tab[data-tab='storage']").trigger('click'); } 
        },
        { 
            title: "🎨 Центральное окно (Глобальные)", 
            text: "А теперь переходим к настройкам самого мода, которые работают для ВСЕХ чатов сразу.", 
            target: "#nhud-global-settings", 
            before: () => { import('./SettingsUI.js').then(m => { if(m.closeSettingsPanel) m.closeSettingsPanel(); }); 
                import('./UIManager.js').then(m => { if(m.openGlobalSettings) m.openGlobalSettings(); }); } 
        },
        { 
            title: "🎭 Внешний вид", 
            text: "Здесь можно красить всё: прозрачность, обводку, цвета окон. <b>Важно:</b> Для всех фонов можно поставить кастомный фон, просто вставив URL картинки из интернета! А кнопка 'Мимикрировать под ST' скопирует цвета твоей текущей темы Таверны.", 
            target: ".nhud-g-tab-content[data-tab='visuals']", 
            before: () => { $("#nhud-global-settings .nhud-g-tab[data-tab='visuals']").trigger('click'); } 
        },
        { 
            title: "⚙️ Система (Управление движком)", 
            text: "Включение и выключение модулей. Выключение модуля полностью вырезает его из текстового промпта, экономя токены (и удаляются визуально). Промпты модулей тоже можно менять, но делай это вдумчиво!", 
            target: ".nhud-g-tab-content[data-tab='system']", 
            before: () => { $("#nhud-global-settings .nhud-g-tab[data-tab='system']").trigger('click'); } 
        },
        { 
            title: "🧠 Куда вшивать память", 
            text: "В самом низу Системы есть важная настройка: как отправлять ИИ данные о мире.<br><b>Системный промпт:</b> Надежно.<br><b>Последнее сообщение (👤):</b> ИИ реагирует моментально, так как видит статусы прямо перед глазами.", 
            target: ".nhud-g-tab-content[data-tab='system']", 
            before: () => { $("#nhud-global-settings .nhud-g-tab[data-tab='system']").trigger('click'); } 
        },
        { 
            title: "🦇 Конец экскурсии", 
            text: "На этом всё. Помни главные правила: следи за токенами, выключай глазики 👁️‍🗨️ у ненужных объектов и лора. Удачи  в твоих историях!", 
            target: null, 
            before: () => { 
                import('./UIManager.js').then(m => { if(m.closeGlobalSettings) m.closeGlobalSettings(); }); 
            } 
        }
    ];

    let currentStep = 0;

    $("body").append(`
        <div id="nhud-tour-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:100005; backdrop-filter:blur(3px);"></div>
        <div id="nhud-tour-highlight-box" style="position:fixed; border:2px solid var(--nhud-accent, #d05070); border-radius:6px; box-shadow:0 0 0 2px rgba(0,0,0,0.5), 0 0 20px var(--nhud-accent, #d05070); z-index:100010; pointer-events:none; transition:all 0.3s ease-in-out; opacity:0;"></div>
        
        <div id="nhud-tour-box" style="position:fixed; z-index:100015; pointer-events:auto; background:var(--nhud-prompt-bg, #151220); border:1px solid var(--nhud-accent, #d05070); border-radius:8px; padding:20px; box-shadow:0 15px 50px rgba(0,0,0,0.9), inset 0 0 20px rgba(208,80,112,0.1); box-sizing:border-box; transition: opacity 0.3s ease; opacity: 0;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:10px; border-bottom:1px dashed var(--nhud-border);">
                <h3 id="nhud-tour-title" style="margin:0; color:var(--nhud-text-main, #e0c0c0); font-size:18px; line-height:1.3;"></h3>
                <button id="nhud-tour-skip" style="background:none; border:none; color:#a08080; cursor:pointer; font-size:22px; padding:0; margin-top:-4px; margin-left:15px; transition:0.2s; line-height:1;" title="Пропустить">✕</button>
            </div>
            <div style="padding:15px 0;">
                <p id="nhud-tour-text" style="color:var(--nhud-text-muted, #a08080); font-size:14px; line-height:1.6; margin:0;"></p>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding-top:15px; border-top:1px solid rgba(255,255,255,0.05);">
                <span id="nhud-tour-counter" style="color:#606080; font-size:12px; font-weight:bold; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:4px;"></span>
                <div style="display:flex; gap:10px;">
                    <button id="nhud-tour-prev" class="nhud-send-btn" style="background:#2a101a; border-color:#5a2035; padding:8px 16px;">Назад</button>
                    <button id="nhud-tour-next" class="nhud-send-btn" style="background:var(--nhud-accent, #d05070); color:#fff; font-weight:bold; border-color:#fff; padding:8px 16px; box-shadow:0 4px 10px rgba(208,80,112,0.4);">Далее</button>
                </div>
            </div>
        </div>
    `);

    function renderStep() {
        const step = steps[currentStep];
        
        if (step.before) step.before();

        $("#nhud-tour-title").text(step.title);
        $("#nhud-tour-text").html(step.text);
        $("#nhud-tour-counter").text(`Шаг ${currentStep + 1} из ${steps.length}`);
        $("#nhud-tour-prev").toggle(currentStep > 0);
        $("#nhud-tour-next").text(currentStep === steps.length - 1 ? "Завершить" : "Далее");

        const isMobile = window.innerWidth <= 768;
        const box = $("#nhud-tour-box");
        const hlBox = $("#nhud-tour-highlight-box");

        let boxWidth = isMobile ? window.innerWidth * 0.9 : 450;
        box.css({ width: boxWidth + 'px' });

        setTimeout(() => {
            let ttTop = (window.innerHeight - box.outerHeight()) / 2;
            let ttLeft = (window.innerWidth - boxWidth) / 2;

            if (step.target && $(step.target).length && $(step.target).is(":visible")) {
                const targetEl = $(step.target)[0];
                const rect = targetEl.getBoundingClientRect();

                hlBox.css({
                    opacity: 1,
                    top: rect.top - 4 + "px",
                    left: rect.left - 4 + "px",
                    width: rect.width + 8 + "px",
                    height: rect.height + 8 + "px"
                });

                ttTop = rect.bottom + 15;
                ttLeft = rect.left + (rect.width / 2) - (boxWidth / 2);

                let boxHeight = box.outerHeight() || 200;

                if (rect.height > window.innerHeight * 0.5) {
                    ttTop = Math.max(20, rect.top + window.innerHeight * 0.15);
                } 
                else if (ttTop + boxHeight > window.innerHeight) {
                    ttTop = rect.top - boxHeight - 15; 
                }
            } else {
                hlBox.css({ opacity: 0 }); 
            }

            if (ttTop < 10) ttTop = 10;
            if (ttLeft < 10) ttLeft = 10;
            if (ttTop + box.outerHeight() > window.innerHeight) ttTop = window.innerHeight - box.outerHeight() - 10;
            if (ttLeft + boxWidth > window.innerWidth) ttLeft = window.innerWidth - boxWidth - 10;

            box.css({
                top: ttTop + "px",
                left: ttLeft + "px",
                bottom: "auto",
                transform: "none",
                margin: "0",
                opacity: 1
            });

        }, 150); 
    }

    function endTour() {
        $("#nhud-tour-overlay, #nhud-tour-box, #nhud-tour-highlight-box").fadeOut(300, function() { $(this).remove(); });
        import('./UIManager.js').then(m => { if(m.closeGlobalSettings) m.closeGlobalSettings(); });
        import('./SettingsUI.js').then(m => { if(m.closeSettingsPanel) m.closeSettingsPanel(); }).catch(() => {});
    }

    $("#nhud-tour-next").off("click").on("click", () => { if (currentStep < steps.length - 1) { currentStep++; renderStep(); } else endTour(); });
    $("#nhud-tour-prev").off("click").on("click", () => { if (currentStep > 0) { currentStep--; renderStep(); } });
    $("#nhud-tour-skip").off("click").on("click", endTour);

    renderStep();
}
