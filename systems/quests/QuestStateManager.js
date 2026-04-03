// systems/quests/QuestStateManager.js

/**
 * Управление состоянием квестов
 */

/**
 * Добавляет или обновляет квест
 * @param {Array} quests - массив текущих квестов
 * @param {Object} questData - { title, desc, status }
 * @returns {{ quest: Object, isNew: boolean, statusChanged: boolean }}
 */
export function upsertQuest(quests, questData) {
    if (!questData?.title) return { quest: null, isNew: false, statusChanged: false };

    const existing = quests.find(q => q.title.toLowerCase() === questData.title.toLowerCase());

    if (existing) {
        const oldStatus = existing.status;
        const newStatus = questData.status || oldStatus;
        const statusChanged = oldStatus !== newStatus;

        existing.status = newStatus;
        if (questData.desc) existing.desc = questData.desc;

        if (statusChanged && (newStatus === 'completed' || newStatus === 'failed')) {
            existing.dateCompleted = new Date().toLocaleDateString('ru-RU');
        }

        return { quest: existing, isNew: false, statusChanged };
    }

    const newQuest = {
        title: questData.title,
        desc: questData.desc || '...',
        status: questData.status || 'active',
        dateAdded: new Date().toLocaleDateString('ru-RU'),
        dateCompleted: null,
    };

    quests.unshift(newQuest);
    return { quest: newQuest, isNew: true, statusChanged: false };
}

/**
 * Получает квесты по статусу
 */
export function getQuestsByStatus(quests, status) {
    return quests.filter(q => q.status === status);
}

/**
 * Получает активные квесты
 */
export function getActiveQuests(quests) {
    return getQuestsByStatus(quests, 'active');
}
