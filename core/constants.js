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
        factions: true
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
        trackersPrompt: "Based on the last exchange, update tracker values. Return only changed fields.",
        charsPrompt: "Update each character's current state, outfit, and relationship score with the user. Return only changed fields.",
        datetimePrompt: "Update in-game date, time, weather, and location based on what just happened. Return only changed fields.",
        achievementsPrompt: "Did the user do something surprising, clever, or memorable? If YES: return JSON field 'achievement': {title, desc, icon(emoji)}. If NO: omit the field entirely. Do not invent achievements for ordinary actions.",
        heroPrompt: "Did the user overcome a challenge, show skill, or advance the plot? If YES: return JSON field 'xp_gained' with value 'small', 'medium', or 'large'. If NO: omit the field entirely.",
        questsPrompt: "Did any quest change state? If YES: return JSON array 'quests' with objects {title(exact), desc, status('active'|'completed'|'failed')} for each changed quest only. If NO: omit the field entirely.",
        codexPrompt: "Was new lore, a faction, or a secret revealed? If YES: return JSON field 'codex_unlocked': {title, text}. If NO: omit the field entirely.",
        factionsPrompt: "Did the user's actions affect faction standing? If YES: return JSON field 'factions': {\"FactionName\": 0-100}. If NO: omit the field entirely.",
        calendarPrompt: "Did a significant story event occur? If YES: return JSON field 'calendar_event': {date(DD.MM.YYYY), desc}. Date must be exactly DD.MM.YYYY, nothing else. If NO: omit the field entirely.",
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