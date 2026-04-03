// utils/formatting/TextFormatter.js

/**
 * Форматирование текста (markdown, HTML и т.д.)
 */

/**
 * Конвертирует markdown в HTML
 */
export function markdownToHtml(text) {
    if (!text || typeof text !== 'string') return text;
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/\n/g, '<br>');
}

/**
 * Конвертирует HTML в markdown
 */
export function htmlToMarkdown(html) {
    if (!html || typeof html !== 'string') return html;
    return html
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
        .replace(/<code>(.*?)<\/code>/gi, '`$1`')
        .replace(/<del>(.*?)<\/del>/gi, '~~$1~~')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '');
}

/**
 * Форматирует число с разделителями тысяч
 */
export function formatNumber(num, locale = 'ru-RU') {
    return new Intl.NumberFormat(locale).format(num);
}

/**
 * Форматирует дату
 */
export function formatDate(date, locale = 'ru-RU', options = {}) {
    const defaults = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Intl.DateTimeFormat(locale, { ...defaults, ...options }).format(new Date(date));
}

/**
 * Форматирует время
 */
export function formatTime(date, locale = 'ru-RU') {
    return new Intl.DateTimeFormat(locale, { 
        hour: '2-digit', 
        minute: '2-digit' 
    }).format(new Date(date));
}

/**
 * Форматирует процент
 */
export function formatPercent(value, decimals = 0) {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Форматирует изменение числа (+/-)
 */
export function formatDelta(value, showSign = true) {
    if (!showSign) return String(value);
    return value >= 0 ? `+${value}` : String(value);
}
