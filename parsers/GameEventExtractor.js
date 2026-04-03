// parsers/GameEventExtractor.js
import { stripHtml } from "../utils/string/StringCleaner.js";

export class GameEventExtractor {
    /**
     * Извлечь достижение
     */
    extractAchievement(data) {
        if (data.achievement && data.achievement.title) {
            return {
                title: stripHtml(data.achievement.title),
                desc: stripHtml(data.achievement.desc || ''),
                icon: data.achievement.icon || '🏆'
            };
        }

        // Поддержка массива достижений
        if (data.achievements) {
            const achievements = Array.isArray(data.achievements) ? data.achievements : [data.achievements];
            for (const ach of achievements) {
                if (ach?.title) {
                    return {
                        title: stripHtml(ach.title),
                        desc: stripHtml(ach.desc || ''),
                        icon: ach.icon || '🏆'
                    };
                }
            }
        }

        return null;
    }

    /**
     * Извлечь XP
     */
    extractXp(data) {
        if (!data.xp_gained) return null;

        const str = String(data.xp_gained).toLowerCase();
        if (str === 'small') return 'small';
        if (str === 'medium') return 'medium';
        if (str === 'large') return 'large';

        const num = parseInt(str);
        if (!isNaN(num) && num > 0) return num;

        return null;
    }

    /**
     * Извлечь квесты
     */
    extractQuests(data) {
        if (!data.quests || !Array.isArray(data.quests)) return [];

        return data.quests.map(q => ({
            title: stripHtml(q.title || 'Новый квест'),
            desc: stripHtml(q.desc || ''),
            status: q.status || 'active'
        }));
    }

    /**
     * Извлечь запись в кодекс
     */
    extractCodex(data) {
        if (data.codex_unlocked && data.codex_unlocked.title) {
            return {
                title: stripHtml(data.codex_unlocked.title),
                text: stripHtml(data.codex_unlocked.text || '')
            };
        }

        if (data.codex && Array.isArray(data.codex) && data.codex[0]?.title) {
            return {
                title: stripHtml(data.codex[0].title),
                text: stripHtml(data.codex[0].text || '')
            };
        }

        return null;
    }

    /**
     * Извлечь фракции
     */
    extractFactions(data) {
        if (!data.factions) return [];

        let factions = [];

        if (Array.isArray(data.factions)) {
            factions = data.factions.filter(f => f?.name).map(f => ({
                name: stripHtml(f.name),
                rep: parseInt(f.rep) || 0
            }));
        } else if (typeof data.factions === 'object') {
            factions = Object.entries(data.factions).map(([name, rep]) => ({
                name: stripHtml(name),
                rep: parseInt(rep) || 0
            }));
        }

        return factions;
    }

    /**
     * Извлечь событие календаря
     */
    extractCalendarEvent(data) {
        if (!data.calendar_event || !data.calendar_event.desc) return null;

        return {
            date: data.calendar_event.date || new Date().toLocaleDateString('ru-RU'),
            desc: stripHtml(data.calendar_event.desc)
        };
    }
}