// map/MapIntegration.js
// Интеграция карты с контекстом SillyTavern
// v2: расстояния в метрах через pixelsPerMeter (px / pixelsPerMeter)

import { extensionName } from "../core/constants.js";
import { eventBus } from "../core/EventBus.js";
import { generateSpatialContext, applyMapActions, getMapData, getDistance, getPixelsPerMeter, distancePx, distanceMeters } from "./MapStateManager.js";
import { getSettings } from "../core/StateManager.js";

/**
 * Умный трекинг: инжектить контекст ТОЛЬКО если карта загружена и игрок на ней.
 */
export function injectMapContext(setExtensionPrompt, IN_CHAT, SYSTEM_ROLE) {
    const settings = getSettings();
    if (!settings.modules?.map) {
        setExtensionPrompt('narrative-hud-map', '', IN_CHAT, 1, false, SYSTEM_ROLE);
        return;
    }

    const map = getMapData();
    // Умный трекинг: нет карты или игрок не на ней — не инжектим
    if (!map || !map.zones || map.zones.length === 0 || !map.entities?.player?.zoneId) {
        setExtensionPrompt('narrative-hud-map', '', IN_CHAT, 1, false, SYSTEM_ROLE);
        return;
    }

    const mapContext = generateSpatialContext();
    if (mapContext) {
        setExtensionPrompt('narrative-hud-map', mapContext, IN_CHAT, 1, false, SYSTEM_ROLE);
    } else {
        setExtensionPrompt('narrative-hud-map', '', IN_CHAT, 1, false, SYSTEM_ROLE);
    }
}

export function initMapIntegration(setExtensionPrompt, IN_CHAT, SYSTEM_ROLE) {
    const refresh = () => injectMapContext(setExtensionPrompt, IN_CHAT, SYSTEM_ROLE);
    eventBus.on('map:entity-moved', refresh);
    eventBus.on('map:zones-changed', refresh);
    eventBus.on('map:anchors-changed', refresh);
    eventBus.on('map:npcs-changed', refresh);
    eventBus.on('map:reset', refresh);
    eventBus.on('map:scale-changed', refresh);
}

export function handleMapActions(mapActions) {
    if (!mapActions || !Array.isArray(mapActions)) return;
    applyMapActions(mapActions);
}

/**
 * Расстояние между двумя точками в метрах.
 * @param {{ x: number, y: number }} a — координаты в px
 * @param {{ x: number, y: number }} b — координаты в px
 * @returns {number} — расстояние в метрах
 */
export function distanceInMeters(a, b) {
    return distanceMeters(a.x, a.y, b.x, b.y);
}

/**
 * Форматированное расстояние для ИИ: "4.2м".
 */
export function formatDistanceMeters(x1, y1, x2, y2) {
    const m = distanceMeters(x1, y1, x2, y2);
    return `${m.toFixed(1)}м`;
}

export function getMapHudText() {
    const map = getMapData();
    if (!map) return '';
    const player = map.entities.player;
    if (!player.zoneId) return '';
    const zone = map.zones.find(z => z.id === player.zoneId);
    if (!zone) return '';
    let text = `📍 ${zone.name}`;
    if (player.anchorId) {
        const anchor = map.anchors.find(a => a.id === player.anchorId);
        if (anchor) text += ` (${anchor.name})`;
    }
    return text;
}
