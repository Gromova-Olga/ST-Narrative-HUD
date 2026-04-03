// api/ProfileResolver.js

/**
 * Резолвинг профилей подключений
 * 
 * Определяет, какой профиль API использовать,
 * маппит типы API и валидирует настройки.
 */

import { proxies, chat_completion_sources } from '../../../../openai.js';
import { getConnectionProfiles, findProfileByName, findProfileById, getActiveProfile } from '../integration/STProfileManager.js';

/**
 * Маппинг имён API → chat_completion_sources ST
 */
const API_SOURCE_MAP = {
    'google': chat_completion_sources.MAKERSUITE,
    'claude': chat_completion_sources.CLAUDE,
    'openrouter': chat_completion_sources.OPENROUTER,
};

/**
 * Получает профиль по имени или ID
 * @param {string} profileNameOrId
 * @returns {Object|null}
 */
export function resolveProfile(profileNameOrId) {
    if (!profileNameOrId) return null;
    return findProfileByName(profileNameOrId) || findProfileById(profileNameOrId);
}

/**
 * Получает активный профиль ST
 */
export function resolveActiveProfile() {
    return getActiveProfile();
}

/**
 * Маппит тип API в chat_completion_source
 * @param {string} apiName
 * @returns {string}
 */
export function getChatCompletionSource(apiName) {
    return API_SOURCE_MAP[apiName] || apiName;
}

/**
 * Получает настройки прокси для профиля
 * @param {Object} profile
 * @returns {{ url: string, password: string }|null}
 */
export function getProxySettings(profile) {
    if (!profile?.proxy) return null;
    const proxy = proxies.find(p => p.name === profile.proxy);
    if (proxy?.url) {
        return { url: proxy.url, password: proxy.password || '' };
    }
    return null;
}

/**
 * Получает custom URL для OpenAI-совместимых API
 * @param {Object} profile
 * @returns {string|null}
 */
export function getCustomUrl(profile) {
    if (profile?.api === 'custom' && profile['api-url']) {
        return profile['api-url'];
    }
    return null;
}

/**
 * Валидирует профиль — есть ли минимально необходимые данные
 * @param {Object} profile
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProfile(profile) {
    const errors = [];

    if (!profile) {
        return { valid: false, errors: ['Профиль не найден'] };
    }

    if (!profile.api) errors.push('Не указан тип API');
    if (!profile.model && !profile.model_custom) errors.push('Не указана модель');

    const hasKey = profile.api_key || profile.key;
    if (!hasKey && profile.api !== 'custom') {
        errors.push('Не указан API ключ');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Получает список всех доступных профилей с валидацией
 * @returns {Array<{ profile: Object, valid: boolean, errors: string[] }>}
 */
export function listProfilesWithValidation() {
    return getConnectionProfiles().map(profile => ({
        profile,
        ...validateProfile(profile),
    }));
}
