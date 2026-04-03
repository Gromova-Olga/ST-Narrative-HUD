// integration/STProfileManager.js

/**
 * Работа с профилями SillyTavern Connection Manager
 * 
 * Инкапсулирует логику выбора и управления профилями API.
 * Зависит только от STContextProvider.
 */

import { getConnectionProfiles, findProfileByName, findProfileById, getExtensionSettings } from './STContextProvider.js';

/**
 * Получает все доступные профили
 */
export function getAllProfiles() {
    return getConnectionProfiles();
}

/**
 * Получает профиль по имени или ID
 */
export function getProfile(nameOrId) {
    if (!nameOrId) return null;
    return findProfileByName(nameOrId) || findProfileById(nameOrId);
}

/**
 * Получает текущий активный профиль ST
 */
export function getActiveProfile() {
    try {
        const settings = getExtensionSettings();
        const activeId = settings.connectionManager?.activeProfile;
        if (activeId) {
            return findProfileById(activeId) || null;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Получает API-ключ из профиля
 */
export function getApiKey(profile) {
    if (!profile) return null;
    // Профили ST могут хранить ключ в разных местах
    return profile.api_key || profile.key || profile.apiKey || null;
}

/**
 * Получает URL API из профиля
 */
export function getApiUrl(profile) {
    if (!profile) return null;
    return profile.api_url || profile.url || profile.baseUrl || null;
}

/**
 * Получает тип API из профиля (openai, claude, google и т.д.)
 */
export function getApiType(profile) {
    if (!profile) return null;
    return profile.api || profile.type || profile.source || null;
}

/**
 * Получает модель из профиля
 */
export function getModel(profile) {
    if (!profile) return null;
    return profile.model || profile.model_id || null;
}

/**
 * Проверяет, заполнен ли профиль (есть ключ и URL)
 */
export function isProfileReady(profile) {
    if (!profile) return false;
    const key = getApiKey(profile);
    const url = getApiUrl(profile);
    return !!(key && url);
}

/**
 * Форматирует профиль для отображения
 */
export function formatProfileForDisplay(profile) {
    if (!profile) return { name: 'Не выбран', api: '-', model: '-', ready: false };
    return {
        name: profile.name || 'Без имени',
        api: getApiType(profile) || '-',
        model: getModel(profile) || '-',
        ready: isProfileReady(profile),
    };
}
