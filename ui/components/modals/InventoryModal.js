// ui/components/modals/InventoryModal.js

import { makeDraggable } from '../../interactions/DragHandler.js';

export function toggleInventory(makeWindowDraggableFn) {
    let popup = $("#nhud-inventory-modal");
    if (!popup.length) {
        $("body").append(`
            <div id="nhud-inventory-modal" style="display:none; position:fixed; top:15vh; left:calc(50% - 150px); width:300px; z-index:9995; background:var(--nhud-prompt-bg, #151220); border:1px solid var(--nhud-border, #4a1525); border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.9); flex-direction:column; overflow:hidden;">
                <div id="nhud-inv-header" style="display:flex; justify-content:space-between; align-items:center; background:var(--nhud-prompt-header, #2a101a); padding:10px; border-bottom:1px solid var(--nhud-border); cursor:grab;">
                    <span style="font-weight:bold; color:#e0a352; font-size:14px;">🎒 Инвентарь и Имущество</span>
                    <button id="nhud-inv-close" style="background:none; border:none; color:var(--nhud-accent); cursor:pointer; padding:0; font-size:16px;">✕</button>
                </div>
                <div id="nhud-inv-content" style="padding:10px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.3); max-height:60vh; overflow-y:auto;"></div>
            </div>
        `);
        if (makeWindowDraggableFn) makeWindowDraggableFn("nhud-inventory-modal", "nhud-inv-header");
        $("#nhud-inv-close").on("click", () => $("#nhud-inventory-modal").fadeOut(150));
        popup = $("#nhud-inventory-modal");
    }
    if (popup.is(":visible")) popup.fadeOut(150);
    else { renderInventory(); popup.fadeIn(150); }
}

export function renderInventory() {
    import('../../../core/StateManager.js').then(m => {
        const inv = m.getInventory();
        if (!inv) return;
        const content = $("#nhud-inv-content");
        content.empty();

        content.append(`
            <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid #3a3050;">
                <div style="font-size:11px; color:#a0a0b8; text-transform:uppercase; margin-bottom:6px; font-weight:bold;">💰 Кошелек</div>
                <div style="display:flex; gap:6px;">
                    <input id="nhud-inv-money" type="number" value="${inv.money}" class="nhud-input" style="flex:1; font-weight:bold; color:#52e0a3; font-size:14px;" />
                    <input id="nhud-inv-currency" type="text" value="${inv.currency}" class="nhud-input" style="width:100px; text-align:center;" placeholder="Валюта" />
                </div>
            </div>
        `);

        const buildList = (title, key, icon) => {
            if (!inv[key]) inv[key] = []; // Защита от undefined
            let html = `<div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid #3a3050;">
                <div style="font-size:11px; color:#a0a0b8; text-transform:uppercase; margin-bottom:6px; font-weight:bold;">${icon} ${title}</div>
                <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:6px;">`;
            inv[key].forEach((item, idx) => {
                html += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:4px; border:1px solid #2a2040; font-size:12px; color:var(--nhud-text-main);">
                    <span>${typeof item === 'object' ? (item.name || JSON.stringify(item)) : item}</span>
                    <button class="nhud-inv-del nhud-s-delete" data-key="${key}" data-idx="${idx}" style="padding:2px 6px; font-size:10px; margin:0;">✕</button>
                </div>`;
            });
            html += `</div>
                <div style="display:flex; gap:4px;">
                    <input id="nhud-inv-add-val-${key}" type="text" class="nhud-input" style="flex:1; padding:4px; font-size:11px;" placeholder="Добавить..." />
                    <button class="nhud-inv-add nhud-add-btn" data-key="${key}" style="margin:0; padding:4px 8px;">+</button>
                </div>
            </div>`;
            return html;
        };

        content.append(buildList("Рюкзак", "items", "🎒"));
        content.append(buildList("Транспорт", "vehicles", "🚗"));
        content.append(buildList("Недвижимость", "estate", "🏠"));

        // Хелпер для обновления боковой панели, если она открыта
        const syncSettingsPanel = () => {
            if ($("#nhud-settings-panel").is(":visible")) {
                import('../../SettingsUI.js').then(ui => {
                    if (typeof ui.renderSettingsProperty === 'function') ui.renderSettingsProperty();
                });
            }
        };

        content.find('#nhud-inv-money').on('input', e => { 
            inv.money = parseInt(e.target.value)||0; 
            import('../../../../../script.js').then(s=>s.saveSettingsDebounced()); 
            $('#nhud-settings-money').val(inv.money); // Синхрон визуала
        });
        
        content.find('#nhud-inv-currency').on('input', e => { 
            inv.currency = e.target.value; 
            import('../../../../../script.js').then(s=>s.saveSettingsDebounced()); 
            $('#nhud-settings-currency').val(inv.currency); // Синхрон визуала
        });
        
        content.find('.nhud-inv-del').on('click', function() {
            const key = $(this).data('key');
            inv[key].splice(parseInt($(this).data('idx')), 1);
            import('../../../../../script.js').then(s=>s.saveSettingsDebounced());
            renderInventory();
            syncSettingsPanel();
        });
        
        content.find('.nhud-inv-add').on('click', function() {
            const key = $(this).data('key');
            const val = content.find(`#nhud-inv-add-val-${key}`).val().trim();
            if (val) {
                inv[key].push(key === 'items' ? val : { name: val, desc: '', active: false });
                import('../../../../../script.js').then(s=>s.saveSettingsDebounced());
                renderInventory();
                syncSettingsPanel();
            }
        });
    });
}
