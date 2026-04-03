// core/ConfigLoader.js

/**
 * Загрузка и валидация конфигурации расширения
 * 
 * Глубокое слияние настроек пользователя с дефолтами.
 * Миграция новых полей для старых пользователей.
 */

import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';
import { defaultSettings, extensionName } from '../constants/DefaultSettings.js';

/**
 * Загружает и инициализирует настройки
 * Гарантирует наличие всех полей из defaultSettings
 * @returns {Object} полный объект настроек
 */
export function loadAndValidateSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};

    // Глубокое слияние с дефолтами (jQuery extend для deep merge)
    if (typeof $ !== 'undefined' && $.extend) {
        extension_settings[extensionName] = $.extend(
            true,
            {},
            defaultSettings,
            extension_settings[extensionName]
        );
    } else {
        // Fallback: shallow merge для критичных полей
        const s = extension_settings[extensionName];
        Object.entries(defaultSettings).forEach(([key, val]) => {
            if (s[key] === undefined) {
                s[key] = typeof val === 'object' ? JSON.parse(JSON.stringify(val)) : val;
            }
        });
    }

    // Миграция модулей
    const s = extension_settings[extensionName];
    if (!s.modules) s.modules = { ...defaultSettings.modules };
    Object.entries(defaultSettings.modules).forEach(([key, val]) => {
        if (s.modules[key] === undefined) s.modules[key] = val;
    });

    // Миграция промптов
    if (!s.prompts) s.prompts = { ...defaultSettings.prompts };
    Object.entries(defaultSettings.prompts).forEach(([key, val]) => {
        if (s.prompts[key] === undefined) s.prompts[key] = val;
    });

    // Миграция jsonParser
    if (!s.jsonParser) s.jsonParser = { ...defaultSettings.jsonParser };
    ['enabled', 'openTag', 'closeTag', 'autoRemoveTags'].forEach(field => {
        if (s.jsonParser[field] === undefined) s.jsonParser[field] = defaultSettings.jsonParser[field];
    });

    // Миграция requestSettings
    if (!s.requestSettings) s.requestSettings = { ...defaultSettings.requestSettings };
    Object.entries(defaultSettings.requestSettings).forEach(([key, val]) => {
        if (s.requestSettings[key] === undefined) s.requestSettings[key] = val;
    });

    // Базовые поля
    if (!s.chatData) s.chatData = {};
    if (!s.liveData) s.liveData = JSON.parse(JSON.stringify(defaultSettings.liveData));
    if (!s.liveData.trackerValues) s.liveData.trackerValues = {};
    if (!s.liveData.characters) s.liveData.characters = {};
    if (!s.liveData.infoBlocks) s.liveData.infoBlocks = { ...defaultSettings.liveData.infoBlocks };
    if (!s.liveData.relHistory) s.liveData.relHistory = {};
    if (!s.liveData.ignoredCharacters) s.liveData.ignoredCharacters = [];
    if (!s.trackers) s.trackers = JSON.parse(JSON.stringify(defaultSettings.trackers));
    if (!s.characters) s.characters = [];
    if (!s.achievements) s.achievements = [];
    if (!s.promptBlocks) s.promptBlocks = JSON.parse(JSON.stringify(defaultSettings.promptBlocks));

    if (s.activeProfile === undefined) s.activeProfile = null;
    if (s.useSTProfile === undefined) s.useSTProfile = false;
    if (s.autoSend === undefined) s.autoSend = false;

    if (!s.ui) s.ui = { ...defaultSettings.ui };
    if (!s.design) s.design = { ...defaultSettings.design };
    if (!s.relationshipSettings) {
        s.relationshipSettings = {
            hintsEnabled: false,
            statuses: 'Враг, Незнакомец, Нейтралитет, Приятель, Друг, Возлюбленный, Заклятый враг',
        };
    }

    return s;
}

/**
 * Получает ссылку на объект настроек (без перезагрузки)
 */
export function getSettingsRef() {
    return extension_settings[extensionName] || {};
}

/**
 * Сохраняет настройки
 */
export function saveSettings() {
    saveSettingsDebounced();
}

/**
 * Сбрасывает настройки к дефолтам
 */
export function resetToDefaults() {
    extension_settings[extensionName] = JSON.parse(JSON.stringify(defaultSettings));
    saveSettingsDebounced();
    return extension_settings[extensionName];
}
