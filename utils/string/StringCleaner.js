// utils/string/StringCleaner.js

/**
 * Утилиты для очистки строк
 */

/**
 * Удаляет HTML-теги из строки
 */
export function stripHtml(str) {
    if (!str || typeof str !== 'string') return str;
    return str
        .replace(/<[^>]+>/gm, '')
        .replace(/&[a-z0-9#]+;/gi, ' ')
        .trim();
}

/**
 * Удаляет лишние пробелы и переносы
 */
export function normalizeWhitespace(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\s+/g, ' ').trim();
}

/**
 * Экранирует HTML-спецсимволы
 */
export function escapeHtml(str) {
    if (!str || typeof str !== 'string') return str;
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };
    return str.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

/**
 * Обрезает строку до указанной длины
 */
export function truncate(str, maxLength, suffix = '...') {
    if (!str || typeof str !== 'string') return str;
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Очищает строку от управляющих символов
 */
export function stripControlChars(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}

/**
 * Удаляет markdown-форматирование
 */
export function stripMarkdown(str) {
    if (!str || typeof str !== 'string') return str;
    return str
        .replace(/\*\*(.*?)\*\*/g, '$1')  // bold
        .replace(/\*(.*?)\*/g, '$1')        // italic
        .replace(/`(.*?)`/g, '$1')          // code
        .replace(/~~(.*?)~~/g, '$1')        // strikethrough
        .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // links
}
