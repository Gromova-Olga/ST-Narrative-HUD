// utils/formatting/PopupFormatter.js

/**
 * Форматирование контента для попапов и модальных окон
 */

/**
 * Форматирует текст для отображения в попапе
 * Конвертирует markdown в HTML с красивым форматированием
 */
export function formatPopupText(text) {
    if (!text) return '<i style="color:#555">Нет данных</i>';
    return String(text)
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => `<div style="margin-bottom:8px; line-height:1.4;">${
            line
                .replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--nhud-text-main, #e0b0b0);">$1</b>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>')
        }</div>`)
        .join('');
}

/**
 * Форматирует список для попапа
 */
export function formatPopupList(items, ordered = false) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return '<i style="color:#555">Пусто</i>';
    }
    const tag = ordered ? 'ol' : 'ul';
    const itemsHtml = items
        .map(item => `<li style="margin-bottom:4px;">${formatPopupText(item)}</li>`)
        .join('');
    return `<${tag} style="margin:8px 0; padding-left:20px;">${itemsHtml}</${tag}>`;
}

/**
 * Форматирует пары ключ-значение для попапа
 */
export function formatPopupKeyValue(data, labelMap = {}) {
    if (!data || typeof data !== 'object') return '';
    return Object.entries(data)
        .map(([key, value]) => {
            const label = labelMap[key] || key;
            return `<div style="margin-bottom:6px;">
                <span style="color:var(--nhud-text-muted, #a08080);">${label}:</span>
                <span style="color:var(--nhud-text-main, #e0b0b0);">${value}</span>
            </div>`;
        })
        .join('');
}

/**
 * Создаёт HTML для статусного индикатора
 */
export function formatStatusBadge(status, colorMap = {}) {
    const colors = {
        active: '#52e0a3',
        completed: '#52a8e0',
        failed: '#e05252',
        warning: '#e0a352',
        ...colorMap,
    };
    const color = colors[status] || '#888';
    return `<span style="
        display:inline-block; 
        padding:2px 8px; 
        background:${color}22; 
        border:1px solid ${color}; 
        border-radius:4px; 
        color:${color}; 
        font-size:12px;
        text-transform:uppercase;
    ">${status}</span>`;
}

/**
 * Оборачивает контент в контейнер попапа
 */
export function wrapPopupContent(title, content, icon = '') {
    return `
        <div class="nhud-popup-content">
            ${title ? `<div class="nhud-popup-header" style="margin-bottom:12px; font-weight:bold; font-size:16px;">
                ${icon ? `<span style="margin-right:8px;">${icon}</span>` : ''}
                ${title}
            </div>` : ''}
            <div class="nhud-popup-body">${content}</div>
        </div>
    `;
}
