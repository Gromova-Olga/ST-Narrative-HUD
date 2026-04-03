// types/SwipeDataModel.js

/**
 * @typedef {Object} SwipeData
 * @property {Object} trackers - Значения трекеров
 * @property {Object} characters - Данные персонажей
 * @property {Object} infoBlocks - Инфоблоки (datetime, location, weather и т.д.)
 * @property {Array} quests - Квесты
 * @property {Object} [extra] - Дополнительные данные
 */

export class SwipeDataModel {
    /**
     * Создаёт пустую модель данных свайпа
     */
    static create() {
        return {
            trackers: {},
            characters: {},
            infoBlocks: {
                datetime: '',
                location: '',
                weather: '',
                comments: '',
                monologue: '',
                diary: '',
                skillchecks: '',
            },
            quests: [],
            extra: {},
        };
    }

    /**
     * Мержит данные в модель
     */
    static merge(existing, incoming) {
        const result = { ...existing };

        if (incoming.trackers) {
            result.trackers = { ...result.trackers, ...incoming.trackers };
        }

        if (incoming.characters) {
            result.characters = { ...result.characters, ...incoming.characters };
        }

        if (incoming.infoBlocks) {
            result.infoBlocks = { ...result.infoBlocks, ...incoming.infoBlocks };
        }

        if (incoming.quests) {
            result.quests = incoming.quests;
        }

        if (incoming.extra) {
            result.extra = { ...result.extra, ...incoming.extra };
        }

        return result;
    }

    /**
     * Очищает пустые поля
     */
    static clean(data) {
        const cleaned = { ...data };
        
        // Удаляем пустые infoBlocks
        Object.keys(cleaned.infoBlocks).forEach(key => {
            if (!cleaned.infoBlocks[key]) delete cleaned.infoBlocks[key];
        });

        // Удаляем пустые characters
        Object.keys(cleaned.characters).forEach(key => {
            if (!cleaned.characters[key] || Object.keys(cleaned.characters[key]).length === 0) {
                delete cleaned.characters[key];
            }
        });

        return cleaned;
    }

    /**
     * Проверяет, есть ли данные
     */
    static isEmpty(data) {
        return Object.keys(data.trackers).length === 0
            && Object.keys(data.characters).length === 0
            && Object.values(data.infoBlocks).every(v => !v)
            && data.quests.length === 0;
    }

    /**
     * Валидирует модель
     */
    static isValid(data) {
        return data
            && typeof data.trackers === 'object'
            && typeof data.characters === 'object'
            && typeof data.infoBlocks === 'object'
            && Array.isArray(data.quests);
    }
}
