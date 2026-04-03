// integration/STContextProvider.js

/**
 * Единственная точка доступа к API SillyTavern
 * 
 * Все модули импортируют этот провайдер вместо прямого
 * вызова SillyTavern.getContext() или импорта из script.js
 * 
 * Это изолирует зависимость от ST API в одном месте.
 */

let _cachedContext = null;
let _cacheTime = 0;
const CACHE_TTL = 100; // мс — короткий кеш для batch-операций

/**
 * Получает контекст SillyTavern (с кешированием)
 */
function getRawContext() {
    const now = Date.now();
    if (_cachedContext && (now - _cacheTime) < CACHE_TTL) {
        return _cachedContext;
    }
    try {
        _cachedContext = typeof SillyTavern !== 'undefined' ? SillyTavern.getContext() : {};
        _cacheTime = now;
        return _cachedContext;
    } catch (e) {
        console.warn('[STContextProvider] Failed to get ST context:', e);
        return {};
    }
}

/**
 * Инвалидирует кеш контекста
 */
export function invalidateCache() {
    _cachedContext = null;
    _cacheTime = 0;
}

// ─── Основные геттеры ───

/**
 * Возвращает полный контекст ST
 */
export function getContext() {
    return getRawContext();
}

/**
 * Имя пользователя
 */
export function getUserName() {
    return getRawContext().name1 || '';
}

/**
 * Имя персонажа
 */
export function getCharName() {
    return getRawContext().name2 || '';
}

/**
 * Аватар персонажа (URL-путь)
 */
export function getCharAvatar() {
    try {
        const ctx = getRawContext();
        const charName = ctx.name2;
        const char = ctx.characters?.find(c => c.name === charName);
        if (char?.avatar) {
            return `/thumbnail?type=avatar&file=${encodeURIComponent(char.avatar)}`;
        }
        return '';
    } catch {
        return '';
    }
}

/**
 * ID текущего чата
 */
export function getChatId() {
    const ctx = getRawContext();
    const id = ctx?.chatId ?? window.chat_id;
    return id ? String(id) : null;
}

/**
 * Массив сообщений текущего чата
 */
export function getChat() {
    return getRawContext().chat || [];
}

/**
 * Количество сообщений
 */
export function getChatLength() {
    return getChat().length;
}

/**
 * Получить сообщение по индексу
 */
export function getMessage(index) {
    const chat = getChat();
    return chat[index] || null;
}

/**
 * Последнее сообщение от бота (не user, не system)
 */
export function getLastBotMessage() {
    const chat = getChat();
    for (let i = chat.length - 1; i >= 0; i--) {
        if (!chat[i].is_user && !chat[i].is_system) {
            return { index: i, message: chat[i] };
        }
    }
    return null;
}

/**
 * Настройки расширений
 */
export function getExtensionSettings() {
    return getRawContext().extensionSettings || {};
}

/**
 * Профили Connection Manager
 */
export function getConnectionProfiles() {
    return getExtensionSettings().connectionManager?.profiles || [];
}

/**
 * Находит профиль по имени
 */
export function findProfileByName(name) {
    if (!name) return null;
    return getConnectionProfiles().find(p => p.name === name) || null;
}

/**
 * Находит профиль по ID
 */
export function findProfileById(id) {
    if (!id) return null;
    return getConnectionProfiles().find(p => p.id === id) || null;
}

/**
 * getRequestHeaders для API-запросов
 */
export function getRequestHeaders() {
    try {
        return getRawContext().getRequestHeaders?.() || {};
    } catch {
        return {};
    }
}

/**
 * Проверяет, доступен ли ST API
 */
export function isSTAvailable() {
    return typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function';
}
