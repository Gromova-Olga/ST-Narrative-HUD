// utils/string/RegexHelper.js

/**
 * Хелперы для работы с регулярными выражениями
 */

/**
 * Экранирует спецсимволы regex
 */
export function escapeRegex(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Создаёт regex из строки с экранированием
 */
export function createRegex(pattern, flags = 'gi') {
    return new RegExp(escapeRegex(pattern), flags);
}

/**
 * Безопасный match — возвращает null при ошибке
 */
export function safeMatch(text, regex) {
    try {
        return text.match(regex);
    } catch (e) {
        console.warn('[NHUD] Regex match error:', e);
        return null;
    }
}

/**
 * Безопасный replace
 */
export function safeReplace(text, regex, replacement) {
    try {
        return text.replace(regex, replacement);
    } catch (e) {
        console.warn('[NHUD] Regex replace error:', e);
        return text;
    }
}

/**
 * Проверяет, содержит ли строка паттерн
 */
export function containsPattern(text, pattern) {
    if (!text || !pattern) return false;
    const regex = typeof pattern === 'string' ? createRegex(pattern) : pattern;
    return regex.test(text);
}

/**
 * Извлекает все совпадения паттерна
 */
export function extractAll(text, pattern) {
    if (!text || !pattern) return [];
    const regex = typeof pattern === 'string' 
        ? new RegExp(pattern, 'gi') 
        : new RegExp(pattern.source, 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push(match);
    }
    return matches;
}
