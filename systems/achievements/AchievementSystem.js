// systems/achievements/AchievementSystem.js

/**
 * Система достижений
 */

import { eventBus } from '../../core/EventBus.js';

/**
 * Разблокирует достижение (с защитой от дубликатов)
 * @param {Object} ach - { title, desc, icon }
 * @param {Array} achievements - массив достижений чата
 * @returns {{ unlocked: boolean, achievement: Object|null }}
 */
export function unlockAchievement(ach, achievements) {
    if (!ach?.title) return { unlocked: false, achievement: null };

    const exists = achievements.find(
        a => a.title.toLowerCase() === ach.title.toLowerCase()
    );
    if (exists) return { unlocked: false, achievement: exists };

    const entry = {
        title: ach.title,
        desc: ach.desc || '',
        icon: ach.icon || '🏆',
        date: new Date().toLocaleDateString() + ' ' +
              new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    achievements.push(entry);
    eventBus.emit('achievement:unlocked', { achievement: entry });

    return { unlocked: true, achievement: entry };
}

/**
 * Обрабатывает достижения из JSON-ответа AI
 * @param {Object} jsonData - полный JSON ответ
 * @param {Array} achievements - массив достижений чата
 * @returns {Array} массив новых достижений для уведомлений
 */
export function processAchievements(jsonData, achievements) {
    const notifications = [];

    // Одиночное achievement
    if (jsonData.achievement?.title) {
        const result = unlockAchievement(jsonData.achievement, achievements);
        if (result.unlocked) notifications.push(result.achievement);
    }

    // Массив achievements
    if (jsonData.achievements && !jsonData.achievement) {
        const achList = Array.isArray(jsonData.achievements) ? jsonData.achievements : [jsonData.achievements];
        achList.forEach(ach => {
            if (ach?.title) {
                const result = unlockAchievement(ach, achievements);
                if (result.unlocked) notifications.push(result.achievement);
            }
        });
    }

    return notifications;
}

/**
 * Получает количество достижений
 */
export function getAchievementCount(achievements) {
    return achievements?.length || 0;
}
