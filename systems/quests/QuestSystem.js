// systems/quests/QuestSystem.js

/**
 * Система квестов — обработка обновлений из JSON-ответа AI
 */

import { eventBus } from '../../core/EventBus.js';
import { upsertQuest, getActiveQuests } from './QuestStateManager.js';

/**
 * Применяет обновления квестов из JSON
 * @param {Array} questsJson - массив квестов из JSON [{ title, desc, status }]
 * @param {Array} liveQuests - текущий массив квестов
 * @returns {{ quests: Array, notifications: Array }}
 */
export function applyQuestsUpdate(questsJson, liveQuests) {
    if (!Array.isArray(questsJson) || questsJson.length === 0) {
        return { quests: liveQuests, notifications: [] };
    }

    const notifications = [];

    questsJson.forEach(questData => {
        const result = upsertQuest(liveQuests, questData);

        if (result.isNew) {
            notifications.push({ title: result.quest.title, status: 'new', icon: '📜' });
        } else if (result.statusChanged) {
            const icon = result.quest.status === 'completed' ? '✅' : result.quest.status === 'failed' ? '❌' : '📜';
            notifications.push({ title: result.quest.title, status: result.quest.status, icon });
        }
    });

    if (notifications.length > 0) {
        eventBus.emit('quests:updated', { notifications, quests: [...liveQuests] });
    }

    return { quests: liveQuests, notifications };
}

/**
 * Получает сводку по квестам для промпта
 */
export function getQuestsPromptText(quests) {
    const active = getActiveQuests(quests);
    if (active.length === 0) return '';
    return active.map(q => `- ${q.title}: ${q.desc}`).join('\n');
}
