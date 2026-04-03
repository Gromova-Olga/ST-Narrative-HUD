// systems/datetime/DateTimeSystem.js

/**
 * Система игрового времени, локации и погоды
 */

import { eventBus } from '../../core/EventBus.js';
import { stripHtml } from '../../utils/string/StringCleaner.js';

/**
 * Применяет обновления datetime/location/weather из JSON
 * @param {Object} jsonData - JSON ответ AI
 * @param {Object} infoBlocks - объект live.infoBlocks
 * @returns {{ infoBlocks: Object, changed: boolean }}
 */
export function applyDateTimeUpdate(jsonData, infoBlocks) {
    let changed = false;

    if (jsonData.datetime) {
        const val = stripHtml(jsonData.datetime);
        if (infoBlocks.datetime !== val) {
            infoBlocks.datetime = val;
            changed = true;
        }
    }

    if (jsonData.location) {
        const val = stripHtml(jsonData.location);
        if (infoBlocks.location !== val) {
            infoBlocks.location = val;
            changed = true;
        }
    }

    if (jsonData.weather) {
        const val = stripHtml(jsonData.weather);
        if (infoBlocks.weather !== val) {
            infoBlocks.weather = val;
            changed = true;
        }
    }

    if (changed) {
        eventBus.emit('datetime:updated', {
            datetime: infoBlocks.datetime,
            location: infoBlocks.location,
            weather: infoBlocks.weather,
        });
    }

    return { infoBlocks, changed };
}

/**
 * Добавляет событие в календарь
 * @param {Object} eventData - { date, desc }
 * @param {Array} calendar - массив календарных событий
 * @returns {{ added: boolean, event: Object|null }}
 */
export function addCalendarEvent(eventData, calendar) {
    if (!eventData?.desc) return { added: false, event: null };

    const date = eventData.date || new Date().toLocaleDateString('ru-RU');

    // Проверка дубликатов
    const exists = calendar.find(e => e.date === date && e.desc.toLowerCase() === eventData.desc.toLowerCase());
    if (exists) return { added: false, event: exists };

    const entry = {
        date,
        desc: eventData.desc,
        active: true,
        realDate: Date.now(),
    };

    calendar.unshift(entry);
    eventBus.emit('calendar:event-added', { event: entry });

    return { added: true, event: entry };
}

/**
 * Обрабатывает calendar_event из JSON
 */
export function processCalendarEvent(jsonData, calendar) {
    if (!jsonData?.calendar_event?.desc) return { added: false, event: null };
    return addCalendarEvent(jsonData.calendar_event, calendar);
}

/**
 * Получает текст для промпта (datetime + location + weather)
 */
export function getDateTimePromptText(infoBlocks) {
    let text = '';
    if (infoBlocks.datetime) text += `Current In-Game Date & Time: ${infoBlocks.datetime}\n`;
    if (infoBlocks.location) text += `Current Location: ${infoBlocks.location}\n`;
    if (infoBlocks.weather) text += `Current Weather: ${infoBlocks.weather}\n`;
    return text;
}

/**
 * Получает текст календаря для промпта
 */
export function getCalendarPromptText(calendar) {
    const active = calendar.filter(e => e.active);
    if (active.length === 0) return '';
    return active.map(e => `- [${e.date}]: ${e.desc}`).join('\n');
}
