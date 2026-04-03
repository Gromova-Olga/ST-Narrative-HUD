// parsers/TrackerExtractor.js
import { clamp, isValidTrackerValue } from "../utils/validation/DataValidator.js";

export class TrackerExtractor {
    /**
     * Извлечь значения трекеров
     */
    extract(trackersData, trackerConfig) {
        const result = {};

        if (!trackersData || typeof trackersData !== 'object') return result;

        for (const tracker of trackerConfig) {
            if (trackersData[tracker.id] !== undefined) {
                const value = parseInt(trackersData[tracker.id]);
                if (isValidTrackerValue(value, tracker.max)) {
                    result[tracker.id] = clamp(value, 0, tracker.max);
                }
            }
        }

        return result;
    }

    /**
     * Извлечь все значения трекеров с валидацией
     */
    extractAll(trackersData, trackerConfig) {
        const result = {};

        for (const tracker of trackerConfig) {
            const defaultValue = tracker.max;
            const rawValue = trackersData?.[tracker.id];

            if (rawValue !== undefined) {
                const parsed = parseInt(rawValue);
                result[tracker.id] = isValidTrackerValue(parsed, tracker.max)
                    ? clamp(parsed, 0, tracker.max)
                    : defaultValue;
            } else {
                result[tracker.id] = defaultValue;
            }
        }

        return result;
    }

    /**
     * Обновить значения трекеров с дельтой
     */
    updateWithDelta(currentValues, deltas, trackerConfig) {
        const result = { ...currentValues };

        for (const tracker of trackerConfig) {
            if (deltas[tracker.id] !== undefined) {
                const delta = parseInt(deltas[tracker.id]);
                const current = result[tracker.id] ?? tracker.max;
                result[tracker.id] = clamp(current + delta, 0, tracker.max);
            }
        }

        return result;
    }
}