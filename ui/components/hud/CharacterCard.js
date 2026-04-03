// ui/components/hud/CharacterCard.js

/**
 * Компонент карточки персонажа
 */

import { characterCardTemplate } from '../../rendering/TemplateEngine.js';

/**
 * Рендерит одну карточку персонажа
 * @param {string} name
 * @param {Object} charData - { outfit, state, thoughts, relationship, emoji, ... }
 * @returns {string} HTML
 */
export function renderCharacterCard(name, charData) {
    return characterCardTemplate({ name, ...charData });
}

/**
 * Рендерит все карточки персонажей
 * @param {Object} characters - { name: data }
 * @param {Array} ignored - список игнорируемых имён
 * @returns {string} HTML
 */
export function renderAllCharacters(characters, ignored = []) {
    return Object.entries(characters)
        .filter(([name, data]) => !ignored.includes(name) && !data.isHiddenFromScene)
        .map(([name, data]) => renderCharacterCard(name, data))
        .join('');
}

/**
 * Получает цвет отношения
 */
export function getRelationshipColor(value) {
    if (value > 60) return '#52e0a3';
    if (value < 40) return '#e05252';
    return '#e0a352';
}
