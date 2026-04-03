// ui/components/panels/SettingsPanel.js

/**
 * Панель настроек — управление вкладками и секциями
 */

import { eventBus } from '../../../core/EventBus.js';

/**
 * Переключает вкладку настроек
 * @param {string} tabId - ID вкладки
 */
export function switchSettingsTab(tabId) {
    document.querySelectorAll('.nhud-settings-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    document.querySelectorAll('.nhud-settings-content').forEach(content => {
        content.style.display = content.dataset.tab === tabId ? 'block' : 'none';
    });
    eventBus.emit('settings:tab-changed', { tabId });
}

/**
 * Инициализирует навигацию по вкладкам
 * @param {Element} container
 */
export function initTabNavigation(container) {
    container.querySelectorAll('.nhud-settings-tab').forEach(tab => {
        tab.addEventListener('click', () => switchSettingsTab(tab.dataset.tab));
    });
}

/**
 * Рендерит переключатели модулей
 * @param {Object} modules - { moduleName: boolean }
 * @returns {string} HTML
 */
export function renderModuleToggles(modules) {
    const moduleLabels = {
        trackers: '📊 Трекеры',
        characters: '👥 Персонажи',
        relationships: '❤️ Отношения',
        thoughts: '💭 Мысли',
        datetime: '📅 Время',
        achievements: '🏆 Достижения',
        hero: '⚔️ Герой',
        quests: '📜 Квесты',
        calendar: '📅 Календарь',
        factions: '⚑ Фракции',
        codex: '📖 Кодекс',
        inventory: '🎒 Инвентарь',
        loreInjection: '💉 Лор-инжекция',
        customBlocks: '📦 Кастомные блоки',
    };

    return Object.entries(moduleLabels)
        .map(([key, label]) => `
            <label style="display:flex; align-items:center; gap:8px; padding:4px 0; cursor:pointer; color:var(--nhud-text-main); font-size:12px;">
                <input type="checkbox" class="nhud-module-toggle" data-module="${key}" 
                    ${modules[key] !== false ? 'checked' : ''} />
                ${label}
            </label>
        `)
        .join('');
}

/**
 * Собирает состояние модулей из чекбоксов
 * @returns {Object}
 */
export function collectModuleStates() {
    const result = {};
    document.querySelectorAll('.nhud-module-toggle').forEach(cb => {
        result[cb.dataset.module] = cb.checked;
    });
    return result;
}
