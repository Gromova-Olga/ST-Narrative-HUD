// types/TrackerModel.js

/**
 * @typedef {Object} TrackerConfig
 * @property {string} id - Уникальный ID трекера
 * @property {string} label - Отображаемое имя
 * @property {number} max - Максимальное значение
 * @property {string} color - Цвет в HEX
 */

/**
 * @typedef {Object} TrackerState
 * @property {string} id - ID трекера
 * @property {number} value - Текущее значение
 * @property {number} max - Максимальное значение
 * @property {number} percent - Процент заполнения (0-100)
 * @property {string} status - Статус: 'normal' | 'warning' | 'critical'
 */

export class TrackerModel {
    /**
     * Создаёт конфигурацию трекера
     */
    static createConfig(id, label, max = 100, color = '#52e0a3') {
        return { id, label, max, color };
    }

    /**
     * Создаёт состояние трекера
     */
    static createState(id, value, max = 100) {
        const clampedValue = Math.min(Math.max(0, value), max);
        const percent = max > 0 ? Math.round((clampedValue / max) * 100) : 0;
        let status = 'normal';
        if (percent <= 20) status = 'critical';
        else if (percent <= 40) status = 'warning';

        return { id, value: clampedValue, max, percent, status };
    }

    /**
     * Обновляет значение трекера
     */
    static updateValue(currentState, newValue) {
        return TrackerModel.createState(currentState.id, newValue, currentState.max);
    }

    /**
     * Валидирует конфигурацию трекера
     */
    static isValidConfig(config) {
        return config 
            && typeof config.id === 'string' 
            && typeof config.label === 'string'
            && typeof config.max === 'number' 
            && config.max > 0;
    }

    /**
     * Возвращает дефолтные трекеры
     */
    static getDefaults() {
        return [
            TrackerModel.createConfig('health', 'Здоровье', 100, '#e05252'),
            TrackerModel.createConfig('hunger', 'Сытость', 100, '#e0a352'),
            TrackerModel.createConfig('energy', 'Энергия', 100, '#52a8e0'),
            TrackerModel.createConfig('hygiene', 'Гигиена', 100, '#52e0a3'),
            TrackerModel.createConfig('mood', 'Настроение', 100, '#e052a8'),
            TrackerModel.createConfig('mana', 'Мана', 100, '#a352e0'),
        ];
    }
}
