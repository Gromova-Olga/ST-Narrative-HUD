// messages/DataExtractor.js

/**
 * Извлечение структурированных данных из текста сообщений (regex)
 * 
 * Парсит паттерны вида "ключ: Имя = значение" из текста AI-ответов.
 * Используется как fallback, когда JSON не найден.
 */

import { eventBus } from '../core/EventBus.js';

/**
 * Паттерны для извлечения
 */
const EXTRACTION_PATTERNS = [
    { key: 'outfit',               regex: /costume:\s*([^=]+?)\s*=\s*(.+?)(?=\n|$)/gi },
    { key: 'state',                regex: /mood:\s*([^=]+?)\s*=\s*(.+?)(?=\n|$)/gi },
    { key: 'thoughts',             regex: /thoughts?:\s*([^=]+?)\s*=\s*(.+?)(?=\n|$)/gi },
    { key: 'relationship',         regex: /relationship:\s*([^=]+?)\s*=\s*(\d+)/gi },
    { key: 'relationship_status',  regex: /relationship_status:\s*([^=]+?)\s*=\s*(.+?)(?=\n|$)/gi },
    { key: 'relationship_thoughts', regex: /relationship_thoughts?:\s*([^=]+?)\s*=\s*(.+?)(?=\n|$)/gi },
];

/**
 * Извлекает данные персонажей из текста
 * @param {string} text - текст сообщения
 * @returns {{ characters: Array, extracted: boolean }}
 */
export function extractCharactersFromText(text) {
    if (!text) return { characters: [], extracted: false };

    const charMap = {};

    const addCharData = (name, key, value) => {
        const cleanName = name.trim();
        if (!cleanName) return;
        if (!charMap[cleanName]) charMap[cleanName] = { name: cleanName };
        charMap[cleanName][key] = typeof value === 'string' ? value.trim() : value;
    };

    EXTRACTION_PATTERNS.forEach(({ key, regex }) => {
        let match;
        // Сбрасываем lastIndex для глобального regex
        regex.lastIndex = 0;
        while ((match = regex.exec(text)) !== null) {
            addCharData(match[1], key, match[2]);
        }
    });

    const characters = Object.values(charMap);
    const extracted = characters.length > 0;

    if (extracted) {
        eventBus.emit('data:extracted-from-text', { characters });
    }

    return { characters, extracted };
}

/**
 * Извлекает трекеры из текста (паттерн "Tracker: value/max")
 * @param {string} text
 * @param {Array} trackerConfig - [{ id, label, max }]
 * @returns {Object} { trackerId: value }
 */
export function extractTrackersFromText(text, trackerConfig) {
    if (!text || !Array.isArray(trackerConfig)) return {};

    const result = {};

    trackerConfig.forEach(tracker => {
        // Паттерн: "Здоровье: 80" или "health: 80/100"
        const pattern = new RegExp(
            `${escapeRegex(tracker.label)}:\\s*(\\d+)(?:\\s*\\/\\s*\\d+)?`,
            'i'
        );
        const match = text.match(pattern);
        if (match) {
            result[tracker.id] = Math.min(Math.max(0, parseInt(match[1])), tracker.max);
        }
    });

    return result;
}

/**
 * Извлекает datetime из текста
 * @param {string} text
 * @returns {string}
 */
export function extractDateTimeFromText(text) {
    if (!text) return '';

    // Паттерн: "Date: ..." / "Time: ..." / "Дата: ..."
    const patterns = [
        /(?:date|дата|время|time|datetime):\s*(.+?)(?=\n|$)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1].trim();
    }

    return '';
}

/**
 * Извлекает локацию из текста
 * @param {string} text
 * @returns {string}
 */
export function extractLocationFromText(text) {
    if (!text) return '';

    const match = text.match(/(?:location|локация|место|местоположение):\s*(.+?)(?=\n|$)/i);
    return match ? match[1].trim() : '';
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
