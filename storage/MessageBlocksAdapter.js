// storage/MessageBlocksAdapter.js

/**
 * Адаптер для работы с кастомными блоками сообщений
 * 
 * Блоки — это произвольные пары ключ-значение, привязанные к messageId.
 * Например: { "monologue": "...", "diary": "...", "comments": "..." }
 * 
 * Зависит от ChatDataAdapter для структуры чата.
 */

import { extension_settings } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';

const extensionName = 'narrative-hud';

/**
 * Гарантирует структуру blocks для чата
 */
function ensureBlocks(chatId) {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    const s = extension_settings[extensionName];
    if (!s.chatData) s.chatData = {};
    if (!s.chatData[chatId]) {
        s.chatData[chatId] = {
            blocks: {},
            characterData: {},
            liveData: null,
            swipeData: {},
            metadata: { createdAt: Date.now(), lastAccessed: Date.now(), totalBlocks: 0, estimatedSize: 0 },
        };
    }
    if (!s.chatData[chatId].blocks) s.chatData[chatId].blocks = {};
    if (!s.chatData[chatId].metadata) {
        s.chatData[chatId].metadata = { createdAt: Date.now(), lastAccessed: Date.now(), totalBlocks: 0, estimatedSize: 0 };
    }
    return s;
}

// ─── Публичный API ───

/**
 * Сохранить блоки для сообщения
 * @param {string} chatId - ID чата
 * @param {string} messageId - ID сообщения
 * @param {Object} blocks - { blockId: text, ... }
 * @returns {Object} Очищенные блоки
 */
export function saveMessageBlocks(chatId, messageId, blocks) {
    if (!chatId || !messageId) return {};

    const settings = ensureBlocks(chatId);
    const chat = settings.chatData[chatId];
    chat.metadata.lastAccessed = Date.now();

    // Фильтруем пустые блоки
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

    updateBlockMetrics(chatId);
    extension_settings[extensionName] = settings;
    saveSettingsDebounced();

    return cleanBlocks;
}

/**
 * Получить блоки для сообщения
 * @param {string} chatId - ID чата
 * @param {string} messageId - ID сообщения
 * @returns {Object}
 */
export function getMessageBlocks(chatId, messageId) {
    if (!chatId || !messageId) return {};
    const s = extension_settings[extensionName];
    const chat = s?.chatData?.[chatId];
    if (!chat) return {};
    if (!chat.blocks) chat.blocks = {};
    if (chat.metadata) chat.metadata.lastAccessed = Date.now();
    return chat.blocks[messageId] || {};
}

/**
 * Удалить блоки для сообщения
 */
export function deleteMessageBlocks(chatId, messageId) {
    if (!chatId || !messageId) return false;
    const s = extension_settings[extensionName];
    const chat = s?.chatData?.[chatId];
    if (chat?.blocks?.[messageId]) {
        delete chat.blocks[messageId];
        updateBlockMetrics(chatId);
        extension_settings[extensionName] = s;
        saveSettingsDebounced();
        return true;
    }
    return false;
}

/**
 * Получить все типы блоков, используемых в чате
 */
export function getUsedBlockTypes(chatId) {
    if (!chatId) return [];
    const s = extension_settings[extensionName];
    const chat = s?.chatData?.[chatId];
    if (!chat?.blocks) return [];

    const types = new Set();
    Object.values(chat.blocks).forEach(messageBlocks => {
        Object.keys(messageBlocks).forEach(key => types.add(key));
    });

    return Array.from(types);
}

/**
 * Получить все messageId, у которых есть блоки
 */
export function getMessageIdsWithBlocks(chatId) {
    if (!chatId) return [];
    const s = extension_settings[extensionName];
    return Object.keys(s?.chatData?.[chatId]?.blocks || {});
}

/**
 * Экспорт блоков чата
 */
export function exportBlocks(chatId) {
    if (!chatId) return null;
    const s = extension_settings[extensionName];
    const chat = s?.chatData?.[chatId];
    if (!chat) return null;
    return {
        chatId,
        exportedAt: Date.now(),
        version: '1.0',
        blocks: chat.blocks || {},
        metadata: chat.metadata || {},
    };
}

/**
 * Импорт блоков чата
 */
export function importBlocks(chatId, data) {
    if (!chatId || !data?.blocks) return false;
    const settings = ensureBlocks(chatId);
    settings.chatData[chatId].blocks = data.blocks;
    settings.chatData[chatId].metadata = {
        createdAt: data.metadata?.createdAt || Date.now(),
        lastAccessed: Date.now(),
        totalBlocks: Object.keys(data.blocks).length,
        estimatedSize: data.metadata?.estimatedSize || 0,
    };
    updateBlockMetrics(chatId);
    extension_settings[extensionName] = settings;
    saveSettingsDebounced();
    return true;
}

/**
 * Обновить метрики блоков
 */
function updateBlockMetrics(chatId) {
    if (!chatId) return;
    const s = extension_settings[extensionName];
    const chat = s?.chatData?.[chatId];
    if (!chat) return;
    if (!chat.metadata) chat.metadata = { createdAt: Date.now(), lastAccessed: Date.now(), totalBlocks: 0, estimatedSize: 0 };
    if (!chat.blocks) chat.blocks = {};

    chat.metadata.totalBlocks = Object.keys(chat.blocks).length;

    let totalSize = 0;
    Object.values(chat.blocks).forEach(messageBlocks => {
        Object.values(messageBlocks).forEach(text => {
            totalSize += text.length * 2;
        });
    });
    chat.metadata.estimatedSize = totalSize;
    chat.metadata.estimatedSizeKB = (totalSize / 1024).toFixed(2);
}
