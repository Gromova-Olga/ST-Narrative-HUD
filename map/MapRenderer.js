// map/MapRenderer.js
// Рендеринг карты: пиксельная архитектура, viewport + canvas (абсолютные px)
// v2: все координаты в px, линейка калибровки, сетка по pixelsPerMeter

import { eventBus } from "../core/EventBus.js";
import {
    getMapData, addZone, updateZone, removeZone,
    addAnchor, removeAnchor, addNpc, removeNpc, moveNpc,
    getEntityPosition, setEntityPosition, findZoneAt,
    getPolygonCenter, generateSpatialContext, resetMapData,
    getMapArchive, saveMapToArchive, loadMapFromArchive, deleteMapFromArchive,
    getPixelsPerMeter, setPixelsPerMeter, distancePx
} from "./MapStateManager.js";

const MAP_CSS = `
    #nhud-map-container {
        display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%);
        width:600px; height:500px; min-width:300px; min-height:250px;
        z-index:9995; background:var(--nhud-prompt-bg, #151220);
        border:1px solid var(--nhud-border, #4a1525); border-radius:8px;
        box-shadow:0 10px 30px rgba(0,0,0,0.9); overflow:hidden; flex-direction:column;
        touch-action:none; resize:both; display:flex;
    }
    /* Viewport — только скролл, ничего больше */
    #nhud-map-canvas-wrapper {
        flex:1; overflow:auto; position:relative; background:#1a1a2e;
        touch-action:none;
    }
    /* Canvas — абсолютный мир, натуральный размер картинки */
    #nhud-map-canvas {
        position:absolute; left:0; top:0;
        touch-action:none; user-select:none;
    }
    #nhud-map-canvas img {
        display:block; pointer-events:none; user-select:none;
    }
    /* Сетка — отдельный div-слой внутри canvas, поверх картинки */
    .nhud-map-grid-overlay {
        position:absolute; top:0; left:0; width:100%; height:100%;
        pointer-events:none; z-index:2;
        display:none;
    }
    .nhud-map-grid-overlay.grid-white {
        background-image:
            linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px);
    }
    .nhud-map-grid-overlay.grid-black {
        background-image:
            linear-gradient(to right, rgba(0,0,0,0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.25) 1px, transparent 1px);
    }
    /* SVG слой зон */
    #nhud-map-svg-layer {
        position:absolute; top:0; left:0; width:100%; height:100%;
        pointer-events:none; z-index:3;
    }
    #nhud-map-svg-layer polygon { pointer-events:visibleFill; cursor:pointer; }
    .nhud-map-zone-label-svg {
        pointer-events:none; font-size:10px; fill:#c0e0f0;
        font-family:sans-serif; font-weight:bold;
    }
    /* Якоря — px */
    .nhud-map-anchor {
        position:absolute; border:2px solid #e0a352; background:rgba(224,163,82,0.2);
        cursor:pointer; z-index:10; touch-action:none; border-radius:2px;
    }
    .nhud-map-anchor::before {
        content:''; position:absolute; top:-14px; left:-14px;
        width:calc(100% + 28px); height:calc(100% + 28px); background:transparent;
    }
    .nhud-map-anchor-label {
        position:absolute; bottom:-14px; left:50%; transform:translateX(-50%);
        font-size:8px; color:#e0a352; white-space:nowrap; pointer-events:none;
        background:rgba(0,0,0,0.5); padding:0 2px; border-radius:2px;
    }
    /* Сущности — px */
    .nhud-map-entity {
        position:absolute; width:20px; height:20px; border-radius:50%;
        transform:translate(-50%,-50%); cursor:grab; z-index:20; touch-action:none;
    }
    .nhud-map-entity::before {
        content:''; position:absolute; top:50%; left:50%;
        width:40px; height:40px; transform:translate(-50%,-50%);
        border-radius:50%; background:transparent;
    }
    .nhud-map-entity.player { background:#ff4444; border:2px solid #fff; }
    .nhud-map-entity.bot { background:#44aaff; border:2px solid #fff; }
    .nhud-map-entity.npc { border:2px solid #fff; }
    .nhud-map-entity-label {
        position:absolute; top:22px; left:50%; transform:translateX(-50%);
        font-size:8px; white-space:nowrap; pointer-events:none;
        background:rgba(0,0,0,0.7); padding:1px 3px; border-radius:2px; color:#fff;
    }
    .nhud-map-draw-preview {
        position:absolute; border:2px solid #52e0a3; background:rgba(82,224,163,0.15);
        pointer-events:none; z-index:5;
    }
    /* Тулбар */
    .nhud-map-toolbar {
        display:flex; gap:4px; padding:6px 8px; background:rgba(0,0,0,0.4);
        border-bottom:1px solid var(--nhud-border); flex-wrap:wrap; align-items:center; flex-shrink:0;
    }
    .nhud-map-tool-btn {
        background:rgba(255,255,255,0.05); border:1px solid var(--nhud-border);
        color:#a0a0b0; padding:4px 10px; border-radius:4px; cursor:pointer;
        font-size:11px; transition:0.2s;
    }
    .nhud-map-tool-btn:hover { background:rgba(255,255,255,0.1); }
    .nhud-map-tool-btn.active {
        background:var(--nhud-accent, #d05070); color:#fff;
        border-color:var(--nhud-accent, #d05070);
    }
    /* Редактирование зон */
    .nhud-map-zone-editable polygon { stroke:#ffaa00 !important; stroke-width:3 !important; }
    .nhud-map-vertex {
        position:absolute; width:10px; height:10px; background:#ffaa00;
        border:1px solid #fff; border-radius:50%; cursor:move; z-index:15;
        transform:translate(-50%,-50%); touch-action:none;
    }
    .nhud-map-vertex::before {
        content:''; position:absolute; top:-10px; left:-10px;
        width:30px; height:30px; background:transparent;
    }
    /* Рисование полигона */
    .nhud-map-poly-point {
        position:absolute; width:8px; height:8px; background:#52e0a3;
        border:1px solid #fff; border-radius:50%; transform:translate(-50%,-50%);
        z-index:25; pointer-events:none;
    }
    /* Контекстное меню */
    .nhud-map-dropdown {
        position:absolute; background:var(--nhud-prompt-bg,#151220); border:1px solid var(--nhud-border);
        border-radius:6px; padding:6px; z-index:99999; display:none;
        box-shadow:0 5px 15px rgba(0,0,0,0.8); min-width:160px;
    }
    .nhud-map-dropdown button {
        display:block; width:100%; text-align:left; background:none; border:none;
        color:var(--nhud-text-main,#e0c0c0); padding:6px 10px; cursor:pointer;
        font-size:12px; border-radius:4px;
    }
    .nhud-map-dropdown button:hover { background:rgba(255,255,255,0.1); }
`;

let currentTool = 'select';
let drawPolyPoints = [];
let drawPolyElements = [];
let drawStart = null;
let drawPreview = null;
let activeDrag = null;
let canvasWidth = 0;
let canvasHeight = 0;
let showGrid = false;
let showCoords = false;
let editingZoneId = null;
let editingVertices = [];
let currentZoom = 1;
let gridColor = 'white';

// ========================================================================
// Zoom
// ========================================================================

function setZoom(z) {
    currentZoom = Math.max(0.25, Math.min(4, z));
    const canvas = document.getElementById('nhud-map-canvas');
    canvas.style.transformOrigin = '0 0';
    canvas.style.transform = `scale(${currentZoom})`;
    $('#nhud-map-zoom-label').text(Math.round(currentZoom * 100) + '%');
}

// ========================================================================
// Создание контейнера
// ========================================================================
export function createMapContainer() {
    if ($('#nhud-map-container').length) return $('#nhud-map-container')[0];
    if (!$('#nhud-map-styles').length) $('<style id="nhud-map-styles">').text(MAP_CSS).appendTo('head');

    const html = `
        <div id="nhud-map-container">
            <div id="nhud-map-header" style="display:flex; justify-content:space-between; align-items:center;
                background:var(--nhud-prompt-header,#2a101a); padding:10px;
                border-bottom:1px solid var(--nhud-border); cursor:grab; flex-shrink:0;">
                <span style="font-weight:bold; color:var(--nhud-accent,#d05070); font-size:14px;">🗺️ Карта</span>
                <div style="display:flex; gap:3px; align-items:center; flex-wrap:wrap;">
                    <button id="nhud-map-upload-bg" class="nhud-map-tool-btn" style="padding:2px 6px; font-size:11px;" title="Фон">🖼️</button>
                    <span id="nhud-map-scale-label" style="font-size:10px; color:#a0a0b0; min-width:60px; text-align:center; cursor:pointer;"
                        title="Нажмите для ручного ввода">📏 50px/м</span>
                    <button id="nhud-map-zoom-out" class="nhud-map-tool-btn" style="padding:2px 6px; font-size:11px;" title="Уменьшить">➖</button>
                    <span id="nhud-map-zoom-label" style="font-size:10px; color:#a0a0b0; min-width:30px; text-align:center;">100%</span>
                    <button id="nhud-map-zoom-in" class="nhud-map-tool-btn" style="padding:2px 6px; font-size:11px;" title="Увеличить">➕</button>
                    <button id="nhud-map-grid-toggle" class="nhud-map-tool-btn" style="padding:2px 6px; font-size:11px;" title="Сетка">⊞</button>
                    <button id="nhud-map-grid-color" class="nhud-map-tool-btn" style="padding:2px 6px; font-size:11px;" title="Цвет сетки (чёрный/белый)">⬛</button>
                    <button id="nhud-map-coords-toggle" class="nhud-map-tool-btn" style="padding:2px 6px; font-size:11px;" title="Координаты">📐</button>
                    <button id="nhud-map-reset" class="nhud-map-tool-btn" style="padding:2px 6px; font-size:11px;" title="Сброс">🔄</button>
                    <button id="nhud-map-close" style="background:none; border:none; color:var(--nhud-accent); cursor:pointer; font-size:16px; padding:0;">✕</button>
                </div>
            </div>
            <div class="nhud-map-toolbar">
                <button class="nhud-map-tool-btn active" data-tool="select" title="Перемещать маркеры">👆</button>
                <button class="nhud-map-tool-btn" data-tool="pan" title="Двигать карту">🤚</button>
                <button class="nhud-map-tool-btn" data-tool="draw-zone" title="Рисовать зону (клики по углам, двойной клик — завершить)">⬜</button>
                <button class="nhud-map-tool-btn" data-tool="add-anchor" title="Добавить якорь">📌</button>
                <button class="nhud-map-tool-btn" data-tool="edit" title="Редактировать зоны/якоря">✏️</button>
                <button class="nhud-map-tool-btn" data-tool="add-npc" title="Добавить NPC">🎭</button>
                <span style="flex:1;"></span>
                <button id="nhud-map-fog-toggle" class="nhud-map-tool-btn" style="padding:2px 6px; font-size:11px;" title="Скрыть/показать зоны и якоря">👁️</button>
                <button id="nhud-map-save-archive" class="nhud-map-tool-btn" style="padding:2px 6px; font-size:11px;" title="Сохранить в архив">💾</button>
                <button id="nhud-map-load-archive" class="nhud-map-tool-btn" style="padding:2px 6px; font-size:11px;" title="Загрузить из архива">📂</button>
                <span id="nhud-map-context-preview" style="font-size:10px; color:#606080; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"></span>
            </div>
            <div id="nhud-map-canvas-wrapper">
                <div id="nhud-map-canvas">
                    <div id="nhud-map-grid-overlay" class="nhud-map-grid-overlay"></div>
                </div>
            </div>
            <input type="file" id="nhud-map-bg-input" accept="image/*" style="display:none;" />
        </div>
    `;

    $('body').append(html);

    // События
    $('#nhud-map-close').on('click', () => toggleMap(false));
    $('#nhud-map-upload-bg').on('click', () => $('#nhud-map-bg-input').trigger('click'));
    $('#nhud-map-bg-input').on('change', handleBackgroundUpload);
    $('#nhud-map-reset').on('click', () => { if (confirm('Сбросить карту?')) { resetMapData(); renderMap(); } });
    $('#nhud-map-grid-toggle').on('click', () => { showGrid = !showGrid; $('#nhud-map-grid-toggle').toggleClass('active', showGrid); renderGrid(); });
    $('#nhud-map-coords-toggle').on('click', () => { showCoords = !showCoords; $('#nhud-map-coords-toggle').toggleClass('active', showCoords); renderCoords(); });

    // Скрыть/показать зоны и якоря (только визуально)
    let fogMode = false;
    $('#nhud-map-fog-toggle').on('click', () => {
        fogMode = !fogMode;
        $('#nhud-map-fog-toggle').toggleClass('active', fogMode);
        $('#nhud-map-fog-toggle').text(fogMode ? '👁️‍🗨️' : '👁️');
        $('#nhud-map-svg-layer').toggle(!fogMode);
        $('#nhud-map-canvas .nhud-map-anchor').toggle(!fogMode);
    });

    // Цвет сетки
    $('#nhud-map-grid-color').on('click', () => {
        gridColor = gridColor === 'white' ? 'black' : 'white';
        $('#nhud-map-grid-color').text(gridColor === 'white' ? '⬜' : '⬛');
        renderGrid();
    });

    // Zoom кнопки
    $('#nhud-map-zoom-in').on('click', () => setZoom(currentZoom + 0.25));
    $('#nhud-map-zoom-out').on('click', () => setZoom(currentZoom - 0.25));

    // Zoom колёсиком
    document.getElementById('nhud-map-canvas-wrapper').addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(currentZoom + (e.deltaY > 0 ? -0.1 : 0.1));
        }
    }, { passive: false });
    $('#nhud-map-save-archive').on('click', () => { const n = prompt('Имя сохранения:'); if (n) saveMapToArchive(n); });
    $('#nhud-map-load-archive').on('click', showArchiveMenu);

    // Клик на label масштаба — ручной ввод px/м
    $('#nhud-map-scale-label').on('click', () => {
        const current = getPixelsPerMeter();
        const val = prompt(`Сколько пикселей = 1 метр?\n(Текущее: ${current})`, current);
        if (val && !isNaN(parseInt(val)) && parseInt(val) > 0) {
            setPixelsPerMeter(parseInt(val));
        }
    });

    // Инструменты
    $('.nhud-map-tool-btn[data-tool]').on('click', function () {
        currentTool = $(this).data('tool');
        $('.nhud-map-tool-btn[data-tool]').removeClass('active');
        $(this).addClass('active');
        cancelPolygonDrawing();
        clearVertexHandles();
        updateCursor();
    });

    // Pointer events — на canvas-wrapper чтобы ловить события везде
    const wrapper = document.getElementById('nhud-map-canvas-wrapper');
    wrapper.addEventListener('pointerdown', onCanvasPointerDown, { passive: false });
    wrapper.addEventListener('pointermove', onCanvasPointerMove, { passive: false });
    wrapper.addEventListener('pointerup', onCanvasPointerUp);
    wrapper.addEventListener('pointercancel', onCanvasPointerUp);

    // Drag окна
    import('../ui/Popups.js').then(m => m.makeWindowDraggable('nhud-map-container', 'nhud-map-header'));

    // Подписки
    eventBus.on('map:entity-moved', () => { renderMap(); updateContextPreview(); });
    eventBus.on('map:zones-changed', () => { renderMap(); updateContextPreview(); });
    eventBus.on('map:anchors-changed', () => { renderMap(); updateContextPreview(); });
    eventBus.on('map:npcs-changed', () => { renderMap(); updateContextPreview(); });
    eventBus.on('map:reset', () => renderMap());
    eventBus.on('map:scale-changed', () => { updateScaleLabel(); renderGrid(); });
    eventBus.on('map:archive-changed', () => {});

    return $('#nhud-map-container')[0];
}

// ========================================================================
// Масштаб — удалён. Картинка = натуральный размер.
// Viewport со скроллом.
// ========================================================================

function updateScaleLabel() {
    const ppm = getPixelsPerMeter();
    $('#nhud-map-scale-label').text(`📏 ${ppm}px/м`);
}

export function toggleMap(show) {
    createMapContainer();
    const el = $('#nhud-map-container');
    if (show === undefined) show = !el.is(':visible');
    show ? el.fadeIn(150) : el.fadeOut(150);
    if (show) renderMap();
}

// ========================================================================
// Рендеринг — все координаты в px
// ========================================================================
export function renderMap() {
    const canvas = $('#nhud-map-canvas');
    // Сохраняем grid-overlay перед очисткой
    const gridOverlay = $('#nhud-map-grid-overlay').detach();
    canvas.empty();
    // Возвращаем grid-overlay
    canvas.append(gridOverlay);
    cancelPolygonDrawing();
    clearVertexHandles();

    const map = getMapData();
    if (!map) return;

    updateScaleLabel();

    // Фон — натуральный размер
    if (map.backgroundImage) {
        const img = $(`<img src="${map.backgroundImage}" draggable="false" />`);
        img.on('load', () => {
            canvasWidth = img[0].naturalWidth;
            canvasHeight = img[0].naturalHeight;
            canvas.css({ width: canvasWidth + 'px', height: canvasHeight + 'px' });
            renderSvgLayer(map);
            renderGrid();
            renderCoords();
            renderAnchors(canvas, map);
            renderEntities(canvas, map);
        });
        canvas.append(img);
        // Если уже закэширована
        if (img[0].complete && img[0].naturalWidth) {
            canvasWidth = img[0].naturalWidth;
            canvasHeight = img[0].naturalHeight;
            canvas.css({ width: canvasWidth + 'px', height: canvasHeight + 'px' });
        }
    } else {
        canvasWidth = 800; canvasHeight = 600;
        canvas.css({ width: canvasWidth + 'px', height: canvasHeight + 'px' });
    }

    // SVG слой для зон
    renderSvgLayer(map);

    // Сетка — делаем grid-overlay синхронным с canvas
    renderGrid();
    renderCoords();

    // Якоря и сущности
    renderAnchors(canvas, map);
    renderEntities(canvas, map);

    updateCursor();
    updateContextPreview();
}

function renderAnchors(canvas, map) {
    canvas.find('.nhud-map-anchor').remove();
    for (const anchor of map.anchors) {
        const isRect = anchor.w && anchor.h;
        const style = isRect
            ? `left:${anchor.x}px; top:${anchor.y}px; width:${anchor.w}px; height:${anchor.h}px;`
            : `left:${anchor.x}px; top:${anchor.y}px; width:8px; height:8px; border-radius:50%; transform:translate(-50%,-50%);`;
        const labelHtml = anchor.hiddenLabel ? '' : `<span class="nhud-map-anchor-label">${anchor.name}</span>`;
        const el = $(`<div class="nhud-map-anchor" data-anchor-id="${anchor.id}" style="${style}">${labelHtml}</div>`);
        el.on('contextmenu', (e) => {
            e.preventDefault(); e.stopPropagation();
            showAnchorContextMenu(e, anchor.id);
        });
        canvas.append(el);
    }
}

function renderEntities(canvas, map) {
    canvas.find('.nhud-map-entity').remove();

    // Player & Bot
    for (const entName of ['player', 'bot']) {
        const pos = map.entities[entName];
        if (!pos) continue;
        const color = pos.color || (entName === 'player' ? '#ff4444' : '#44aaff');
        const label = pos.displayName || (entName === 'player' ? 'Игрок' : 'Бот');
        const labelHtml = pos.hiddenLabel ? '' : `<span class="nhud-map-entity-label" style="color:${color};">${label}</span>`;
        const el = $(`<div class="nhud-map-entity" data-entity="${entName}" style="left:${pos.x}px; top:${pos.y}px; background:${color};">${labelHtml}</div>`);
        el.on('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showColorPicker(e, entName, 'entity'); });
        canvas.append(el);
    }

    // NPC
    for (const npc of (map.npcs || [])) {
        const color = npc.color || '#a052e0';
        const el = $(`<div class="nhud-map-entity npc" data-npc-id="${npc.id}" style="left:${npc.x}px; top:${npc.y}px; background:${color};">
            <span class="nhud-map-entity-label" style="color:${color};">${npc.name}</span></div>`);
        el.on('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showColorPicker(e, npc.id, 'npc'); });
        canvas.append(el);
    }
}

function renderSvgLayer(map) {
    $('#nhud-map-svg-layer').remove();
    if (!canvasWidth) return;

    // SVG viewBox = натуральный размер картинки (px)
    let svg = `<svg id="nhud-map-svg-layer" viewBox="0 0 ${canvasWidth} ${canvasHeight}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
        style="width:${canvasWidth}px; height:${canvasHeight}px;">`;

    for (const zone of map.zones) {
        if (!zone.points || zone.points.length < 3) continue;
        const pts = zone.points.map(([x, y]) => `${x},${y}`).join(' ');
        const fill = zone.color || 'rgba(82,168,224,0.15)';
        const stroke = zone.color ? zone.color.replace('0.15', '0.6') : 'rgba(82,168,224,0.6)';
        const center = getPolygonCenter(zone.points);

        svg += `<polygon data-zone-id="${zone.id}" points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2" />`;
        if (!zone.hiddenLabel) {
            svg += `<text class="nhud-map-zone-label-svg" x="${center.x}" y="${center.y}" text-anchor="middle" dominant-baseline="middle">${zone.name}</text>`;
        }
    }

    svg += '</svg>';
    $('#nhud-map-canvas').append(svg);

    // Клик по полигону
    $('#nhud-map-svg-layer polygon').on('click', function (e) {
        e.stopPropagation();
        if (currentTool === 'edit') {
            const zoneId = $(this).attr('data-zone-id');
            startEditZone(zoneId);
        }
    });
    $('#nhud-map-svg-layer polygon').on('contextmenu', function (e) {
        e.preventDefault();
        const zoneId = $(this).attr('data-zone-id');
        showZoneContextMenu(e, zoneId);
    });
}

function renderGrid() {
    const grid = $('#nhud-map-grid-overlay');
    grid.hide();
    grid.removeClass('grid-white grid-black');

    if (!showGrid || !canvasWidth) return;

    const ppm = getPixelsPerMeter();
    grid.addClass(gridColor === 'black' ? 'grid-black' : 'grid-white');
    grid.css('background-size', `${ppm}px ${ppm}px`);
    grid.show();
}

function renderCoords() {
    $('#nhud-map-canvas .nhud-map-coords').remove();
    if (!showCoords || !canvasWidth) return;
    const c = $('<div class="nhud-map-coords"></div>');
    // Координаты в пикселях
    for (let x = 0; x <= canvasWidth; x += 100) {
        c.append(`<span class="nhud-map-coord-label" style="left:${x}px; top:2px; position:absolute; font-size:8px; color:rgba(255,255,255,0.4); pointer-events:none;">${x}px</span>`);
    }
    for (let y = 0; y <= canvasHeight; y += 100) {
        c.append(`<span class="nhud-map-coord-label" style="left:2px; top:${y}px; position:absolute; font-size:8px; color:rgba(255,255,255,0.4); pointer-events:none;">${y}px</span>`);
    }
    $('#nhud-map-canvas').append(c);
}

// ========================================================================
// Контекстные меню
// ========================================================================

function showAnchorContextMenu(e, anchorId) {
    const map = getMapData();
    const anchor = map?.anchors?.find(a => a.id === anchorId);
    if (!anchor) return;

    $('.nhud-map-dropdown').remove();
    const dd = $('<div class="nhud-map-dropdown"></div>');
    dd.css({ top: (e.clientY - $('#nhud-map-container').offset().top) + 'px', left: (e.clientX - $('#nhud-map-container').offset().left) + 'px' });

    dd.append(`<button style="font-weight:bold; color:#e0a352; cursor:default; pointer-events:none;">${anchor.name}</button>`);

    dd.append($('<button>✏️ Переименовать</button>').on('click', () => {
        const newName = prompt('Новое имя:', anchor.name);
        if (newName) { anchor.name = newName; import("../../../../../script.js").then(s => s.saveSettingsDebounced()); renderMap(); }
        dd.remove();
    }));

    dd.append($(`<button>${anchor.hiddenLabel ? '👁️ Показать имя' : '🙈 Скрыть имя'}</button>`).on('click', () => {
        anchor.hiddenLabel = !anchor.hiddenLabel;
        import("../../../../../script.js").then(s => s.saveSettingsDebounced());
        renderMap();
        dd.remove();
    }));

    // Кастомный размер якоря в метрах
    const ancW = anchor.customWidthMeters || '';
    const ancH = anchor.customHeightMeters || '';
    const ancSize = (ancW || ancH) ? `${ancW}×${ancH}м` : 'авто';
    dd.append($(`<button>📐 Размер: ${ancSize}</button>`).on('click', () => {
        const w = prompt('Ширина якоря в метрах:', anchor.customWidthMeters || '');
        if (w !== null) {
            const h = prompt('Высота якоря в метрах:', anchor.customHeightMeters || '');
            anchor.customWidthMeters = w && !isNaN(parseFloat(w)) && parseFloat(w) > 0 ? parseFloat(w) : null;
            anchor.customHeightMeters = h && !isNaN(parseFloat(h)) && parseFloat(h) > 0 ? parseFloat(h) : null;
            import("../../../../../script.js").then(s => s.saveSettingsDebounced());
            renderMap();
        }
        dd.remove();
    }));

    dd.append($('<button style="color:#e05252;">🗑️ Удалить якорь</button>').on('click', () => {
        if (confirm(`Удалить "${anchor.name}"?`)) removeAnchor(anchorId);
        dd.remove();
    }));

    $('#nhud-map-container').append(dd);
    dd.fadeIn(100);
    setTimeout(() => {
        $(document).off('click.nhudAnchorCtx').on('click.nhudAnchorCtx', (ev) => {
            if (!$(ev.target).closest('.nhud-map-dropdown').length) {
                dd.fadeOut(100, () => dd.remove());
                $(document).off('click.nhudAnchorCtx');
            }
        });
    }, 50);
}

function showZoneContextMenu(e, zoneId) {
    const map = getMapData();
    const zone = map?.zones?.find(z => z.id === zoneId);
    if (!zone) return;

    $('.nhud-map-dropdown').remove();
    const dd = $('<div class="nhud-map-dropdown"></div>');
    dd.css({ top: (e.clientY - $('#nhud-map-container').offset().top) + 'px', left: (e.clientX - $('#nhud-map-container').offset().left) + 'px' });

    dd.append(`<button style="font-weight:bold; color:#c0e0f0; cursor:default; pointer-events:none;">${zone.name}</button>`);

    dd.append($('<button>✏️ Переименовать</button>').on('click', () => {
        const newName = prompt('Новое имя:', zone.name);
        if (newName) { zone.name = newName; import("../../../../../script.js").then(s => s.saveSettingsDebounced()); renderMap(); }
        dd.remove();
    }));

    dd.append($(`<button>${zone.hiddenLabel ? '👁️ Показать имя' : '🙈 Скрыть имя'}</button>`).on('click', () => {
        zone.hiddenLabel = !zone.hiddenLabel;
        import("../../../../../script.js").then(s => s.saveSettingsDebounced());
        renderMap();
        dd.remove();
    }));

    dd.append($('<button>🎨 Цвет зоны</button>').on('click', () => {
        dd.remove();
        showZoneColorPicker(e, zoneId);
    }));

    // Кастомный размер зоны в метрах
    const zW = zone.customWidthMeters || '';
    const zH = zone.customHeightMeters || '';
    const currentSize = (zW || zH) ? `${zW}×${zH}м` : 'авто';
    dd.append($(`<button>📐 Размер: ${currentSize}</button>`).on('click', () => {
        const w = prompt('Ширина зоны в метрах:', zone.customWidthMeters || '');
        if (w !== null) {
            const h = prompt('Высота зоны в метрах:', zone.customHeightMeters || '');
            zone.customWidthMeters = w && !isNaN(parseFloat(w)) && parseFloat(w) > 0 ? parseFloat(w) : null;
            zone.customHeightMeters = h && !isNaN(parseFloat(h)) && parseFloat(h) > 0 ? parseFloat(h) : null;
            import("../../../../../script.js").then(s => s.saveSettingsDebounced());
            renderMap();
        }
        dd.remove();
    }));

    dd.append($('<button style="color:#e05252;">🗑️ Удалить зону</button>').on('click', () => {
        if (confirm(`Удалить "${zone.name}"?`)) removeZone(zoneId);
        dd.remove();
    }));

    $('#nhud-map-container').append(dd);
    dd.fadeIn(100);
    setTimeout(() => {
        $(document).off('click.nhudCtx').on('click.nhudCtx', (ev) => {
            if (!$(ev.target).closest('.nhud-map-dropdown').length) {
                dd.fadeOut(100, () => dd.remove());
                $(document).off('click.nhudCtx');
            }
        });
    }, 50);
}

function showZoneColorPicker(e, zoneId) {
    const colors = [
        'rgba(82,168,224,0.15)', 'rgba(224,82,82,0.15)', 'rgba(82,224,163,0.15)',
        'rgba(224,163,82,0.15)', 'rgba(160,82,224,0.15)', 'rgba(224,82,168,0.15)',
        'rgba(82,224,224,0.15)', 'rgba(224,224,82,0.15)'
    ];
    $('.nhud-map-dropdown').remove();
    const dd = $('<div class="nhud-map-dropdown" style="display:flex; flex-wrap:wrap; gap:4px; padding:8px;"></div>');
    dd.css({ top: (e.clientY - $('#nhud-map-container').offset().top) + 'px', left: (e.clientX - $('#nhud-map-container').offset().left) + 'px' });
    for (const c of colors) {
        const sw = $(`<div style="width:24px; height:24px; border-radius:4px; background:${c}; cursor:pointer; border:1px solid rgba(255,255,255,0.3);"></div>`);
        sw.on('click', () => {
            const map = getMapData();
            const zone = map?.zones?.find(z => z.id === zoneId);
            if (zone) { zone.color = c; import("../../../../../script.js").then(s => s.saveSettingsDebounced()); renderMap(); }
            dd.remove();
        });
        dd.append(sw);
    }
    $('#nhud-map-container').append(dd);
    dd.fadeIn(100);
    setTimeout(() => {
        $(document).off('click.nhudColor2').on('click.nhudColor2', (ev) => {
            if (!$(ev.target).closest('.nhud-map-dropdown').length) {
                dd.fadeOut(100, () => dd.remove());
                $(document).off('click.nhudColor2');
            }
        });
    }, 50);
}

// ========================================================================
// Выбор цвета для пешек
// ========================================================================
const PALETTE = ['#ff4444','#44aaff','#52e0a3','#e0a352','#a052e0','#e052a8','#52e0e0','#e0e052','#ff8844','#88ff44','#4488ff','#ff44aa','#ffffff','#aaaaaa','#444444'];

function showColorPicker(e, id, type) {
    $('.nhud-map-dropdown').remove();
    const dd = $('<div class="nhud-map-dropdown" style="display:flex; flex-wrap:wrap; gap:4px; padding:8px; min-width:120px;"></div>');
    dd.css({ top: (e.clientY - $('#nhud-map-container').offset().top) + 'px', left: (e.clientX - $('#nhud-map-container').offset().left) + 'px' });

    for (const color of PALETTE) {
        const swatch = $(`<div style="width:20px; height:20px; border-radius:4px; background:${color}; cursor:pointer; border:1px solid rgba(255,255,255,0.2);"></div>`);
        swatch.on('click', () => { applyColor(id, type, color); dd.remove(); });
        dd.append(swatch);
    }

    const renameBtn = $('<button style="margin-top:4px; width:100%;">✏️ Переименовать</button>');
    renameBtn.on('click', () => {
        const map = getMapData();
        let currentName = '';
        if (type === 'entity') currentName = id === 'player' ? 'Игрок' : 'Бот';
        if (type === 'npc') { const npc = map?.npcs?.find(n => n.id === id); currentName = npc?.name || ''; }
        const newName = prompt('Новое имя:', currentName);
        if (newName) {
            if (type === 'npc') { const npc = map?.npcs?.find(n => n.id === id); if (npc) npc.name = newName; }
            if (type === 'entity' && map?.entities?.[id]) map.entities[id].displayName = newName;
            import("../../../../../script.js").then(s => s.saveSettingsDebounced());
            renderMap();
        }
        dd.remove();
    });
    dd.append(renameBtn);

    if (type === 'npc') {
        const delBtn = $('<button style="margin-top:4px; width:100%; color:#e05252;">🗑️ Удалить</button>');
        delBtn.on('click', () => { removeNpc(id); dd.remove(); });
        dd.append(delBtn);
    }

    $('#nhud-map-container').append(dd);
    dd.fadeIn(100);
    setTimeout(() => {
        $(document).off('click.nhudColor').on('click.nhudColor', (ev) => {
            if (!$(ev.target).closest('.nhud-map-dropdown').length) {
                dd.fadeOut(100, () => dd.remove());
                $(document).off('click.nhudColor');
            }
        });
    }, 50);
}

function applyColor(id, type, color) {
    const map = getMapData();
    if (!map) return;
    if (type === 'entity') {
        if (map.entities[id]) {
            map.entities[id].color = color;
            import("../../../../../script.js").then(s => s.saveSettingsDebounced());
            renderMap();
        }
    }
    if (type === 'npc') {
        const npc = map.npcs.find(n => n.id === id);
        if (npc) {
            npc.color = color;
            import("../../../../../script.js").then(s => s.saveSettingsDebounced());
            renderMap();
        }
    }
}

// ========================================================================
// Рисование полигона
// ========================================================================
function cancelPolygonDrawing() {
    drawPolyPoints = [];
    for (const el of drawPolyElements) el.remove();
    drawPolyElements = [];
}

function addPolyPoint(xPx, yPx) {
    drawPolyPoints.push([xPx, yPx]);
    const el = $(`<div class="nhud-map-poly-point" style="left:${xPx}px; top:${yPx}px;"></div>`);
    $('#nhud-map-canvas').append(el);
    drawPolyElements.push(el);
}

function finishPolygon() {
    if (drawPolyPoints.length < 3) { cancelPolygonDrawing(); return; }
    const name = prompt('Имя зоны:');
    if (name) addZone({ name, description: '', points: drawPolyPoints.map(p => [...p]) });
    cancelPolygonDrawing();
}

// ========================================================================
// Редактирование вершин зоны
// ========================================================================
function startEditZone(zoneId) {
    clearVertexHandles();
    editingZoneId = zoneId;
    const map = getMapData();
    const zone = map?.zones?.find(z => z.id === zoneId);
    if (!zone || !zone.points) return;

    $(`#nhud-map-svg-layer polygon[data-zone-id="${zoneId}"]`).parent().addClass('nhud-map-zone-editable');

    zone.points.forEach((pt, idx) => {
        const handle = $(`<div class="nhud-map-vertex" data-idx="${idx}" style="left:${pt[0]}px; top:${pt[1]}px;"></div>`);
        $('#nhud-map-canvas').append(handle);
        editingVertices.push(handle);
    });
}

function clearVertexHandles() {
    for (const h of editingVertices) h.remove();
    editingVertices = [];
    editingZoneId = null;
    $('.nhud-map-zone-editable').removeClass('nhud-map-zone-editable');
}

// ========================================================================
// Курсор
// ========================================================================
function updateCursor() {
    const w = $('#nhud-map-canvas-wrapper');
    w.removeClass('panning');
    switch (currentTool) {
        case 'select': w.css('cursor', 'default'); break;
        case 'pan': w.css('cursor', 'grab'); w.addClass('panning'); break;
        case 'draw-zone': w.css('cursor', 'crosshair'); break;
        case 'add-anchor': w.css('cursor', 'cell'); break;
        case 'edit': w.css('cursor', 'pointer'); break;
        case 'add-npc': w.css('cursor', 'crosshair'); break;
    }
}

function updateContextPreview() {
    const ctx = generateSpatialContext();
    $('#nhud-map-context-preview').text(ctx ? ctx.substring(0, 50) + '...' : '');
}

function handleBackgroundUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const map = getMapData();
        if (map) { map.backgroundImage = ev.target.result; import("../../../../../script.js").then(s => s.saveSettingsDebounced()); renderMap(); }
    };
    reader.readAsDataURL(file); e.target.value = '';
}

// ========================================================================
// Архив
// ========================================================================
function showArchiveMenu() {
    const archive = getMapArchive();
    $('.nhud-map-dropdown').remove();
    const dd = $('<div class="nhud-map-dropdown"></div>');
    dd.css({ top: '70px', right: '10px' });

    if (archive.length === 0) {
        dd.append('<button disabled style="color:#606080;">Архив пуст</button>');
    } else {
        archive.forEach((item, idx) => {
            const row = $('<div style="display:flex; gap:4px; align-items:center;"></div>');
            const btn = $(`<button style="flex:1; text-align:left;">${item.archiveName || 'Без имени'} <span style="color:#606080; font-size:10px;">(${new Date(item.savedAt).toLocaleDateString()})</span></button>`);
            btn.on('click', () => { loadMapFromArchive(idx); dd.remove(); });
            const delBtn = $('<button style="padding:2px 6px; color:#e05252; font-size:11px; flex-shrink:0;" title="Удалить">🗑️</button>');
            delBtn.on('click', () => { if (confirm('Удалить из архива?')) { deleteMapFromArchive(idx); showArchiveMenu(); } });
            row.append(btn).append(delBtn);
            dd.append(row);
        });
    }
    $('#nhud-map-container').append(dd);
    dd.fadeIn(100);
    setTimeout(() => {
        $(document).off('click.nhudArchive').on('click.nhudArchive', (e) => {
            if (!$(e.target).closest('.nhud-map-dropdown, #nhud-map-load-archive').length) {
                dd.fadeOut(100, () => dd.remove());
                $(document).off('click.nhudArchive');
            }
        });
    }, 50);
}

// ========================================================================
// Pointer Events — все координаты в px
// ========================================================================

/**
 * Конвертирует clientX/Y в пиксели canvas (абсолютные координаты мира).
 * Учитывает zoom через transform: scale().
 */
function getPxCoords(e) {
    const canvas = document.getElementById('nhud-map-canvas');
    const rect = canvas.getBoundingClientRect();
    // rect уже учитывает transform: scale (getBoundingClientRect возвращает визуальные px)
    // Но нам нужны координаты в "мире" (без zoom), поэтому делим на zoom
    const x = Math.round((e.clientX - rect.left) / currentZoom);
    const y = Math.round((e.clientY - rect.top) / currentZoom);
    return { x, y };
}

let lastClickTime = 0;

function onCanvasPointerDown(e) {
    e.preventDefault();
    const target = e.target.closest('.nhud-map-entity');
    const vertex = e.target.closest('.nhud-map-vertex');

    // Select: перетаскивание сущности/NPC
    if (currentTool === 'select' && target) {
        target.setPointerCapture(e.pointerId);
        target.style.cursor = 'grabbing';
        activeDrag = { type: 'entity', element: $(target), entityName: target.dataset.entity, npcId: target.dataset.npcId, pointerId: e.pointerId };
        return;
    }

    // Pan
    if (currentTool === 'pan') {
        const wrapper = document.getElementById('nhud-map-canvas-wrapper');
        wrapper.setPointerCapture(e.pointerId);
        wrapper.style.cursor = 'grabbing';
        activeDrag = { type: 'pan', pointerId: e.pointerId, startScrollLeft: wrapper.scrollLeft, startScrollTop: wrapper.scrollTop, startClientX: e.clientX, startClientY: e.clientY };
        return;
    }

    // Edit: drag vertex
    if (currentTool === 'edit' && vertex) {
        vertex.setPointerCapture(e.pointerId);
        activeDrag = { type: 'move-vertex', vertex, idx: parseInt(vertex.dataset.idx), pointerId: e.pointerId };
        return;
    }

    // Edit: drag anchor
    if (currentTool === 'edit') {
        const anchorEl = e.target.closest('.nhud-map-anchor');
        if (anchorEl) {
            anchorEl.setPointerCapture(e.pointerId);
            activeDrag = { type: 'move-anchor', element: $(anchorEl), anchorId: anchorEl.dataset.anchorId, pointerId: e.pointerId, startPx: getPxCoords(e) };
            return;
        }
    }

    // Draw zone (polygon) — координаты в px
    if (currentTool === 'draw-zone') {
        const now = Date.now();
        const px = getPxCoords(e);

        if (now - lastClickTime < 400 && drawPolyPoints.length >= 3) {
            finishPolygon(); lastClickTime = 0; return;
        }
        lastClickTime = now;

        if (drawPolyPoints.length >= 3) {
            const first = drawPolyPoints[0];
            const dist = Math.sqrt((px.x - first[0]) ** 2 + (px.y - first[1]) ** 2);
            if (dist < 15) { finishPolygon(); return; }
        }

        addPolyPoint(px.x, px.y);
        return;
    }

    // Add anchor (drag-to-draw rect) — px
    if (currentTool === 'add-anchor') {
        const px = getPxCoords(e);
        drawStart = px;
        drawPreview = $('<div class="nhud-map-draw-preview" style="border-color:#e0a352; background:rgba(224,163,82,0.15);"></div>');
        drawPreview.css({ left: px.x + 'px', top: px.y + 'px', width: '0', height: '0' });
        $('#nhud-map-canvas').append(drawPreview);
        document.getElementById('nhud-map-canvas').setPointerCapture(e.pointerId);
        activeDrag = { type: 'draw-anchor', pointerId: e.pointerId };
        return;
    }

    // Add NPC — px
    if (currentTool === 'add-npc') {
        const px = getPxCoords(e);
        const name = prompt('Имя NPC:');
        if (name) {
            const zone = findZoneAt(px.x, px.y);
            addNpc({ name, x: px.x, y: px.y, zoneId: zone?.id || null, anchorId: null });
        }
        return;
    }
}

function onCanvasPointerMove(e) {
    if (!activeDrag) return;
    e.preventDefault();

    if (activeDrag.type === 'entity') {
        const px = getPxCoords(e);
        activeDrag.element.css({ left: px.x + 'px', top: px.y + 'px' });
        return;
    }

    if (activeDrag.type === 'pan') {
        const wrapper = document.getElementById('nhud-map-canvas-wrapper');
        wrapper.scrollLeft = activeDrag.startScrollLeft - (e.clientX - activeDrag.startClientX);
        wrapper.scrollTop = activeDrag.startScrollTop - (e.clientY - activeDrag.startClientY);
        return;
    }

    if (activeDrag.type === 'move-vertex') {
        const px = getPxCoords(e);
        activeDrag.vertex.style.left = px.x + 'px';
        activeDrag.vertex.style.top = px.y + 'px';
        return;
    }

    if (activeDrag.type === 'move-anchor') {
        const px = getPxCoords(e);
        const dx = px.x - activeDrag.startPx.x;
        const dy = px.y - activeDrag.startPx.y;
        const map = getMapData();
        const anchor = map?.anchors?.find(a => a.id === activeDrag.anchorId);
        if (anchor) {
            anchor.x = Math.max(0, anchor.x + dx);
            anchor.y = Math.max(0, anchor.y + dy);
            activeDrag.startPx = px;
            activeDrag.element.css({ left: anchor.x + 'px', top: anchor.y + 'px' });
        }
        return;
    }

    if (activeDrag.type === 'draw-anchor' && drawStart && drawPreview) {
        const px = getPxCoords(e);
        drawPreview.css({
            left: Math.min(drawStart.x, px.x) + 'px',
            top: Math.min(drawStart.y, px.y) + 'px',
            width: Math.abs(px.x - drawStart.x) + 'px',
            height: Math.abs(px.y - drawStart.y) + 'px'
        });
        return;
    }
}

function onCanvasPointerUp(e) {
    if (!activeDrag) return;

    if (activeDrag.type === 'entity') {
        const px = getPxCoords(e);
        if (activeDrag.npcId) {
            moveNpc(activeDrag.npcId, px.x, px.y);
        } else {
            setEntityPosition(activeDrag.entityName, px.x, px.y);
        }
        renderMap();
    }

    if (activeDrag.type === 'move-vertex' && editingZoneId) {
        const map = getMapData();
        const zone = map?.zones?.find(z => z.id === editingZoneId);
        if (zone && zone.points) {
            const px = getPxCoords(e);
            zone.points[activeDrag.idx] = [px.x, px.y];
            import("../../../../../script.js").then(s => s.saveSettingsDebounced());
            renderMap();
            startEditZone(editingZoneId);
        }
    }

    if (activeDrag.type === 'move-anchor') {
        import("../../../../../script.js").then(s => s.saveSettingsDebounced());
        eventBus.emit('map:anchors-changed');
    }

    if (activeDrag.type === 'pan') {
        document.getElementById('nhud-map-canvas-wrapper').style.cursor = 'grab';
    }

    // Финализация рисования якоря — px
    if (activeDrag.type === 'draw-anchor' && drawStart) {
        const endPx = getPxCoords(e);
        const x1 = Math.min(drawStart.x, endPx.x);
        const y1 = Math.min(drawStart.y, endPx.y);
        const w = Math.abs(endPx.x - drawStart.x);
        const h = Math.abs(endPx.y - drawStart.y);
        if (drawPreview) { drawPreview.remove(); drawPreview = null; }
        drawStart = null;
        if (w > 5 && h > 5) {
            const name = prompt('Имя якоря:');
            if (name) {
                const zone = findZoneAt(x1 + w / 2, y1 + h / 2);
                addAnchor({ name, x: x1, y: y1, w, h, zoneId: zone?.id || null });
            }
        }
    }

    activeDrag = null;
}
