// utils/validation/JsonValidator.js

/**
 * Валидация JSON-данных
 */

/**
 * Проверяет, является ли строка валидным JSON
 */
export function isValidJson(str) {
    if (typeof str !== 'string') return false;
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Безопасный парсинг JSON
 */
export function safeJsonParse(str, fallback = null) {
    if (typeof str !== 'string') return fallback;
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
}

/**
 * Безопасная сериализация в JSON
 */
export function safeJsonStringify(obj, fallback = '{}') {
    try {
        return JSON.stringify(obj);
    } catch {
        return fallback;
    }
}

/**
 * Проверяет, является ли значение объектом (не массив, не null)
 */
export function isPlainObject(value) {
    return value !== null 
        && typeof value === 'object' 
        && !Array.isArray(value)
        && Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Проверяет структуру JSON по схеме (простая проверка полей)
 */
export function validateJsonStructure(obj, requiredFields) {
    if (!isPlainObject(obj)) return false;
    return requiredFields.every(field => obj.hasOwnProperty(field));
}

/**
 * Глубокое сравнение объектов
 */
export function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (isPlainObject(a) && isPlainObject(b)) {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every(key => deepEqual(a[key], b[key]));
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((item, i) => deepEqual(item, b[i]));
    }
    return false;
}
