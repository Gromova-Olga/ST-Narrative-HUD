// core/StateManager.js

import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../../script.js";
import { extensionName, defaultSettings } from "./constants.js";
import { NarrativeStorage } from "../storage/NarrativeStorage.js";
import { getSTContext, getUserName, getCharName, getCharAvatar, findCharacterKey } from "../utils/helpers.js";

export function getSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    const s = extension_settings[extensionName];
    
    if (!s.chatData) s.chatData = {};
    if (!s.modules)  s.modules = { ...defaultSettings.modules };

    // Миграция модулей — добавляем новые поля если их нет у старых пользователей
    Object.entries(defaultSettings.modules).forEach(([key, val]) => {
        if (s.modules[key] === undefined) s.modules[key] = val;
    });

    if (!s.trackers)          s.trackers        = JSON.parse(JSON.stringify(defaultSettings.trackers));
    if (!s.characters)        s.characters      = [];
    if (!s.liveData)          s.liveData        = JSON.parse(JSON.stringify(defaultSettings.liveData));
    if (!s.liveData.trackerValues) s.liveData.trackerValues = {};
    if (!s.liveData.characters)    s.liveData.characters    = {};
    if (!s.liveData.infoBlocks)    s.liveData.infoBlocks    = { ...defaultSettings.liveData.infoBlocks };
    if (!s.liveData.relHistory)    s.liveData.relHistory    = {};
    if (!s.liveData.ignoredCharacters) s.liveData.ignoredCharacters = [];
    if (!s.achievements) s.achievements = [];
    
    if (s.promptBlocks) {
        s.promptBlocks.forEach(block => {
            if (s.liveData.infoBlocks[block.id] === undefined) {
                s.liveData.infoBlocks[block.id] = "";
            }
        });
    }
    
    if (s.activeProfile === undefined) s.activeProfile = null;
    if (s.useSTProfile === undefined)  s.useSTProfile  = false;
    if (s.autoSend === undefined)      s.autoSend      = false;

    if (!s.requestSettings) s.requestSettings = { ...defaultSettings.requestSettings };
    if (s.requestSettings.lightMode === undefined) s.requestSettings.lightMode = false;
    if (s.requestSettings.contextMessages === undefined) s.requestSettings.contextMessages = defaultSettings.requestSettings.contextMessages;
    if (s.requestSettings.maxTokens === undefined)       s.requestSettings.maxTokens       = defaultSettings.requestSettings.maxTokens;
    if (s.requestSettings.temperature === undefined)     s.requestSettings.temperature     = defaultSettings.requestSettings.temperature;
    if (s.requestSettings.sendWithMain === undefined)    s.requestSettings.sendWithMain    = false;

    if (!s.ui)     s.ui     = { ...defaultSettings.ui };
    if (!s.design) s.design = { ...defaultSettings.design };

    // Миграция ui — добавляем новые поля
    Object.entries(defaultSettings.ui).forEach(([key, val]) => {
        if (s.ui[key] === undefined) s.ui[key] = val;
    });

    if (!s.promptBlocks) s.promptBlocks = JSON.parse(JSON.stringify(defaultSettings.promptBlocks));

    if (!s.prompts) s.prompts = { ...defaultSettings.prompts };
    // Миграция промптов — добавляем новые поля (calendarPrompt, factionsPrompt и др.)
    Object.entries(defaultSettings.prompts).forEach(([key, val]) => {
        if (s.prompts[key] === undefined) s.prompts[key] = val;
    });

    if (!s.jsonParser) s.jsonParser = { ...defaultSettings.jsonParser };
    if (s.jsonParser.enabled === undefined)        s.jsonParser.enabled        = defaultSettings.jsonParser.enabled;
    if (s.jsonParser.openTag === undefined)        s.jsonParser.openTag        = defaultSettings.jsonParser.openTag;
    if (s.jsonParser.closeTag === undefined)       s.jsonParser.closeTag       = defaultSettings.jsonParser.closeTag;
    if (s.jsonParser.autoRemoveTags === undefined) s.jsonParser.autoRemoveTags = defaultSettings.jsonParser.autoRemoveTags;

    if (!s.relationshipSettings) {
        s.relationshipSettings = {
            hintsEnabled: false,
            statuses: "Враг, Незнакомец, Нейтралитет, Приятель, Друг, Возлюбленный, Заклятый враг"
        };
    }
    
    return s;
}

export function getLive() { 
    return getSettings().liveData; 
}

export function getChatTrackers() {
    const settings = getSettings();
    const chatId = NarrativeStorage.getCurrentChatId();
    if (!chatId) return settings.trackers || [];

    if (!settings.chatData[chatId]) {
        settings.chatData[chatId] = { blocks: {}, metadata: {} };
    }
    if (!settings.chatData[chatId].trackers) {
        settings.chatData[chatId].trackers = JSON.parse(JSON.stringify(settings.trackers));
    }
    return settings.chatData[chatId].trackers;
}

export function getTrackerValue(trackerId) {
    const live = getLive();
    const trackers = getChatTrackers();
    const tracker = trackers.find(t => t.id === trackerId);
    return live.trackerValues[trackerId] !== undefined
        ? live.trackerValues[trackerId]
        : (tracker ? tracker.max : 100);
}

export function updateGlobalAvatar(charName, avatar) {
    const settings = getSettings();
    let globalChar = settings.characters.find(
        c => c.name?.toLowerCase() === charName.toLowerCase()
    );
    if (!globalChar) {
        globalChar = { name: charName, avatar: "" };
        settings.characters.push(globalChar);
    }
    globalChar.avatar = avatar;
    saveSettingsDebounced();
}

export function ensureCharInLive() {
    const charName = getCharName();
    const userName = getUserName();
    if (!charName || charName === userName) return;
    
    const live = getLive();
    if (live.ignoredCharacters && live.ignoredCharacters.includes(charName)) return; 
    
    const existingKey = findCharacterKey(live.characters, charName);
    
    if (!existingKey) {
        live.characters[charName] = { outfit: "", state: "", thoughts: "", relationship: 50, relationship_status: "", relationship_thoughts: "", relationship_hint: "" };
    } else if (existingKey !== charName) {
        live.characters[charName] = live.characters[existingKey];
        delete live.characters[existingKey];
    }
    
    updateGlobalAvatar(charName, getCharAvatar());
    saveSettingsDebounced();
}

export function deduplicateCharacters() {
    const live = getLive();
    const normalized = {};
    
    Object.entries(live.characters).forEach(([key, value]) => {
        const normalizedKey = key.toLowerCase().trim();
        
        if (!normalized[normalizedKey]) {
            normalized[normalizedKey] = { ...value, _originalNames: [key] };
        } else {
            normalized[normalizedKey] = {
                ...normalized[normalizedKey],
                ...value,
                _originalNames: [...normalized[normalizedKey]._originalNames, key]
            };
        }
    });
    
    const result = {};
    Object.values(normalized).forEach(char => {
        const mainName = char._originalNames.reduce((a, b) => a.length <= b.length ? a : b);
        const { _originalNames, ...cleanChar } = char;
        result[mainName] = cleanChar;
    });
    
    live.characters = result;
    saveSettingsDebounced();
}

export function restoreLiveData() {
    const settings = getSettings();
    const saved = NarrativeStorage.loadLiveData();
    if (saved) {
        if (saved.trackerValues) settings.liveData.trackerValues = saved.trackerValues;
        if (saved.characters) {
            if (!settings.liveData.characters) settings.liveData.characters = {};
            Object.entries(saved.characters).forEach(([k, v]) => {
                settings.liveData.characters[k] = { ...(settings.liveData.characters[k] || {}), ...v };
            });
        }
        if (saved.relHistory)          settings.liveData.relHistory          = saved.relHistory;
        if (saved.ignoredCharacters)   settings.liveData.ignoredCharacters   = saved.ignoredCharacters;
        saveSettingsDebounced();
    }
}

export function restoreLastSwipeInfoBlocks() {
    const ctx = getSTContext();
    if (!ctx?.chat?.length) return;
    
    let lastBotIndex = -1;
    for (let i = ctx.chat.length - 1; i >= 0; i--) {
        if (!ctx.chat[i].is_user && !ctx.chat[i].is_system) {
            lastBotIndex = i;
            break;
        }
    }
    
    if (lastBotIndex === -1) return;
    
    const mesEl = document.querySelector(`.mes[mesid="${lastBotIndex}"]`);
    const swipeId = mesEl ? parseInt(mesEl.getAttribute('swipeid') || '0') : (ctx.chat[lastBotIndex].swipe_id ?? 0);
    
    const swipeData = NarrativeStorage.loadSwipeData(`${lastBotIndex}_${swipeId}`);
    const messageBlocks = NarrativeStorage.getMessageBlocks(String(lastBotIndex));
    
    const settings = getSettings();
    settings.liveData.infoBlocks = { 
        ...settings.liveData.infoBlocks, 
        ...(messageBlocks || {}),
        ...(swipeData?.infoBlocks || {}) 
    };
    saveSettingsDebounced();
}

export function unlockAchievement(ach) {
    const settings = getSettings();
    const chatId = NarrativeStorage.getCurrentChatId();
    if (!chatId) return false;

    // Убеждаемся, что структура существует
    if (!settings.chatData[chatId]) return false;
    if (!settings.chatData[chatId].achievements) {
        settings.chatData[chatId].achievements = [];
    }

    const chatAchievements = settings.chatData[chatId].achievements;

    // Защита от дубликатов в рамках одного чата
    const exists = chatAchievements.find(a => a.title.toLowerCase() === ach.title.toLowerCase());
    if (exists) return false;
    
    chatAchievements.push({
        title: ach.title,
        desc: ach.desc,
        icon: ach.icon || '🏆',
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    });
    
    saveSettingsDebounced();
    return true;
}

// ─── HERO SHEET (Окно прокачки) ───
export function getHeroSheet() {
    const settings = getSettings();
    const chatId = NarrativeStorage.getCurrentChatId();
    if (!chatId) return null;
    
    if (!settings.chatData[chatId].heroSheet) {
        settings.chatData[chatId].heroSheet = {
            level: 1, xp: 0, points: 0,
            stats: { '💪 Сила': 1, '🏃 Ловкость': 1, '🧠 Интеллект': 1, '🗣️ Харизма': 1, '🛡️ Выносливость': 1 }
        };
    }
    return settings.chatData[chatId].heroSheet;
}

export function addHeroXp(amountString) {
    const sheet = getHeroSheet();
    if (!sheet) return false;
    
    let gained = 0;
    const str = String(amountString).toLowerCase();
    if (str === 'small') gained = 15;
    else if (str === 'medium') gained = 35;
    else if (str === 'large') gained = 75;
    else gained = parseInt(str) || 0; // Если ИИ вдруг выдаст цифру
    
    if (gained <= 0) return false;
    
    sheet.xp += gained;
    let leveledUp = false;
    
    // Формула уровня: 100 XP * текущий уровень (100, 200, 300...)
    while (sheet.xp >= (sheet.level * 100)) {
        sheet.xp -= (sheet.level * 100);
        sheet.level += 1;
        sheet.points += 1; // 1 очко статов за каждый уровень
        leveledUp = true;
    }
    
    saveSettingsDebounced();
    return leveledUp;
}

// ─── INVENTORY & ASSETS (Рюкзак и Имущество) ───
export function getInventory() {
    const settings = getSettings();
    const chatId = NarrativeStorage.getCurrentChatId();
    if (!chatId) return null;
    
    if (!settings.chatData[chatId].inventory) {
        settings.chatData[chatId].inventory = {
            money: 0,
            currency: "Кредитов", // Валюту можно будет менять в интерфейсе
            items: [],      // Оружие, квестовые предметы
            vehicles: [],   // Машины, яхты
            estate: []      // Квартиры, убежища
        };
    }
    return settings.chatData[chatId].inventory;
}

// ─── QUEST LOG (Журнал заданий) ───
export function getQuests() {
    const settings = getSettings();
    const chatId = NarrativeStorage.getCurrentChatId();
    if (!chatId) return [];
    if (!settings.chatData[chatId].quests) settings.chatData[chatId].quests = [];
    return settings.chatData[chatId].quests;
}

export function updateQuests(parsedQuests) {
    const quests = getQuests();
    let updated = false;
    let notifications = [];

    parsedQuests.forEach(pq => {
        const existing = quests.find(q => q.title.toLowerCase() === pq.title.toLowerCase());
        if (existing) {
            if (existing.status !== pq.status) {
                existing.status = pq.status;
                if (pq.desc) existing.desc = pq.desc;
                updated = true;
                if (pq.status === 'completed' || pq.status === 'failed') notifications.push(existing);
            }
        } else {
            quests.unshift({ title: pq.title, desc: pq.desc || "...", status: pq.status || 'active' });
            updated = true;
            notifications.push({ title: pq.title, status: 'new' });
        }
    });

    if (updated) import('../../../../../script.js').then(s => s.saveSettingsDebounced());
    return notifications; // Возвращаем список изменений для уведомлений
}

// ─── FACTIONS (Фракции) ───
export function getFactions() {
    const settings = getSettings();
    const chatId = NarrativeStorage.getCurrentChatId();
    if (!chatId) return [];
    if (!settings.chatData[chatId].factions) settings.chatData[chatId].factions = [];
    return settings.chatData[chatId].factions;
}

// ─── CODEX (Сюжетный Кодекс) ───
export function getCodex() {
    const settings = getSettings();
    const chatId = NarrativeStorage.getCurrentChatId();
    if (!chatId) return [];
    if (!settings.chatData[chatId].codex) settings.chatData[chatId].codex = [];
    return settings.chatData[chatId].codex;
}

export function unlockCodexEntry(entry) {
    const codex = getCodex();
    // Ищем, нет ли уже статьи с таким названием
    const exists = codex.find(e => e.title.toLowerCase() === entry.title.toLowerCase());
    if (exists) return false; // Защита от дубликатов
    
    codex.unshift({
        title: entry.title,
        text: entry.text,
        date: new Date().toLocaleDateString()
    });
    
    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
    return true;
}

// ─── CALENDAR (Календарь событий) ───
export function getCalendar() {
    const settings = getSettings();
    const chatId = NarrativeStorage.getCurrentChatId();
    if (!chatId) return [];
    if (!settings.chatData[chatId].calendar) settings.chatData[chatId].calendar = [];
    return settings.chatData[chatId].calendar;
}

export function addCalendarEvent(eventData) {
    const calendar = getCalendar();
    // Проверка на дубликаты
    const exists = calendar.find(e => e.date === eventData.date && e.desc.toLowerCase() === eventData.desc.toLowerCase());
    if (exists) return false;
    
    calendar.push({
        date: eventData.date || new Date().toLocaleDateString(),
        desc: eventData.desc,
        realDate: Date.now()
    });
    
    // Сортируем так, чтобы новые были снизу
    calendar.sort((a, b) => a.realDate - b.realDate);
    import('../../../../../script.js').then(s => s.saveSettingsDebounced());
    return true;
}