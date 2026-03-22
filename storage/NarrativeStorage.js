// storage/NarrativeStorage.js
import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../../script.js";

const extensionName = "narrative-hud";

export const NarrativeStorage = {
    /**
     * Получить ID текущего чата
     */
    getCurrentChatId() {
        try {
            const ctx = typeof SillyTavern !== 'undefined' ? SillyTavern.getContext() : null;
            const id = ctx?.chatId ?? window.chat_id;
            return id ? String(id) : null;
        } catch {
            return null;
        }
    },

    /**
     * Инициализация структуры хранилища
     */
    initStorage() {
        const settings = extension_settings[extensionName] = extension_settings[extensionName] || {};
        if (!settings.chatData) {
            settings.chatData = {};
        }
        return settings;
    },

    /**
     * Сохранить кастомные блоки для сообщения
     */
    saveMessageBlocks(messageId, blocks) {
        const chatId = this.getCurrentChatId();
        if (!chatId) return {}; 

        const settings = this.initStorage();
        
        if (!settings.chatData[chatId]) {
            settings.chatData[chatId] = {
                blocks: {},
                characterData: {},
                metadata: { createdAt: Date.now(), lastAccessed: Date.now(), totalBlocks: 0, estimatedSize: 0 }
            };
        }
        
        if (!settings.chatData[chatId].metadata) {
            settings.chatData[chatId].metadata = { createdAt: Date.now(), lastAccessed: Date.now(), totalBlocks: 0, estimatedSize: 0 };
        }
        if (!settings.chatData[chatId].blocks) {
            settings.chatData[chatId].blocks = {};
        }
        
        const chat = settings.chatData[chatId];
        chat.metadata.lastAccessed = Date.now();
        
        const cleanBlocks = {};
        Object.entries(blocks).forEach(([key, value]) => {
            if (value && typeof value === 'string' && value.trim()) {
                cleanBlocks[key] = value.trim();
            }
        });
        
        if (Object.keys(cleanBlocks).length > 0) {
            chat.blocks[messageId] = cleanBlocks;
        } else {
            delete chat.blocks[messageId];
        }
        
        this.updateChatMetrics(chatId);
        
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
        
        return cleanBlocks;
    },

    /**
     * Получить блоки для сообщения
     */
    getMessageBlocks(messageId) {
        const chatId = this.getCurrentChatId();
        if (!chatId) return {};

        const settings = this.initStorage();
        const chat = settings.chatData?.[chatId];
        if (!chat) return {};
        
        if (chat && !chat.metadata) {
            chat.metadata = { createdAt: Date.now(), lastAccessed: Date.now(), totalBlocks: 0, estimatedSize: 0 };
        }
        if (chat && !chat.blocks) {
            chat.blocks = {};
        }
        
        chat.metadata.lastAccessed = Date.now();
        return chat.blocks?.[messageId] || {};
    },

    /**
     * Удалить блоки для сообщения
     */
    deleteMessageBlocks(messageId) {
        const chatId = this.getCurrentChatId();
        if (!chatId) return false;

        const settings = this.initStorage();
        const chat = settings.chatData?.[chatId];
        if (chat?.blocks?.[messageId]) {
            delete chat.blocks[messageId];
            this.updateChatMetrics(chatId);
            extension_settings[extensionName] = settings;
            saveSettingsDebounced();
            return true;
        }
        return false;
    },

    /**
     * Удалить все блоки в чате
     */
    deleteChat(chatId) {
        const settings = this.initStorage();
        if (settings.chatData?.[chatId]) {
            delete settings.chatData[chatId];
            extension_settings[extensionName] = settings;
            saveSettingsDebounced();
            return true;
        }
        return false;
    },

    /**
     * Удалить текущий чат
     */
    deleteCurrentChat() {
        const chatId = this.getCurrentChatId();
        if (!chatId) return false;
        return this.deleteChat(chatId);
    },

    /**
     * Обновить метрики чата
     */
    updateChatMetrics(chatId) {
        if (!chatId) return;
        const settings = this.initStorage();
        const chat = settings.chatData?.[chatId];
        if (!chat) return;
        
        if (!chat.metadata) {
            chat.metadata = { createdAt: Date.now(), lastAccessed: Date.now(), totalBlocks: 0, estimatedSize: 0 };
        }
        if (!chat.blocks) {
            chat.blocks = {};
        }
        
        const blocksCount = Object.keys(chat.blocks).length;
        chat.metadata.totalBlocks = blocksCount;
        
        let totalSize = 0;
        Object.values(chat.blocks).forEach(messageBlocks => {
            Object.values(messageBlocks).forEach(text => {
                totalSize += text.length * 2;
            });
        });
        
        chat.metadata.estimatedSize = totalSize;
        chat.metadata.estimatedSizeKB = (totalSize / 1024).toFixed(2);
    },

    /**
     * Получить статистику по текущему чату
     */
    getChatStats() {
        const chatId = this.getCurrentChatId();
        if (!chatId) return { exists: false, totalBlocks: 0, estimatedSizeKB: 0, messagesWithBlocks: 0 };

        const settings = this.initStorage();
        const chat = settings.chatData?.[chatId];
        
        if (!chat) {
            return { exists: false, totalBlocks: 0, estimatedSizeKB: 0, messagesWithBlocks: 0 };
        }
        
        if (!chat.metadata) {
            chat.metadata = { createdAt: Date.now(), lastAccessed: Date.now(), totalBlocks: 0, estimatedSize: 0 };
        }
        if (!chat.blocks) chat.blocks = {};
        
        this.updateChatMetrics(chatId);
        
        return {
            exists: true,
            totalBlocks: chat.metadata.totalBlocks,
            estimatedSizeKB: chat.metadata.estimatedSizeKB || '0.00',
            messagesWithBlocks: Object.keys(chat.blocks).length,
            createdAt: new Date(chat.metadata.createdAt).toLocaleString(),
            lastAccessed: new Date(chat.metadata.lastAccessed).toLocaleString()
        };
    },

    /**
     * Получить все кастомные поля в чате
     */
    getUsedBlockTypes(chatId = null) {
        chatId = chatId || this.getCurrentChatId();
        if (!chatId) return [];

        const settings = this.initStorage();
        const chat = settings.chatData?.[chatId];
        if (!chat) return [];
        
        if (!chat.blocks) chat.blocks = {};
        
        const types = new Set();
        Object.values(chat.blocks).forEach(messageBlocks => {
            Object.keys(messageBlocks).forEach(key => types.add(key));
        });
        
        return Array.from(types);
    },

    /**
     * Экспорт блоков
     */
    exportChatBlocks(chatId = null) {
        chatId = chatId || this.getCurrentChatId();
        if (!chatId) return null;

        const settings = this.initStorage();
        const chat = settings.chatData?.[chatId];
        if (!chat) return null;
        
        return {
            chatId,
            exportedAt: Date.now(),
            version: '1.0',
            blocks: chat.blocks || {},
            metadata: chat.metadata || { createdAt: Date.now(), lastAccessed: Date.now(), totalBlocks: 0, estimatedSize: 0 }
        };
    },

    /**
     * Импорт блоков
     */
    importChatBlocks(chatId, data) {
        if (!data || !data.blocks || !chatId) return false;
        
        const settings = this.initStorage();
        
        settings.chatData[chatId] = {
            blocks: data.blocks,
            metadata: {
                createdAt: data.metadata?.createdAt || Date.now(),
                lastAccessed: Date.now(),
                totalBlocks: Object.keys(data.blocks).length,
                estimatedSize: data.metadata?.estimatedSize || 0
            }
        };
        
        this.updateChatMetrics(chatId);
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
        return true;
    },

    /**
     * Очистить всё
     */
    purgeAllData() {
        const settings = this.initStorage();
        settings.chatData = {};
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
    },

    /**
     * Сохранить живые данные чата (персонажи, трекеры)
     */
    saveLiveData(liveData) {
    const chatId = this.getCurrentChatId();
    if (!chatId) return;
    const settings = this.initStorage();
    if (!settings.chatData[chatId]) {
        settings.chatData[chatId] = { 
            blocks: {}, 
            characterData: {}, 
            metadata: { createdAt: Date.now(), lastAccessed: Date.now(), totalBlocks: 0, estimatedSize: 0 } 
        };
    }
    settings.chatData[chatId].liveData = {
        trackerValues: liveData.trackerValues || {},
        characters: liveData.characters || {},
        relHistory: liveData.relHistory || {},
        ignoredCharacters: liveData.ignoredCharacters || [],
    };
    extension_settings[extensionName] = settings;
    saveSettingsDebounced();
},

    /**
     * Загрузить живые данные чата
     */
    loadLiveData() {
        const chatId = this.getCurrentChatId();
        if (!chatId) return null;

        const settings = this.initStorage();
        return settings.chatData?.[chatId]?.liveData || null;
    },

    /**
     * Сохранить данные персонажей для чата
     */
    saveCharacterData(characterData) {
        const chatId = this.getCurrentChatId();
        if (!chatId) return;
        
        const settings = this.initStorage();
        if (!settings.chatData[chatId]) {
            settings.chatData[chatId] = { 
                blocks: {}, 
                characterData: {},
                metadata: { createdAt: Date.now(), lastAccessed: Date.now() } 
            };
        }
        
        settings.chatData[chatId].characterData = characterData;
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
    },

    /**
     * Загрузить данные персонажей для чата
     */
    loadCharacterData() {
        const chatId = this.getCurrentChatId();
        if (!chatId) return { characters: {} };
        
        const settings = this.initStorage();
        return settings.chatData?.[chatId]?.characterData || { characters: {} };
    },

    /**
     * Обновить или добавить персонажа (с дедупликацией)
     */
    updateCharacter(characterName, characterData) {
        const chatData = this.loadCharacterData();
        
        // Дедупликация по имени (регистронезависимо)
        const existingKey = Object.keys(chatData.characters).find(
            key => key.toLowerCase() === characterName.toLowerCase()
        );
        
        if (existingKey) {
            // Обновляем существующего
            chatData.characters[existingKey] = {
                ...chatData.characters[existingKey],
                ...characterData
            };
        } else {
            // Добавляем нового
            chatData.characters[characterName] = characterData;
        }
        
        this.saveCharacterData(chatData);
        return chatData;
    },

    /**
     * Удалить персонажа из чата
     */
    removeCharacter(characterName) {
        const chatData = this.loadCharacterData();
        
        const existingKey = Object.keys(chatData.characters).find(
            key => key.toLowerCase() === characterName.toLowerCase()
        );
        
        if (existingKey) {
            delete chatData.characters[existingKey];
            this.saveCharacterData(chatData);
            return true;
        }
        return false;
    },

/**
     * Сохранить данные для конкретного свайпа
     */
    saveSwipeData(swipeKey, liveData) {
        const chatId = this.getCurrentChatId();
        if (!chatId || !swipeKey) return;
        const settings = this.initStorage();
        if (!settings.chatData[chatId]) {
            settings.chatData[chatId] = { 
                blocks: {}, 
                metadata: { createdAt: Date.now(), lastAccessed: Date.now(), totalBlocks: 0, estimatedSize: 0 } 
            };
        }
        if (!settings.chatData[chatId].swipeData) {
            settings.chatData[chatId].swipeData = {};
        }
        settings.chatData[chatId].swipeData[swipeKey] = {
            trackerValues: liveData.trackerValues || {},
            characters: liveData.characters || {},
            infoBlocks: liveData.infoBlocks || {},
            relHistory: JSON.parse(JSON.stringify(liveData.relHistory || {}))
        };
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
    },

    /**
     * Загрузить данные для конкретного свайпа
     */
    loadSwipeData(swipeKey) {
        const chatId = this.getCurrentChatId();
        if (!chatId || !swipeKey) return null;
        const settings = this.initStorage();
        return settings.chatData?.[chatId]?.swipeData?.[swipeKey] || null;
    },

    /**
     * Получить список персонажей в чате
     */
    getCharacters() {
        const chatData = this.loadCharacterData();
        return chatData.characters || {};
    }
};
