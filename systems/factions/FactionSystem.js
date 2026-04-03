// systems/factions/FactionSystem.js

/**
 * Система фракций — репутация и управление
 */

import { eventBus } from '../../core/EventBus.js';

/**
 * Применяет обновления фракций из JSON
 * @param {Object|Array} factionsJson - данные фракций
 * @param {Array} factions - текущий массив фракций
 * @returns {{ factions: Array, notifications: Array }}
 */
export function applyFactionsUpdate(factionsJson, factions) {
    if (!factionsJson) return { factions, notifications: [] };

    let pairs;
    if (Array.isArray(factionsJson)) {
        pairs = factionsJson.filter(f => f?.name).map(f => [f.name, parseInt(f.rep) || 0]);
    } else {
        pairs = Object.entries(factionsJson).map(([name, rep]) => [name, parseInt(rep) || 0]);
    }

    const notifications = [];

    pairs.forEach(([name, rep]) => {
        rep = Math.min(100, Math.max(0, rep));
        const existing = factions.find(f => f.name.toLowerCase() === name.toLowerCase());

        if (existing) {
            if (existing.rep !== rep) {
                const delta = rep - existing.rep;
                existing.rep = rep;
                notifications.push({
                    type: 'rep-changed',
                    name,
                    delta,
                    icon: delta > 0 ? '📈' : '📉',
                    text: `${name}: ${delta > 0 ? '+' : ''}${delta}`,
                });
            }
        } else {
            factions.push({ name, rep, desc: '', descActive: false });
            notifications.push({
                type: 'new-faction',
                name,
                icon: '⚑',
                text: name,
            });
        }
    });

    if (notifications.length > 0) {
        eventBus.emit('factions:updated', { notifications, factions: [...factions] });
    }

    return { factions, notifications };
}

/**
 * Получает фракцию по имени
 */
export function getFactionByName(factions, name) {
    return factions.find(f => f.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Получает текст для промпта
 */
export function getFactionsPromptText(factions) {
    if (!factions?.length) return '';
    return factions.map(f => `${f.name}: ${f.rep}/100${f.descActive && f.desc ? ` (${f.desc})` : ''}`).join('\n');
}
