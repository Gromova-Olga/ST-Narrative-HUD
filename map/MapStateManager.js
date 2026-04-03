// map/MapStateManager.js
// Управление состоянием карты: зоны, якоря, NPC, привязка к чату, архив
// v2: все координаты в АБСОЛЮТНЫХ ПИКСЕЛЯХ (px). Масштаб через pixelsPerMeter.

import { extensionName } from "../core/constants.js";
import { getSettings } from "../core/StateManager.js";
import { saveSettingsDebounced } from "../../../../../script.js";
import { eventBus } from "../core/EventBus.js";

const DEFAULT_PIXELS_PER_METER = 50;

/**
 * Структура данных карты (хранится в settings.chatData[chatId].map):
 * {
 *   backgroundImage: "data:image/png;base64,..." | null,
 *   pixelsPerMeter: 50, // масштаб: сколько пикселей = 1 метр
 *   zones: [
 *     { id, name, description, points: [[x,y],[x,y],...], color } // x,y в px
 *   ],
 *   anchors: [
 *     { id, name, x, y, w?, h?, zoneId } // x,y,w,h в px
 *   ],
 *   npcs: [
 *     { id, name, x, y, zoneId, anchorId, color } // x,y в px
 *   ],
 *   entities: {
 *     player: { x, y, zoneId, anchorId, color, displayName?, hiddenLabel? }, // x,y в px
 *     bot: { x, y, zoneId, anchorId, color, displayName?, hiddenLabel? }
 *   }
 * }
 */

function getCurrentChatId() {
    try {
        const ctx = SillyTavern.getContext();
        return ctx.chatId || ctx.characterId;
    } catch (e) {
        return null;
    }
}

export function getMapData() {
    const settings = getSettings();
    const chatId = getCurrentChatId();
    if (!chatId) return null;
    if (!settings.chatData) settings.chatData = {};
    if (!settings.chatData[chatId]) settings.chatData[chatId] = {};
    if (!settings.chatData[chatId].map) {
        settings.chatData[chatId].map = {
            backgroundImage: null,
            pixelsPerMeter: DEFAULT_PIXELS_PER_METER,
            zones: [],
            anchors: [],
            npcs: [],
            entities: {
                player: { x: 400, y: 300, zoneId: null, anchorId: null, color: "#ff4444" },
                bot:    { x: 400, y: 300, zoneId: null, anchorId: null, color: "#44aaff" }
            }
        };
    }

    const map = settings.chatData[chatId].map;

    // Миграция: если pixelsPerMeter нет — добавляем
    if (typeof map.pixelsPerMeter !== 'number' || map.pixelsPerMeter < 1) {
        map.pixelsPerMeter = DEFAULT_PIXELS_PER_METER;
    }

    if (!Array.isArray(map.zones)) map.zones = [];
    if (!Array.isArray(map.anchors)) map.anchors = [];
    if (!Array.isArray(map.npcs)) map.npcs = [];
    if (!map.entities || typeof map.entities !== 'object') {
        map.entities = {
            player: { x: 400, y: 300, zoneId: null, anchorId: null, color: "#ff4444" },
            bot:    { x: 400, y: 300, zoneId: null, anchorId: null, color: "#44aaff" }
        };
    }
    if (!map.entities.player) map.entities.player = { x: 400, y: 300, zoneId: null, anchorId: null };
    if (!map.entities.bot)    map.entities.bot    = { x: 400, y: 300, zoneId: null, anchorId: null };

    return map;
}

// ========================================================================
// pixelsPerMeter
// ========================================================================

export function getPixelsPerMeter() {
    const map = getMapData();
    return map ? map.pixelsPerMeter : DEFAULT_PIXELS_PER_METER;
}

export function setPixelsPerMeter(value) {
    const map = getMapData();
    if (!map) return;
    map.pixelsPerMeter = Math.max(1, Math.round(value));
    saveSettingsDebounced();
    eventBus.emit('map:scale-changed');
    return map.pixelsPerMeter;
}

// ========================================================================
// Утилиты: расстояния
// ========================================================================

export function distancePx(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function distanceMeters(x1, y1, x2, y2) {
    const ppm = getPixelsPerMeter();
    return distancePx(x1, y1, x2, y2) / ppm;
}

// ========================================================================
// Архив карт
// ========================================================================

export function getMapArchive() {
    const settings = getSettings();
    const chatId = getCurrentChatId();
    if (!chatId) return [];
    if (!settings.chatData) settings.chatData = {};
    if (!settings.chatData[chatId]) settings.chatData[chatId] = {};
    if (!Array.isArray(settings.chatData[chatId].mapArchive)) {
        settings.chatData[chatId].mapArchive = [];
    }
    return settings.chatData[chatId].mapArchive;
}

export function saveMapToArchive(name) {
    const map = getMapData();
    if (!map) return;
    const archive = getMapArchive();
    const snapshot = JSON.parse(JSON.stringify(map));
    snapshot.archiveName = name || ('Карта ' + new Date().toLocaleString('ru-RU'));
    snapshot.savedAt = Date.now();
    archive.unshift(snapshot);
    saveSettingsDebounced();
    eventBus.emit('map:archive-changed');
}

export function loadMapFromArchive(index) {
    const settings = getSettings();
    const chatId = getCurrentChatId();
    if (!chatId) return;
    const archive = getMapArchive();
    if (index < 0 || index >= archive.length) return;
    const snapshot = JSON.parse(JSON.stringify(archive[index]));
    delete snapshot.archiveName;
    delete snapshot.savedAt;
    settings.chatData[chatId].map = snapshot;
    saveSettingsDebounced();
    eventBus.emit('map:reset');
}

export function deleteMapFromArchive(index) {
    const archive = getMapArchive();
    if (index < 0 || index >= archive.length) return;
    archive.splice(index, 1);
    saveSettingsDebounced();
    eventBus.emit('map:archive-changed');
}

// ========================================================================
// Зоны (полигоны) — координаты в px
// ========================================================================

export function addZone(zone) {
    const map = getMapData();
    if (!map) return;
    if (!zone.id) zone.id = 'zone_' + Date.now();
    if (!zone.points) zone.points = [];
    map.zones.push(zone);
    saveSettingsDebounced();
    eventBus.emit('map:zones-changed');
}

export function updateZone(zoneId, updates) {
    const map = getMapData();
    if (!map) return;
    const idx = map.zones.findIndex(z => z.id === zoneId);
    if (idx === -1) return;
    Object.assign(map.zones[idx], updates);
    saveSettingsDebounced();
    eventBus.emit('map:zones-changed');
}

export function removeZone(zoneId) {
    const map = getMapData();
    if (!map) return;
    map.zones = map.zones.filter(z => z.id !== zoneId);
    map.anchors = map.anchors.filter(a => a.zoneId !== zoneId);
    for (const ent of Object.values(map.entities)) {
        if (ent.zoneId === zoneId) { ent.zoneId = null; ent.anchorId = null; }
    }
    for (const npc of map.npcs) {
        if (npc.zoneId === zoneId) { npc.zoneId = null; npc.anchorId = null; }
    }
    saveSettingsDebounced();
    eventBus.emit('map:zones-changed');
}

// ========================================================================
// Якоря — координаты в px
// ========================================================================

export function addAnchor(anchor) {
    const map = getMapData();
    if (!map) return;
    if (!anchor.id) anchor.id = 'anchor_' + Date.now();
    map.anchors.push(anchor);
    saveSettingsDebounced();
    eventBus.emit('map:anchors-changed');
}

export function removeAnchor(anchorId) {
    const map = getMapData();
    if (!map) return;
    map.anchors = map.anchors.filter(a => a.id !== anchorId);
    for (const ent of Object.values(map.entities)) {
        if (ent.anchorId === anchorId) ent.anchorId = null;
    }
    for (const npc of map.npcs) {
        if (npc.anchorId === anchorId) npc.anchorId = null;
    }
    saveSettingsDebounced();
    eventBus.emit('map:anchors-changed');
}

// ========================================================================
// NPC — координаты в px
// ========================================================================

export function addNpc(npc) {
    const map = getMapData();
    if (!map) return;
    if (!npc.id) npc.id = 'npc_' + Date.now();
    if (!npc.color) npc.color = getRandomColor();
    map.npcs.push(npc);
    saveSettingsDebounced();
    eventBus.emit('map:npcs-changed');
}

export function removeNpc(npcId) {
    const map = getMapData();
    if (!map) return;
    map.npcs = map.npcs.filter(n => n.id !== npcId);
    saveSettingsDebounced();
    eventBus.emit('map:npcs-changed');
}

export function moveNpc(npcId, x, y) {
    const map = getMapData();
    if (!map) return;
    const npc = map.npcs.find(n => n.id === npcId);
    if (!npc) return;
    npc.x = Math.max(0, x);
    npc.y = Math.max(0, y);
    const zone = findZoneAt(npc.x, npc.y);
    npc.zoneId = zone ? zone.id : null;
    const anchor = zone ? findNearestAnchor(npc.x, npc.y, zone.id) : null;
    npc.anchorId = anchor ? anchor.id : null;
    saveSettingsDebounced();
    eventBus.emit('map:npcs-changed');
}

function getRandomColor() {
    const colors = ['#e05252', '#52a8e0', '#52e0a3', '#e0a352', '#a052e0', '#e052a8', '#52e0e0', '#e0e052'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ========================================================================
// Сущности (Player / Bot) — координаты в px
// ========================================================================

export function getEntityPosition(entityName) {
    const map = getMapData();
    if (!map) return null;
    return map.entities[entityName] || null;
}

export function setEntityPosition(entityName, x, y) {
    const map = getMapData();
    if (!map || !map.entities[entityName]) return;
    map.entities[entityName].x = Math.max(0, x);
    map.entities[entityName].y = Math.max(0, y);
    const zone = findZoneAt(x, y);
    map.entities[entityName].zoneId = zone ? zone.id : null;
    const anchor = zone ? findNearestAnchor(x, y, zone.id) : null;
    map.entities[entityName].anchorId = anchor ? anchor.id : null;
    saveSettingsDebounced();
    eventBus.emit('map:entity-moved', { entity: entityName, x, y, zoneId: zone?.id, anchorId: anchor?.id });
}

// ========================================================================
// Fuzzy search
// ========================================================================

export function findZoneByName(searchName) {
    const map = getMapData();
    if (!map || !searchName) return null;
    const search = searchName.toLowerCase().trim();
    let found = map.zones.find(z => z.name.toLowerCase() === search);
    if (found) return found;
    found = map.zones.find(z => search.includes(z.name.toLowerCase()) || z.name.toLowerCase().includes(search));
    if (found) return found;
    found = map.zones.find(z => z.id.toLowerCase() === search);
    return found || null;
}

export function findAnchorByName(searchName, zoneId) {
    const map = getMapData();
    if (!map || !searchName) return null;
    const search = searchName.toLowerCase().trim();
    let candidates = zoneId ? map.anchors.filter(a => a.zoneId === zoneId) : map.anchors;
    let found = candidates.find(a => a.name.toLowerCase() === search);
    if (found) return found;
    found = candidates.find(a => search.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(search));
    if (found) return found;
    found = candidates.find(a => a.id.toLowerCase() === search);
    return found || null;
}

export function findNpcByName(searchName) {
    const map = getMapData();
    if (!map || !searchName) return null;
    const search = searchName.toLowerCase().trim();
    let found = map.npcs.find(n => n.name.toLowerCase() === search);
    if (found) return found;
    found = map.npcs.find(n => search.includes(n.name.toLowerCase()) || n.name.toLowerCase().includes(search));
    return found || null;
}

// ========================================================================
// Move entity (fuzzy) — координаты в px
// ========================================================================

function mapEntityName(name) {
    if (!name) return 'bot';
    const lower = name.toLowerCase();
    if (lower === 'player' || lower === 'игрок') return 'player';
    if (lower === 'bot' || lower === 'бот') return 'bot';
    return 'bot';
}

export function moveEntity(entityName, targetZone, targetAnchor = null) {
    const map = getMapData();
    if (!map) return;
    const zone = findZoneByName(targetZone);
    if (!zone) { console.warn(`[NHUD Map] Zone "${targetZone}" not found`); return; }
    let x, y;
    if (targetAnchor) {
        const anchor = findAnchorByName(targetAnchor, zone.id);
        if (anchor) {
            x = anchor.w ? anchor.x + anchor.w / 2 : anchor.x;
            y = anchor.h ? anchor.y + anchor.h / 2 : anchor.y;
        } else {
            x = zone.points.length > 0 ? getPolygonCenter(zone.points).x : 400;
            y = zone.points.length > 0 ? getPolygonCenter(zone.points).y : 300;
        }
    } else {
        if (zone.points && zone.points.length > 0) {
            const center = getPolygonCenter(zone.points);
            x = center.x; y = center.y;
        } else {
            x = 400; y = 300;
        }
    }
    const mapped = mapEntityName(entityName);
    setEntityPosition(mapped, x, y);
}

// ========================================================================
// Polygon math — координаты в px
// ========================================================================

export function getPolygonCenter(points) {
    if (!points || points.length === 0) return { x: 400, y: 300 };
    let sx = 0, sy = 0;
    for (const [px, py] of points) { sx += px; sy += py; }
    return { x: sx / points.length, y: sy / points.length };
}

export function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

export function findZoneAt(x, y) {
    const map = getMapData();
    if (!map) return null;
    for (const zone of map.zones) {
        if (zone.points && zone.points.length >= 3) {
            if (pointInPolygon(x, y, zone.points)) return zone;
        }
    }
    return null;
}

export function findNearestAnchor(x, y, zoneId) {
    const map = getMapData();
    if (!map) return null;
    const candidates = zoneId ? map.anchors.filter(a => a.zoneId === zoneId) : map.anchors;
    if (candidates.length === 0) return null;
    let nearest = null, minDist = Infinity;
    for (const a of candidates) {
        const ax = a.w ? a.x + a.w / 2 : a.x;
        const ay = a.h ? a.y + a.h / 2 : a.y;
        const dist = Math.sqrt((ax - x) ** 2 + (ay - y) ** 2);
        if (dist < minDist) { minDist = dist; nearest = a; }
    }
    return nearest;
}

export function getDistance(entityA, entityB) {
    const map = getMapData();
    if (!map) return -1;
    let posA, posB;
    if (entityA === 'player' || entityA === 'bot') {
        posA = map.entities[entityA];
    } else {
        posA = map.npcs.find(n => n.id === entityA || n.name === entityA);
    }
    if (entityB === 'player' || entityB === 'bot') {
        posB = map.entities[entityB];
    } else {
        posB = map.npcs.find(n => n.id === entityB || n.name === entityB);
    }
    if (!posA || !posB) return -1;
    return distancePx(posA.x, posA.y, posB.x, posB.y);
}

// ========================================================================
// Spatial context — расстояния в метрах через pixelsPerMeter
// ========================================================================

function describeDistance(meters) {
    if (meters < 0) return { text: "неизвестно", meters: 0 };
    if (meters <= 1)  return { text: "вплотную (можно дотронуться)", meters };
    if (meters <= 3)  return { text: "в нескольких шагах (близко)", meters };
    if (meters <= 7)  return { text: "на расстоянии разговора", meters };
    if (meters <= 12) return { text: "через комнату", meters };
    return { text: "далеко (нужно двигаться)", meters };
}

export function generateSpatialContext() {
    const map = getMapData();
    if (!map) return '';
    const player = map.entities.player;
    const bot = map.entities.bot;
    if (!player || !bot) return '';

    const playerZone = player.zoneId ? map.zones.find(z => z.id === player.zoneId) : null;
    const botZone = bot.zoneId ? map.zones.find(z => z.id === bot.zoneId) : null;
    const playerAnchor = player.anchorId ? map.anchors.find(a => a.id === player.anchorId) : null;
    const botAnchor = bot.anchorId ? map.anchors.find(a => a.id === bot.anchorId) : null;

    // Расстояние в МЕТРАХ (px / pixelsPerMeter)
    const distPx = getDistance('player', 'bot');
    const distMeters = distPx >= 0 ? Math.round(distanceMeters(player.x, player.y, bot.x, bot.y) * 10) / 10 : -1;
    const distInfo = describeDistance(distMeters);

    let playerStr = 'Игрок';
    if (playerZone) {
        playerStr += ` в локации "${playerZone.name}"`;
        if (playerAnchor) playerStr += ` (Рядом с: "${playerAnchor.name}")`;
    } else {
        playerStr += ' вне известных локаций';
    }

    let botStr = 'Бот';
    if (botZone) {
        botStr += ` в локации "${botZone.name}"`;
        if (botAnchor) botStr += ` (Рядом с: "${botAnchor.name}")`;
    } else {
        botStr += ' вне известных локаций';
    }

    let relationStr = '';
    if (playerZone && botZone) {
        if (playerZone.id === botZone.id) {
            relationStr = distMeters <= 5 ? 'Персонажи в одной комнате, близко друг к другу.' : 'Персонажи в одной комнате, на расстоянии.';
        } else {
            relationStr = 'Персонажи в разных помещениях.';
        }
    }

    // NPC рядом (в пикселях, переводим в метры)
    const ppm = getPixelsPerMeter();
    const nearbyNpcs = (map.npcs || []).filter(npc => {
        const d = distancePx(npc.x, npc.y, player.x, player.y) / ppm;
        return d < 15; // 15 метров
    });
    let npcStr = '';
    if (nearbyNpcs.length > 0) {
        npcStr = ' Рядом: ' + nearbyNpcs.map(n => n.name).join(', ') + '.';
    }

    return `[ПРОСТРАНСТВЕННЫЙ КОНТЕКСТ: ${playerStr}. ${botStr}. Дистанция: ${distInfo.text} (${distInfo.meters}м). ${relationStr}${npcStr}${getZoneSizesContext(map)}]`;
}

// Размеры зон с учётом customWidthMeters/customHeightMeters
function getZoneSizesContext(map) {
    if (!map.zones || map.zones.length === 0) return '';
    const ppm = getPixelsPerMeter();
    const sizes = [];
    for (const z of map.zones) {
        if (z.customWidthMeters || z.customHeightMeters) {
            const w = z.customWidthMeters || '?';
            const h = z.customHeightMeters || '?';
            sizes.push(`${z.name}: ${w}м×${h}м`);
        } else if (z.points && z.points.length >= 3) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const [px, py] of z.points) {
                if (px < minX) minX = px; if (px > maxX) maxX = px;
                if (py < minY) minY = py; if (py > maxY) maxY = py;
            }
            const wM = ((maxX - minX) / ppm).toFixed(1);
            const hM = ((maxY - minY) / ppm).toFixed(1);
            sizes.push(`${z.name}: ~${wM}м×${hM}м`);
        }
    }
    return sizes.length > 0 ? ' Размеры: ' + sizes.join(', ') + '.' : '';
}

// ========================================================================
// Обработка map_actions от ИИ
// ========================================================================

export function applyMapActions(actions) {
    if (!Array.isArray(actions)) return;
    for (const action of actions) {
        if (action.action === 'move' || !action.action) {
            if (!action.entity || !action.zone) continue;
            moveEntity(action.entity, action.zone, action.anchor || null);
        }
        if (action.action === 'spawn') {
            if (!action.entity || !action.zone) continue;
            const zone = findZoneByName(action.zone);
            if (!zone) continue;
            const center = zone.points?.length > 0 ? getPolygonCenter(zone.points) : { x: 400, y: 300 };
            const anchor = action.anchor ? findAnchorByName(action.anchor, zone.id) : null;
            const x = anchor ? (anchor.w ? anchor.x + anchor.w / 2 : anchor.x) : center.x;
            const y = anchor ? (anchor.h ? anchor.y + anchor.h / 2 : anchor.y) : center.y;
            addNpc({ name: action.entity, x, y, zoneId: zone.id, anchorId: anchor?.id });
        }
        if (action.action === 'remove') {
            if (!action.entity) continue;
            const npc = findNpcByName(action.entity);
            if (npc) removeNpc(npc.id);
            const mapped = mapEntityName(action.entity);
            if (mapped === 'player' || mapped === 'bot') {
                const map = getMapData();
                if (map) {
                    map.entities[mapped] = { x: 400, y: 300, zoneId: null, anchorId: null };
                    saveSettingsDebounced();
                    eventBus.emit('map:entity-moved', { entity: mapped });
                }
            }
        }
    }
}

export function resetPositions() {
    const map = getMapData();
    if (!map) return;
    map.entities.player = { x: 400, y: 300, zoneId: null, anchorId: null };
    map.entities.bot = { x: 400, y: 300, zoneId: null, anchorId: null };
    saveSettingsDebounced();
    eventBus.emit('map:entity-moved', { entity: 'player' });
    eventBus.emit('map:entity-moved', { entity: 'bot' });
}

export function resetMapData() {
    const settings = getSettings();
    const chatId = getCurrentChatId();
    if (!chatId || !settings.chatData?.[chatId]) return;
    settings.chatData[chatId].map = {
        backgroundImage: null,
        pixelsPerMeter: DEFAULT_PIXELS_PER_METER,
        zones: [], anchors: [], npcs: [],
        entities: {
            player: { x: 400, y: 300, zoneId: null, anchorId: null, color: "#ff4444" },
            bot:    { x: 400, y: 300, zoneId: null, anchorId: null, color: "#44aaff" }
        }
    };
    saveSettingsDebounced();
    eventBus.emit('map:reset');
}
