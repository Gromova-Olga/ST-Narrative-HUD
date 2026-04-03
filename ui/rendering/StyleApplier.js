// ui/rendering/StyleApplier.js

/**
 * Применение стилей и CSS-переменных
 */

/**
 * Смешивает HEX-цвет с прозрачностью и опциональным фоновым изображением
 * @param {string} hex - цвет в HEX
 * @param {number} alpha - прозрачность 0-1
 * @param {string} imgUrl - URL изображения
 * @returns {string} CSS background value
 */
export function getBgString(hex, alpha, imgUrl) {
    let rgba = `rgba(20, 10, 15, ${alpha})`;
    if (hex && hex.startsWith('#')) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (imgUrl && imgUrl.trim() !== '') {
        return `linear-gradient(${rgba}, ${rgba}), url('${imgUrl}') center/cover no-repeat`;
    }
    return rgba;
}

/**
 * Применяет CSS-переменные к root-элементу
 * @param {Object} design - объект настроек дизайна
 */
export function applyDesignVariables(design) {
    if (!design) return;

    const root = document.documentElement;
    const vars = {
        '--nhud-bg': getBgString(design.hudBgColor, design.hudBgOpacity, design.hudBgImage),
        '--nhud-prompt-bg': getBgString(design.promptBgColor, 0.95, design.promptBgImage),
        '--nhud-prompt-header': design.promptHeaderBg || '#2a101a',
        '--nhud-prompt-border': `1px solid ${design.borderColor || '#4a1525'}`,
        '--nhud-prompt-text-color': design.promptTextColor || '#e0b0b0',
        '--nhud-prompt-font-size': `${design.promptFontSize || 14}px`,
        '--nhud-prompt-width': `${design.promptWidth || 300}px`,
        '--nhud-border': design.borderColor || '#4a1525',
        '--nhud-text-main': design.textMain || '#e0b0b0',
        '--nhud-text-muted': design.textMuted || '#a08080',
        '--nhud-accent': design.accent || '#d05070',
        '--nhud-bar-start': design.barColorStart || '#52e0a3',
        '--nhud-bar-end': design.barColorEnd || '#e05252',
    };

    Object.entries(vars).forEach(([key, val]) => {
        root.style.setProperty(key, val);
    });
}

/**
 * Инжектит пользовательский CSS
 * @param {string} css
 */
export function applyCustomCss(css) {
    let styleEl = document.getElementById('nhud-custom-css');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'nhud-custom-css';
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = css || '';
}

/**
 * Получает динамический цвет трекера (градиент от bar-start к bar-end по проценту)
 * @param {number} percent - 0-100
 * @returns {string} CSS цвет
 */
export function getDynamicBarColor(percent) {
    if (percent > 60) return 'var(--nhud-bar-start, #52e0a3)';
    if (percent > 30) return '#e0a352';
    return 'var(--nhud-bar-end, #e05252)';
}
