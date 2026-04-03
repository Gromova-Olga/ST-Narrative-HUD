// utils/validation/DataValidator.js

/**
 * Валидация данных приложения
 */

/**
 * Проверяет, является ли строка непустой
 */
export function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Проверяет, является ли значение числом в диапазоне
 */
export function isNumberInRange(value, min, max) {
    return typeof value === 'number' 
        && !isNaN(value) 
        && value >= min 
        && value <= max;
}

/**
 * Проверяет, является ли значение целым числом
 */
export function isInteger(value) {
    return typeof value === 'number' && Number.isInteger(value);
}

/**
 * Клампинг числа в диапазон
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(min, value), max);
}

/**
 * Проверяет валидность email (базовая)
 */
export function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Проверяет валидность URL
 */
export function isValidUrl(url) {
    if (typeof url !== 'string') return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Проверяет, что массив не пуст и содержит только элементы указанного типа
 */
export function isArrayOf(arr, typeCheck) {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    return arr.every(item => typeCheck(item));
}

/**
 * Проверяет наличие обязательных полей в объекте
 */
export function hasRequiredFields(obj, fields) {
    if (typeof obj !== 'object' || obj === null) return false;
    return fields.every(field => obj.hasOwnProperty(field) && obj[field] !== undefined && obj[field] !== null);
}

/**
 * Санитизирует значение трекера (целое число 0-max)
 */
export function sanitizeTrackerValue(value, max = 100) {
    const parsed = parseInt(value);
    if (isNaN(parsed)) return 0;
    return clamp(parsed, 0, max);
}
