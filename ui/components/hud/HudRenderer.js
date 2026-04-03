// ui/components/hud/HudRenderer.js

/**
 * Рендер главного HUD
 * 
 * Координирует рендеринг секций:
 * - Trackers (трекеры)
 * - Characters (персонажи)
 * - InfoBlocks (инфоблоки)
 * - DateTime (игровое время)
 */

import { eventBus } from '../../../core/EventBus.js';
import { renderAllTrackers } from './TrackerBar.js';
import { renderAllCharacters } from './CharacterCard.js';
import { infoBlockButtonTemplate } from '../../rendering/TemplateEngine.js';

/**
 * Рендерит трекеры в секцию #nhud-trackers-list
 * @param {Array} trackers - [{ id, label, value, max, percent, status, color }]
 */
export function renderTrackers(trackers) {
    const container = document.getElementById('nhud-trackers-list');
    if (!container) return;
    container.innerHTML = renderAllTrackers(trackers);
}

/**
 * Рендерит персонажей в секцию #nhud-characters-list
 * @param {Object} characters - { name: data }
 * @param {Array} ignored
 */
export function renderCharacters(characters, ignored = []) {
    const container = document.getElementById('nhud-characters-list');
    if (!container) return;
    container.innerHTML = renderAllCharacters(characters, ignored);
}

/**
 * Рендерит кнопки инфоблоков
 * @param {Array} blocks - [{ id, label, content }]
 */
export function renderInfoBlockButtons(blocks) {
    const container = document.getElementById('nhud-infoblock-buttons');
    if (!container) return;
    container.innerHTML = blocks.map(infoBlockButtonTemplate).join('');
}

/**
 * Обновляет datetime-бар
 * @param {string} datetimeText
 */
export function renderDateTime(datetimeText) {
    const bar = document.getElementById('nhud-datetime-bar');
    if (bar) bar.textContent = datetimeText || '';
}

/**
 * Обновляет статус API
 * @param {string} message
 * @param {string} type - 'info'|'success'|'error'|'loading'
 */
export function showStatus(message, type = 'info') {
    const el = document.getElementById('nhud-api-status');
    if (el) {
        el.textContent = message;
        el.setAttribute('data-type', type);
    }
}

/**
 * Полный ререндер HUD
 */
export function fullRender(data) {
    if (data.trackers) renderTrackers(data.trackers);
    if (data.characters) renderCharacters(data.characters, data.ignored);
    if (data.infoBlocks) renderInfoBlockButtons(data.infoBlocks);
    if (data.datetime) renderDateTime(data.datetime);
}
