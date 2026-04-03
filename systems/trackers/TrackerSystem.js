// systems/trackers/TrackerSystem.js

/**
 * Система трекеров — бизнес-логика обновления и расчётов
 * 
 * Принимает данные из JSON-ответа AI и применяет их к live-состоянию.
 * Публикует события в EventBus при изменениях.
 */

import { eventBus } from '../../core/EventBus.js';
import { sanitizeValue, getStatus, getPercent, validateTrackersArray } from './TrackerValidator.js';

/**
 * Применяет обновления трекеров из JSON-данных AI
 * @param {Object} trackersJson - поле trackers из JSON ответа { health: 80, energy: 50 }
 * @param {Array} trackerConfig - конфигурация трекеров [{ id, label, max, color }]
 * @param {Object} liveTrackerValues - текущие live-значения { health: 100, ... }
 * @returns {Object} обновлённые liveTrackerValues
 */
export function applyTrackersUpdate(trackersJson, trackerConfig, liveTrackerValues) {
    if (!trackersJson || typeof trackersJson !== 'object') return liveTrackerValues;
    if (!Array.isArray(trackerConfig)) return liveTrackerValues;

    const validConfig = validateTrackersArray(trackerConfig);
    const changes = [];

    validConfig.forEach(tracker => {
        if (trackersJson[tracker.id] !== undefined) {
            const oldValue = liveTrackerValues[tracker.id] ?? tracker.max;
            const newValue = sanitizeValue(trackersJson[tracker.id], tracker.max);

            if (oldValue !== newValue) {
                liveTrackerValues[tracker.id] = newValue;
                changes.push({
                    id: tracker.id,
                    label: tracker.label,
                    oldValue,
                    newValue,
                    delta: newValue - oldValue,
                    percent: getPercent(newValue, tracker.max),
                    status: getStatus(newValue, tracker.max),
                });
            }
        }
    });

    if (changes.length > 0) {
        eventBus.emit('trackers:updated', { changes, values: { ...liveTrackerValues } });
    }

    return liveTrackerValues;
}

/**
 * Сбрасывает трекер к максимальному значению
 */
export function resetTracker(trackerId, trackerConfig, liveTrackerValues) {
    const tracker = trackerConfig.find(t => t.id === trackerId);
    if (!tracker) return liveTrackerValues;

    liveTrackerValues[trackerId] = tracker.max;
    eventBus.emit('trackers:updated', {
        changes: [{
            id: trackerId,
            label: tracker.label,
            newValue: tracker.max,
            delta: 0,
            percent: 100,
            status: 'normal',
        }],
        values: { ...liveTrackerValues },
    });

    return liveTrackerValues;
}

/**
 * Сбрасывает все трекеры к максимуму
 */
export function resetAllTrackers(trackerConfig, liveTrackerValues) {
    trackerConfig.forEach(t => {
        liveTrackerValues[t.id] = t.max;
    });
    eventBus.emit('trackers:reset', { values: { ...liveTrackerValues } });
    return liveTrackerValues;
}

/**
 * Получает текущие значения трекеров с метаданными
 */
export function getTrackersWithMeta(trackerConfig, liveTrackerValues) {
    return trackerConfig.map(t => {
        const value = liveTrackerValues[t.id] ?? t.max;
        return {
            ...t,
            value,
            percent: getPercent(value, t.max),
            status: getStatus(value, t.max),
        };
    });
}
