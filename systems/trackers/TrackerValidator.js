// systems/trackers/TrackerValidator.js

/**
 * Валидация трекеров и их значений
 */

/**
 * Валидирует конфигурацию трекера
 */
export function isValidTrackerConfig(config) {
    return config
        && typeof config.id === 'string' && config.id.length > 0
        && typeof config.label === 'string' && config.label.length > 0
        && typeof config.max === 'number' && config.max > 0;
}

/**
 * Валидирует массив трекеров
 */
export function validateTrackersArray(trackers) {
    if (!Array.isArray(trackers)) return [];
    return trackers.filter(isValidTrackerConfig);
}

/**
 * Санитизирует значение трекера (клампинг 0-max)
 */
export function sanitizeValue(value, max = 100) {
    const parsed = parseInt(value);
    if (isNaN(parsed)) return 0;
    return Math.min(Math.max(0, parsed), max);
}

/**
 * Проверяет, является ли значение критическим (≤20%)
 */
export function isCritical(value, max) {
    return max > 0 && (value / max) <= 0.2;
}

/**
 * Проверяет, является ли значение предупреждением (≤40%)
 */
export function isWarning(value, max) {
    return max > 0 && (value / max) <= 0.4;
}

/**
 * Возвращает статус трекера
 */
export function getStatus(value, max) {
    if (isCritical(value, max)) return 'critical';
    if (isWarning(value, max)) return 'warning';
    return 'normal';
}

/**
 * Вычисляет процент заполнения
 */
export function getPercent(value, max) {
    if (max <= 0) return 0;
    return Math.round((value / max) * 100);
}
