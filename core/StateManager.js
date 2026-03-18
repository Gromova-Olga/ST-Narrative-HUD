// core/StateManager.js

import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../../script.js";
import { extensionName, defaultSettings } from "./constants.js";
import { NarrativeStorage } from "../NarrativeStorage.js";
import { getSTContext, getUserName, getCharName, getCharAvatar, findCharacterKey } from "../utils/helpers.js";

export function getSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    const s = extension_settings[extensionName];
    
    if (!s.trackers)          s.trackers        = JSON.parse(JSON.stringify(defaultSettings.trackers));
    if (!s.characters)        s.characters      = [];
    if (!s.liveData)          s.liveData        = JSON.parse(JSON.stringify(defaultSettings.liveData));
    if (!s.liveData.trackerValues) s.liveData.trackerValues = {};
    if (!s.liveData.characters)    s.liveData.characters    = {};
    if (!s.liveData.infoBlocks)    s.liveData.infoBlocks    = { ...defaultSettings.liveData.infoBlocks };
    if (!s.liveData.relHistory)    s.liveData.relHistory    = {};
    if (!s.liveData.ignoredCharacters) s.liveData.ignoredCharacters = [];
    
    if (s.promptBlocks) {
        s.promptBlocks.forEach(block => {
            if (s.liveData.infoBlocks[block.id] === undefined) {
                s.liveData.infoBlocks[block.id] = "";
            }
        });
    }
    
    if (s.activeProfile === undefined) s.activeProfile = null;
    if (s.useSTProfile === undefined)  s.useSTProfile  = false;
    if (s.autoSend === undefined)  s.autoSend = false;
    if (!s.requestSettings) {
        s.requestSettings = { ...defaultSettings.requestSettings };
    }
    if (s.requestSettings.lightMode === undefined) {
        s.requestSettings.lightMode = false;
    }
    if (!s.ui) {
        s.ui = { ...defaultSettings.ui };
    }
    if (!s.design) {
        s.design = { ...defaultSettings.design };
    }
    if (!s.promptBlocks)      s.promptBlocks    = JSON.parse(JSON.stringify(defaultSettings.promptBlocks));
    if (!s.prompts)           s.prompts         = { ...defaultSettings.prompts };
    if (!s.prompts.language)  s.prompts.language = "Russian";
    
    if (!s.jsonParser) {
        s.jsonParser = { ...defaultSettings.jsonParser };
    }
    
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
        if (saved.characters)    settings.liveData.characters    = saved.characters;
        if (saved.relHistory)    settings.liveData.relHistory    = saved.relHistory;
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
