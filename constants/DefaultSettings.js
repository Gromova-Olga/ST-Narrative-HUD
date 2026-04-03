// constants/DefaultSettings.js

const scriptPath = import.meta.url.split('/').slice(0, -2).join('/');

export const extensionName = "narrative-hud";
export const extensionFolderPath = scriptPath;

export const defaultSettings = {
    ui: {
        widgetPos: { left: "20px", top: "80px" },
        hudMode: "screen", 
        hudWidth: 300,      
        tabsMode: "top-text",
        leftMode: "chat",
        leftWidth: 300
    },
    design: {
        hudBgColor: "#140a0f", hudBgOpacity: 0.95, hudBgImage: "",
        setBgColor: "#140a0f", setBgOpacity: 0.95, setBgImage: "",
        widBgColor: "#140a0f", widBgOpacity: 0.95, widBgImage: "",
        cenBgColor: "#151220", cenBgOpacity: 0.98, cenBgImage: "", 
        promptBgColor: "#1a0a10", promptHeaderBg: "#2a101a", promptBgImage: "", promptWidth: 300, promptMerged: false, showStatusEmojis: true,
        promptTextColor: "#e0b0b0", promptFontSize: 14, 
        promptPos: { top: "100px", left: "100px" },    
        barColorStart: "#52e0a3", barColorEnd: "#e05252", barDynamic: true, 
        inputBgColor: "#000000", inputBgOpacity: 0.3,              
        borderColor: "#4a1525",
        textMain: "#e0b0b0",
        textMuted: "#a08080",
        accent: "#d05070",
        customCss: ""
    },
    modules: {
        trackers: true,       
        relationships: true,  
        characters: true,     
        thoughts: true,       
        customBlocks: true,   
        datetime: true,        
        achievements: true,
        hero: true,
        quests: true,
        calendar: true,
        factions: true,
        codex: true,
        inventory: true,
        loreInjection: true,
        enableOutfitStats: false,
        enableOutfitTracking: true,
        notifications: true,
        trackPlayerInventory: false,
        trackBotInventory: false,
        injectPlayerOutfit: false
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
        infoBlocks: { datetime: "", comments: "", monologue: "", diary: "", skillchecks: "" },
        playerInventory: [],
        botInventory: [],
        playerOutfitText: ""
    },
    activeProfile: null,
    useSTProfile: true,
    autoSend: false,
    requestSettings: {
        contextMessages: 10,
        maxTokens: 4000,
        temperature: 0.7,
        sendWithMain: true,
        lightMode: false,
        relHistory: {},
    },
    promptBlocks: [
        { id: "comments",    label: "💬 Комментарии",    prompt: "ALWAYS generate 2-3 short live audience comments reacting to the current scene. Be creative and varied.", enabled: true },
        { id: "monologue",   label: "🧠 Монолог",        prompt: "ALWAYS generate the inner monologue of {{char}} at this exact moment. 2-4 sentences, first person.", enabled: true },
        { id: "diary",       label: "📔 Дневник",        prompt: "ALWAYS generate a short diary entry from {{char}}'s perspective about what just happened.", enabled: true },
        { id: "skillchecks", label: "🎲 Скилл-чеки",    prompt: "ALWAYS generate 2-3 Disco Elysium-style skill checks relevant to {{user}}'s last action.", enabled: true }
    ],
    prompts: {
        system: `You are a game master assistant analyzing a roleplay story. Your job is to extract and update ALL requested game data from the latest exchange. You MUST return a valid JSON object containing ALL fields listed in the structure below — do not skip any field unless it is explicitly marked as conditional. No markdown, no explanation, no code blocks. Raw JSON only.`,
        trackersPrompt: "Update ALL tracker values based on what happened. Even if change is small — update it. Return the full trackers object with current values.",
        charsPrompt: "Update ALL characters present in this chat — their state, outfit, thoughts, and relationship with the user. ALWAYS include every known character, not just those active in the current scene.",
        datetimePrompt: "ALWAYS return current in-game date, time, weather, and location. Update based on what just happened.",
        achievementsPrompt: "Did the user do something surprising, clever, or memorable? If YES: return JSON field 'achievement': {title, desc, icon(emoji)}. If NO: omit the field entirely. Do not invent achievements for ordinary actions.",
        heroPrompt: "Did the user overcome a challenge, show skill, or advance the plot? If YES: return JSON field 'xp_gained' with value 'small', 'medium', or 'large'. If NO: omit the field entirely.",
        questsPrompt: "Did any quest change state or a new one begin? If YES: return JSON array 'quests' with objects {title(exact), desc, status('active'|'completed'|'failed')}. If NO: omit the field entirely.",
        codexPrompt: "Was new lore, a faction, or a secret revealed? If YES: return JSON field 'codex_unlocked': {title, text}. If NO: omit the field entirely.",
        factionsPrompt: "Did the user's actions affect faction standing? If YES: return JSON field 'factions': {\"FactionName\": 0-100}. If NO: omit the field entirely.",
        calendarPrompt: "Did a significant story event occur? If YES: return JSON field 'calendar_event': {date(DD.MM.YYYY), desc}. Date must be exactly DD.MM.YYYY, nothing else. If NO: omit the field entirely.",
        language: "Russian",
        notificationDeviceName: "Смартфон",
        botWealthStatus: "Средний, доступ к обычному оружию и снаряжению"
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
