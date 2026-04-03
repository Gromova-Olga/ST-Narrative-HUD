// systems/characters/CharacterMatcher.js

/**
 * Сопоставление и дедупликация имён персонажей
 * 
 * Решает проблему: "Серафина" vs "Seraphina" vs "серафина"
 */

import { transliterate } from '../../utils/string/Transliterator.js';

/**
 * Ищет существующий ключ персонажа по имени (с транслитерацией и fuzzy-поиском)
 * @param {Object} characters - объект live.characters
 * @param {string} targetName - имя для поиска
 * @returns {string|null} найденный ключ или null
 */
export function findCharacterKey(characters, targetName) {
    if (!characters || !targetName) return null;

    // Точное совпадение
    if (characters[targetName]) return targetName;

    const targetLower = targetName.toLowerCase().trim();
    const targetTranslit = transliterate(targetName);

    // Совпадение по lowercase или транслитерации
    for (const key of Object.keys(characters)) {
        if (key.toLowerCase().trim() === targetLower) return key;
        if (transliterate(key) === targetTranslit && targetTranslit.length > 3) return key;
        if (transliterate(key) === targetLower && targetLower.length > 3) return key;
        if (key.toLowerCase() === targetTranslit && targetTranslit.length > 3) return key;
    }

    // Совпадение по первому имени
    const targetFirst = targetLower.split(/\s+/)[0];
    const targetFirstTranslit = transliterate(targetFirst);

    for (const key of Object.keys(characters)) {
        const keyFirst = key.toLowerCase().split(/\s+/)[0];
        if (targetFirst === keyFirst && targetFirst.length > 3) return key;
        if (transliterate(keyFirst) === targetFirstTranslit && targetFirstTranslit.length > 3) return key;
        if (transliterate(keyFirst) === targetFirst && targetFirst.length > 3) return key;
        if (keyFirst === targetFirstTranslit && targetFirstTranslit.length > 3) return key;
    }

    return null;
}

/**
 * Дедупликация персонажей (слияние дубликатов)
 * @param {Object} characters - объект live.characters
 * @returns {Object} очищенные персонажи
 */
export function deduplicateCharacters(characters) {
    if (!characters || typeof characters !== 'object') return {};

    const normalized = {};

    Object.entries(characters).forEach(([key, value]) => {
        const normalizedKey = key.toLowerCase().trim();

        if (!normalized[normalizedKey]) {
            normalized[normalizedKey] = { ...value, _originalNames: [key] };
        } else {
            normalized[normalizedKey] = {
                ...normalized[normalizedKey],
                ...value,
                _originalNames: [...normalized[normalizedKey]._originalNames, key],
            };
        }
    });

    const result = {};
    Object.values(normalized).forEach(char => {
        // Берём самое короткое имя как каноническое
        const mainName = char._originalNames.reduce((a, b) => a.length <= b.length ? a : b);
        const { _originalNames, ...cleanChar } = char;
        result[mainName] = cleanChar;
    });

    return result;
}

/**
 * Нормализует имя персонажа для ключа
 */
export function normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim();
}
