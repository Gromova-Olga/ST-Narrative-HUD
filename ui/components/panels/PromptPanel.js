// ui/components/panels/PromptPanel.js

/**
 * Панель промптов — отображение и редактирование промптов
 */

import { eventBus } from '../../../core/EventBus.js';

/**
 * Рендерит список промптов для редактирования
 * @param {Object} prompts - объект промптов из settings
 * @returns {string} HTML
 */
export function renderPromptList(prompts) {
    const promptFields = [
        { key: 'system', label: '🤖 System Prompt', rows: 6 },
        { key: 'trackersPrompt', label: '📊 Трекеры', rows: 2 },
        { key: 'charsPrompt', label: '👤 Персонажи', rows: 2 },
        { key: 'datetimePrompt', label: '📅 Время/Локация', rows: 2 },
        { key: 'achievementsPrompt', label: '🏆 Достижения', rows: 2 },
        { key: 'heroPrompt', label: '⚔️ Герой', rows: 2 },
        { key: 'questsPrompt', label: '📜 Квесты', rows: 2 },
        { key: 'codexPrompt', label: '📖 Кодекс', rows: 2 },
        { key: 'factionsPrompt', label: '⚑ Фракции', rows: 2 },
        { key: 'calendarPrompt', label: '📅 Календарь', rows: 2 },
    ];

    return promptFields
        .filter(f => prompts[f.key] !== undefined)
        .map(f => `
            <div class="nhud-prompt-field" style="margin-bottom:12px;">
                <label style="display:block; color:var(--nhud-text-muted); font-size:11px; margin-bottom:4px;">${f.label}</label>
                <textarea class="nhud-prompt-textarea" data-key="${f.key}" 
                    rows="${f.rows}" 
                    style="width:100%; background:rgba(0,0,0,0.3); border:1px solid var(--nhud-border); border-radius:4px; color:var(--nhud-text-main); padding:6px; font-size:12px; resize:vertical;">
                    ${(prompts[f.key] || '').trim()}
                </textarea>
            </div>
        `)
        .join('');
}

/**
 * Собирает значения промптов из textarea-полей
 * @returns {Object}
 */
export function collectPromptValues() {
    const result = {};
    document.querySelectorAll('.nhud-prompt-textarea').forEach(ta => {
        const key = ta.getAttribute('data-key');
        if (key) result[key] = ta.value;
    });
    return result;
}
