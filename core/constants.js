// core/constants.js

export const extensionName = "narrative-hud";
export const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

export const defaultSettings = {
    ui: {
        widgetPos: { left: "20px", top: "80px" },
        hudMode: "screen", // "screen" - к краю экрана, "chat" - к чату
        hudWidth: 300,      // ширина панели
        tabsMode: "top-text"
    },
    design: {
        hudBgColor: "#140a0f", hudBgOpacity: 0.95, hudBgImage: "",
        setBgColor: "#140a0f", setBgOpacity: 0.95, setBgImage: "",
        widBgColor: "#140a0f", widBgOpacity: 0.95, widBgImage: "",
        cenBgColor: "#151220", cenBgOpacity: 0.98, cenBgImage: "", // Центр. окно
        promptBgColor: "#1a0a10", promptHeaderBg: "#2a101a", promptBgImage: "", promptWidth: 300, promptMerged: false, showStatusEmojis: true,
        promptTextColor: "#e0b0b0", promptFontSize: 14, // Настройка текста
        promptPos: { top: "100px", left: "100px" },    // Позиция окна
        barColorStart: "#52e0a3", barColorEnd: "#e05252", barDynamic: true, // Градиент баров
        inputBgColor: "#000000", inputBgOpacity: 0.3,              // Плашки и поля
        borderColor: "#4a1525",
        textMain: "#e0b0b0",
        textMuted: "#a08080",
        accent: "#d05070",
        customCss: ""
    },
    modules: {
        trackers: true,       // Трекеры здоровья и т.д.
        relationships: true,  // Симс-система
        characters: true,     // Одежда, состояние персонажей
        thoughts: true,       // Мысли персонажей
        customBlocks: true,   // Кастомные блоки (монолог и т.д.)
        datetime: true        // Время и погода
    },
    trackers: [
        { id: "health",  label: "Здоровье", max: 100, color: "#e05252" },
        { id: "hunger",  label: "Сытость",  max: 100, color: "#e0a352" },
        { id: "energy",  label: "Энергия",  max: 100, color: "#52a8e0" },
        { id: "hygiene", label: "Гигиена",  max: 100, color: "#52e0a3" },
        { id: "mood",    label: "Настроение", max: 100, color: "#e052a8" },
        { id: "mana",    label: "Мана",     max: 100, color: "#a352e0" }
    ],
    characters: [],
    liveData: {
        trackerValues: {},
        characters: {},
        infoBlocks: { datetime: "", comments: "", monologue: "", diary: "", skillchecks: "" }
    },
    activeProfile: null,
    useSTProfile: true,
    autoSend: false,
    requestSettings: {
        contextMessages: 10,
        maxTokens: 2000,
        temperature: 0.7,
        sendWithMain: false,
        lightMode: false,
        relHistory: {},
    },
    promptBlocks: [
        { id: "comments",    label: "💬 Комментарии",    prompt: "Generate live audience comments reacting to the current scene.", enabled: true },
        { id: "monologue",   label: "🧠 Монолог",        prompt: "Generate the inner monologue of {{char}} at this moment.", enabled: true },
        { id: "diary",       label: "📔 Дневник",        prompt: "Generate diary entries from characters' perspectives.", enabled: true },
        { id: "skillchecks", label: "🎲 Скилл-чеки",    prompt: "Generate Disco Elysium-style skill checks for {{user}}.", enabled: true }
    ],
    prompts: {
        system: `You are a game master assistant. Analyze the story messages and return ONLY a valid JSON object — no markdown, no explanation, no code blocks. Just raw JSON.`,
        trackersPrompt: "Update numerical values of the trackers based on the latest events.",
        charsPrompt: "Track character states, outfits, and relationship with the user.",
        datetimePrompt: "Update the current in-game datetime, weather, and location.",
        language: "Russian"
    },
    jsonParser: {
        enabled: true,
        openTag: "[NHUD]",
        closeTag: "[/NHUD]",
        autoRemoveTags: true
    },
    relationshipSettings: {
        hintsEnabled: false,
        statuses: "Враг, Незнакомец, Нейтралитет, Приятель, Друг, Возлюбленный, Заклятый враг"
    }
};
