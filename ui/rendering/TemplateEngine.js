// ui/rendering/TemplateEngine.js

/**
 * Шаблонизатор для HTML
 * Простой template engine с заменой {{placeholders}}
 */

/**
 * Рендерит шаблон с переменными
 * @param {string} template - HTML-шаблон с {{key}}
 * @param {Object} vars - { key: value }
 * @returns {string}
 */
export function render(template, vars = {}) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return vars[key] !== undefined ? vars[key] : match;
    });
}

/**
 * Рендерит список элементов
 * @param {string} itemTemplate - шаблон одного элемента
 * @param {Array} items - массив данных
 * @returns {string}
 */
export function renderList(itemTemplate, items) {
    return items.map(item => render(itemTemplate, item)).join('');
}

/**
 * Условный рендер
 * @param {boolean} condition
 * @param {string} trueTemplate
 * @param {string} falseTemplate
 * @returns {string}
 */
export function renderIf(condition, trueTemplate, falseTemplate = '') {
    return condition ? trueTemplate : falseTemplate;
}

/**
 * Шаблон трекер-бара
 */
export function trackerBarTemplate(tracker) {
    return `<div class="nhud-tracker-row" data-tracker="${tracker.id}">
        <div class="nhud-tracker-label" style="display:flex; justify-content:space-between; margin-bottom:3px;">
            <span style="color:var(--nhud-text-main); font-size:12px;">${tracker.label}</span>
            <span style="color:var(--nhud-text-muted); font-size:11px;">${tracker.value}/${tracker.max}</span>
        </div>
        <div class="nhud-tracker-bar-bg" style="height:20px; background:rgba(0,0,0,0.4); border-radius:4px; overflow:hidden; border:1px solid rgba(255,255,255,0.05);">
            <div class="nhud-tracker-bar-fill" style="height:100%; width:${tracker.percent}%; background:linear-gradient(90deg, ${tracker.color}, ${tracker.color}88); border-radius:3px; transition:width 0.5s ease;"></div>
        </div>
    </div>`;
}

/**
 * Шаблон карточки персонажа
 */
export function characterCardTemplate(char) {
    const rel = char.relationship ?? 50;
    const relColor = rel > 60 ? '#52e0a3' : rel < 40 ? '#e05252' : '#e0a352';
    return `<div class="nhud-character-card" data-char="${char.name}" style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.05); border-radius:6px; padding:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:var(--nhud-text-main); font-weight:bold; font-size:13px;">${char.emoji || '👤'} ${char.name}</span>
            <span style="color:${relColor}; font-size:11px;">${rel}</span>
        </div>
        ${char.state ? `<div style="color:var(--nhud-text-muted); font-size:11px; margin-top:3px;">${char.state}</div>` : ''}
    </div>`;
}

/**
 * Шаблон инфоблока
 */
export function infoBlockButtonTemplate(block) {
    const hasContent = block.content && block.content.trim().length > 0;
    return `<button class="nhud-info-btn ${hasContent ? 'has-content' : ''}" 
        data-block="${block.id}" 
        title="${block.label}"
        style="padding:4px 8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:4px; cursor:pointer; font-size:12px; color:var(--nhud-text-main); transition:0.2s;">
        ${block.label}
    </button>`;
}
