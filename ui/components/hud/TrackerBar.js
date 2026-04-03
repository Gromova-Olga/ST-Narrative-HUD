// ui/components/hud/TrackerBar.js

/**
 * Компонент бара трекера
 */

import { trackerBarTemplate } from '../../rendering/TemplateEngine.js';
import { getDynamicBarColor } from '../../rendering/StyleApplier.js';

/**
 * Рендерит один трекер-бар
 * @param {Object} tracker - { id, label, value, max, percent, status, color }
 * @returns {string} HTML
 */
export function renderTrackerBar(tracker) {
    return trackerBarTemplate(tracker);
}

/**
 * Рендерит все трекер-бары
 * @param {Array} trackers - массив трекеров с метаданными
 * @returns {string} HTML
 */
export function renderAllTrackers(trackers) {
    return trackers.map(renderTrackerBar).join('');
}

/**
 * Обновляет значение трекера в DOM (без перерендера всего)
 * @param {string} trackerId
 * @param {number} value
 * @param {number} max
 */
export function updateTrackerInDOM(trackerId, value, max) {
    const row = document.querySelector(`.nhud-tracker-row[data-tracker="${trackerId}"]`);
    if (!row) return;

    const percent = max > 0 ? Math.round((value / max) * 100) : 0;
    const fill = row.querySelector('.nhud-tracker-bar-fill');
    const label = row.querySelector('.nhud-tracker-label span:last-child');

    if (fill) {
        fill.style.width = `${percent}%`;
        const color = getDynamicBarColor(percent);
        fill.style.background = `linear-gradient(90deg, ${color}, ${color}88)`;
    }
    if (label) label.textContent = `${value}/${max}`;
}
