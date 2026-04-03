// storage/ChatDataAdapter.js

/**
 * Адаптер для работы с chatData — структурой хранения данных чатов
 * 
 * Изолирует логику создания, инициализации и метрик чат-данных.
 * Не зависит от ST API — получает chatId извне.
 */

import { extension_settings } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';

const extensionName = 'narrative-hud';

/**
 * Гарантирует существование корневой структуры settings.chatData
 */
function ensureRoot() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    const s = extension_settings[extensionName];
    if (!s.chatData) s.chatData = {};
    return s;
}

/**
 * Создаёт пустую структуру данных чата
 */
function createEmptyChat() {
    return {
        blocks: {},
        characterData: {},
        liveData: null,
        swipeData: {},
        metadata: {
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            totalBlocks: 0,
            estimatedSize: 0,
        },
    };
}

/**
 * Гарантирует существование данных для чата
 */
function ensureChat(chatId) {
    const settings = ensureRoot();
    if (!settings.chatData[chatId]) {
        settings.chatData[chatId] = createEmptyChat();
    }
    const chat = settings.chatData[chatId];
    if (!chat.metadata) chat.metadata = createEmptyChat().metadata;
    if (!chat.blocks) chat.blocks = {};
    if (!chat.swipeData) chat.swipeData = {};
    if (!chat.characterData) chat.characterData = {};
    chat.metadata.lastAccessed = Date.now();
    return settings;
}

// ─── Публичный API ───

/**
 * Проверяет существование данных для чата
 */
export function hasChat(chatId) {
    if (!chatId) return false;
    const settings = ensureRoot();
    return !!settings.chatData[chatId];
}

/**
 * Удаляет все данные чата
 */
export function deleteChat(chatId) {
    if (!chatId) return false;
    const settings = ensureRoot();
    if (settings.chatData[chatId]) {
        delete settings.chatData[chatId];
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
        return true;
    }
    return false;
}

/**
 * Получить объект чата (или null)
 */
export function getChat(chatId) {
    if (!chatId) return null;
    const settings = ensureRoot();
    return settings.chatData[chatId] || null;
}

/**
 * Получить метаданные чата
 */
export function getChatMetadata(chatId) {
    const chat = getChat(chatId);
    return chat?.metadata || null;
}

/**
 * Обновить метрики чата (подсчёт блоков и размера)
 */
export function updateChatMetrics(chatId) {
    if (!chatId) return;
    const settings = ensureChat(chatId);
    const chat = settings.chatData[chatId];

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
}

/**
 * Получить статистику по чату
 */
export function getChatStats(chatId) {
    if (!chatId) return { exists: false, totalBlocks: 0, estimatedSizeKB: '0.00', messagesWithBlocks: 0 };

    const settings = ensureRoot();
    const chat = settings.chatData[chatId];

    if (!chat) return { exists: false, totalBlocks: 0, estimatedSizeKB: '0.00', messagesWithBlocks: 0 };

    if (!chat.metadata) chat.metadata = createEmptyChat().metadata;
    if (!chat.blocks) chat.blocks = {};

    updateChatMetrics(chatId);

    return {
        exists: true,
        totalBlocks: chat.metadata.totalBlocks,
        estimatedSizeKB: chat.metadata.estimatedSizeKB || '0.00',
        messagesWithBlocks: Object.keys(chat.blocks).length,
        createdAt: new Date(chat.metadata.createdAt).toLocaleString(),
        lastAccessed: new Date(chat.metadata.lastAccessed).toLocaleString(),
    };
}

/**
 * Получить список всех chatId
 */
export function getAllChatIds() {
    const settings = ensureRoot();
    return Object.keys(settings.chatData);
}

/**
 * Очистить все данные
 */
export function purgeAll() {
    const settings = ensureRoot();
    settings.chatData = {};
    extension_settings[extensionName] = settings;
    saveSettingsDebounced();
}

/**
 * Экспорт данных чата
 */
export function exportChat(chatId) {
    if (!chatId) return null;
    const chat = getChat(chatId);
    if (!chat) return null;
    return {
        chatId,
        exportedAt: Date.now(),
        version: '1.0',
        ...chat,
    };
}

/**
 * Импорт данных чата
 */
export function importChat(chatId, data) {
    if (!chatId || !data) return false;
    const settings = ensureRoot();
    settings.chatData[chatId] = {
        blocks: data.blocks || {},
        characterData: data.characterData || {},
        liveData: data.liveData || null,
        swipeData: data.swipeData || {},
        metadata: {
            createdAt: data.metadata?.createdAt || Date.now(),
            lastAccessed: Date.now(),
            totalBlocks: Object.keys(data.blocks || {}).length,
            estimatedSize: data.metadata?.estimatedSize || 0,
        },
    };
    updateChatMetrics(chatId);
    extension_settings[extensionName] = settings;
    saveSettingsDebounced();
    return true;
}

/**
 * Сохраняет настройки (вызывается адаптерами после изменений)
 */
export function save() {
    saveSettingsDebounced();
}
