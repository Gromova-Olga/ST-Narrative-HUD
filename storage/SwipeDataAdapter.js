// storage/SwipeDataAdapter.js

/**
 * Адаптер для работы с данными свайпов
 * 
 * Каждый свайп хранит snapshot состояния: трекеры, персонажи, инфоблоки, историю отношений.
 * Формат ключа: "messageId_swipeId"
 * 
 * Зависит от ChatDataAdapter для доступа к структуре чата.
 */

import { extension_settings } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';

const extensionName = 'narrative-hud';

/**
 * Гарантирует структуру swipeData для чата
 */
function ensureSwipeData(chatId) {
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
    if (!s.chatData[chatId].swipeData) s.chatData[chatId].swipeData = {};
    return s;
}

// ─── Публичный API ───

/**
 * Сохранить данные для свайпа
 * @param {string} chatId - ID чата
 * @param {string} swipeKey - Ключ формата "messageId_swipeId"
 * @param {Object} liveData - Данные: { trackerValues, characters, infoBlocks, relHistory }
 */
export function saveSwipeData(chatId, swipeKey, liveData) {
    if (!chatId || !swipeKey) return;

    const settings = ensureSwipeData(chatId);
    settings.chatData[chatId].swipeData[swipeKey] = {
        trackerValues: liveData.trackerValues || {},
        characters: liveData.characters || {},
        infoBlocks: liveData.infoBlocks || {},
        relHistory: JSON.parse(JSON.stringify(liveData.relHistory || {})),
    };

    extension_settings[extensionName] = settings;
    saveSettingsDebounced();
}

/**
 * Загрузить данные для свайпа
 * @param {string} chatId - ID чата
 * @param {string} swipeKey - Ключ формата "messageId_swipeId"
 * @returns {Object|null}
 */
export function loadSwipeData(chatId, swipeKey) {
    if (!chatId || !swipeKey) return null;
    const s = extension_settings[extensionName];
    return s?.chatData?.[chatId]?.swipeData?.[swipeKey] || null;
}

/**
 * Проверяет существование данных для свайпа
 */
export function hasSwipeData(chatId, swipeKey) {
    if (!chatId || !swipeKey) return false;
    const s = extension_settings[extensionName];
    return !!s?.chatData?.[chatId]?.swipeData?.[swipeKey];
}

/**
 * Удалить данные свайпа
 */
export function deleteSwipeData(chatId, swipeKey) {
    if (!chatId || !swipeKey) return false;
    const s = extension_settings[extensionName];
    if (s?.chatData?.[chatId]?.swipeData?.[swipeKey]) {
        delete s.chatData[chatId].swipeData[swipeKey];
        extension_settings[extensionName] = s;
        saveSettingsDebounced();
        return true;
    }
    return false;
}

/**
 * Получить все свайпы для чата
 */
export function getAllSwipes(chatId) {
    if (!chatId) return {};
    const s = extension_settings[extensionName];
    return s?.chatData?.[chatId]?.swipeData || {};
}

/**
 * Получить список ключей свайпов для чата
 */
export function getSwipeKeys(chatId) {
    if (!chatId) return [];
    const s = extension_settings[extensionName];
    return Object.keys(s?.chatData?.[chatId]?.swipeData || {});
}

/**
 * Удалить все свайпы для чата
 */
export function clearAllSwipes(chatId) {
    if (!chatId) return false;
    const s = extension_settings[extensionName];
    if (s?.chatData?.[chatId]) {
        s.chatData[chatId].swipeData = {};
        extension_settings[extensionName] = s;
        saveSettingsDebounced();
        return true;
    }
    return false;
}

/**
 * Клонирует данные свайпа (для мержа без мутации)
 */
export function cloneSwipeData(data) {
    if (!data) return null;
    return JSON.parse(JSON.stringify(data));
}
