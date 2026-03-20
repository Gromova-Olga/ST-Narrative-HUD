// ui/MessageActions.js
import { getSettings, getLive } from "../core/StateManager.js";
import { NarrativeStorage } from "../storage/NarrativeStorage.js";
import { getSTContext, getCurrentSwipeId } from "../utils/helpers.js";
import { applyJsonUpdate } from "../index.js";
import { showStatus } from "../utils/helpers.js";
import { renderInfoBlocks } from "./UIManager.js";
import { formatPopupText } from "../utils/helpers.js";
import { callPopup } from "../../../../../script.js";

// ─── History Button Functions ──────────────────────────────────────────

export function addHistoryButton(messageId, messageElement) {
    if (!messageElement) {
        messageElement = $(`.mes[mesid="${messageId}"]`);
    }
    
    if (messageElement.find('.nhud-history-btn').length) return;
    
    const btn = $(`
        <button class="nhud-history-btn" title="Инфоблоки этого сообщения">📋</button>
    `);
    
    btn.on('click', (e) => {
        e.stopPropagation();
        showHistoryPopup(messageId);
    });
    
    const mesButtons = messageElement.find('.mes_buttons');
    if (mesButtons.length) {
        mesButtons.append(btn);
    } else {
        const mesText = messageElement.find('.mes_text');
        if (mesText.length) {
            mesText.css('position', 'relative');
            mesText.append(btn);
        }
    }
}

export function updateHistoryButtons() {
    document.querySelectorAll('.mes[is_user="false"]').forEach(mes => {
        const msgId = mes.getAttribute('mesid');
        if (!msgId) return;

        const existing = mes.querySelector('.nhud-history-btn');
        const swipeId = mes.getAttribute('swipeid') || '0';
        
        const blocks = NarrativeStorage.getMessageBlocks(msgId);
        const swipeData = NarrativeStorage.loadSwipeData(`${msgId}_${swipeId}`);
        
        const hasBlocks = Object.keys(blocks).length > 0;
        const hasSwipeBlocks = swipeData && swipeData.infoBlocks && Object.keys(swipeData.infoBlocks).length > 0;
        const hasHistory = hasBlocks || hasSwipeBlocks;

        if (existing) {
            existing.style.display = hasHistory ? '' : 'none';
            return;
        }

        if (hasHistory) {
            addHistoryButton(msgId, $(mes));
        }
    });
}

export function showHistoryPopup(msgId) {
    const blocks = NarrativeStorage.getMessageBlocks(msgId);
    if (Object.keys(blocks).length === 0) return;
    const live = getLive();
    Object.entries(blocks).forEach(([key, value]) => {
        live.infoBlocks[key] = value;
    });
    renderInfoBlocks();
    const settings = getSettings();
    const firstKey = settings.promptBlocks.find(b => blocks[b.id])?.id;
    if (firstKey) $(`.nhud-info-btn[data-block="${firstKey}"]`).trigger('click');
    showStatus(`📋 История #${msgId}`, "info");
}

// ─── JSON Editor Functions ─────────────────────────────────────────────

export function addMessageButtons(messageId) {
    const messageElement = $(`.mes[mesid="${messageId}"]`);
    if (!messageElement.length) return;
    
    if (messageElement.find('.nhud-msg-actions').length) return;
    
    const savedData = NarrativeStorage.getMessageBlocks(String(messageId));
    const swipeId = getCurrentSwipeId(messageId);
    const swipeData = swipeId ? NarrativeStorage.loadSwipeData(`${messageId}_${swipeId}`) : null;
    const hasData = Object.keys(savedData).length > 0 || (swipeData && Object.keys(swipeData).length > 0);
    
    const btnContainer = $(`<div class="nhud-msg-actions" style="display:inline-flex; gap:4px; margin-left:8px;"></div>`);
    
    const jsonButton = $(`
        <div class="mes_button" title="Редактор JSON (Narrative HUD)" style="${!hasData ? 'opacity:0.5;' : ''}">
            <i class="fa-solid fa-code"></i>
        </div>
    `);
    jsonButton.on('click', (e) => { e.stopPropagation(); openJsonEditor(messageId); });
    
    const extractButton = $(`
        <div class="mes_button" title="Извлечь статы из текста (Regex)">
            🪄
        </div>
    `);
    extractButton.on('click', (e) => { e.stopPropagation(); extractDataFromText(messageId); });
    
    btnContainer.append(extractButton).append(jsonButton);
    
    const eyeButton = messageElement.find('.extraMesButtons .fa-eye, .extraMesButtons .fa-eye-slash').first();
    if (eyeButton.length) {
        eyeButton.parent().after(btnContainer);
    } else {
        messageElement.find('.extraMesButtons').append(btnContainer);
    }
}

export function updateAllJsonEditButtons() {
    const ctx = getSTContext();
    if (!ctx?.chat) return;
    
    ctx.chat.forEach((_, index) => {
        addMessageButtons(index);
    });
}

export async function openJsonEditor(messageId) {
    const messageElement = $(`.mes[mesid="${messageId}"]`);
    if (!messageElement.length) {
        toastr.error('Сообщение не найдено');
        return;
    }
    
    const swipeId = messageElement.attr('swipeid');
    if (swipeId === undefined) {
        toastr.error('Не удалось определить свайп');
        return;
    }
    
    const swipeKey = `${messageId}_${swipeId}`;
    
    const swipeData = NarrativeStorage.loadSwipeData(swipeKey);
    const infoBlocks = NarrativeStorage.getMessageBlocks(String(messageId));
    
    const settings = getSettings();
    
    const fullData = {
        trackers: swipeData?.trackerValues || {},
        characters: swipeData?.characters 
            ? Object.entries(swipeData.characters).map(([name, data]) => ({ 
                name, 
                outfit: data.outfit || "", 
                state: data.state || "", 
                thoughts: data.thoughts || "" 
              }))
            : [],
        datetime: swipeData?.infoBlocks?.datetime || "",
    };
    
    settings.promptBlocks.forEach(b => {
        fullData[b.id] = infoBlocks[b.id] || swipeData?.infoBlocks?.[b.id] || "";
    });

    const editorHtml = $(`
        <div class="nhud-json-editor">
            <h3 style="margin-bottom:15px;">📦 JSON Editor — Сообщение #${messageId} · Свайп #${swipeId}</h3>
            <div style="margin-bottom:10px; color:#606080; font-size:0.85em;">
                Редактируй данные для этого свайпа. Сохранение применит изменения к HUD.
            </div>
            <textarea id="nhud-json-editor-textarea" class="nhud-json-editor-textarea" rows="20" style="width:100%; font-family:monospace;">${
                JSON.stringify(fullData, null, 2)
            }</textarea>
            <div style="display:flex; gap:10px; margin-top:15px; justify-content:flex-end;">
                <button id="nhud-json-editor-validate" class="menu_button">🔍 Validate</button>
                <button id="nhud-json-editor-format" class="menu_button">✨ Format</button>
            </div>
            <div style="margin-top:10px; font-size:0.8em; color:#505070; text-align:right;">
                Последнее обновление: ${new Date().toLocaleTimeString()}
            </div>
        </div>
    `);
    
    setTimeout(() => {
        editorHtml.find('#nhud-json-editor-validate').on('click', () => {
            try { 
                JSON.parse(editorHtml.find('#nhud-json-editor-textarea').val()); 
                toastr.success('✅ JSON валидный!'); 
            } catch (e) { 
                toastr.error('❌ ' + e.message); 
            }
        });
        
        editorHtml.find('#nhud-json-editor-format').on('click', () => {
            const ta = editorHtml.find('#nhud-json-editor-textarea');
            try { 
                ta.val(JSON.stringify(JSON.parse(ta.val()), null, 2)); 
                toastr.success('✨ Отформатировано'); 
            } catch (e) { 
                toastr.error('Ошибка форматирования'); 
            }
        });
    }, 100);
    
    const result = await callPopup(editorHtml, 'confirm', null, {
        okButton: '💾 Сохранить',
        cancelButton: 'Отмена',
        wide: true
    });
    
    if (result) {
        try {
            const newData = JSON.parse(editorHtml.find('#nhud-json-editor-textarea').val());
            
            const blocksToSave = {};
            settings.promptBlocks.forEach(b => {
                if (newData[b.id]) blocksToSave[b.id] = newData[b.id];
            });
            if (Object.keys(blocksToSave).length > 0) {
                NarrativeStorage.saveMessageBlocks(String(messageId), blocksToSave);
            }
            
            const charsObj = {};
            if (Array.isArray(newData.characters)) {
                newData.characters.forEach(c => {
                    if (c.name) {
                        charsObj[c.name] = { 
                            outfit: c.outfit || "", 
                            state: c.state || "", 
                            thoughts: c.thoughts || "" 
                        };
                    }
                });
            }
            
            NarrativeStorage.saveSwipeData(swipeKey, {
                trackerValues: newData.trackers || {},
                characters: charsObj,
                infoBlocks: { ...blocksToSave, datetime: newData.datetime || "" }
            });
            
            applyJsonUpdate(newData, messageId, parseInt(swipeId));
            
            toastr.success('Данные сохранены и применены!');
            $(`.mes[mesid="${messageId}"] .nhud-json-edit`).css('opacity', '1');
            
        } catch (e) {
            toastr.error('Ошибка: ' + e.message);
        }
    }
}

export function extractDataFromText(messageId) {
    const ctx = getSTContext();
    if (!ctx?.chat?.[messageId]) return;
    
    const text = ctx.chat[messageId].mes;
    const extractedData = { characters: [] };
    const charMap = {};

    const addCharData = (name, key, value) => {
        const cleanName = name.trim();
        if (!charMap[cleanName]) charMap[cleanName] = { name: cleanName };
        charMap[cleanName][key] = value.trim();
    };

    const costumeRegex = /costume:\s*([^=]+?)\s*=\s*(.+?)(?=\n|$)/gi;
    let match;
    while ((match = costumeRegex.exec(text)) !== null) addCharData(match[1], 'outfit', match[2]);

    const moodRegex = /mood:\s*([^=]+?)\s*=\s*(.+?)(?=\n|$)/gi;
    while ((match = moodRegex.exec(text)) !== null) addCharData(match[1], 'state', match[2]);

    const relRegex = /relationship:\s*([^=]+?)\s*=\s*(\d+)/gi;
    while ((match = relRegex.exec(text)) !== null) addCharData(match[1], 'relationship', parseInt(match[2]));

    const relStatusRegex = /relationship_status:\s*([^=]+?)\s*=\s*(.+?)(?=\n|$)/gi;
    while ((match = relStatusRegex.exec(text)) !== null) addCharData(match[1], 'relationship_status', match[2]);

    extractedData.characters = Object.values(charMap);

    if (extractedData.characters.length > 0) {
        const swipeId = getCurrentSwipeId(messageId);
        applyJsonUpdate(extractedData, messageId, swipeId);
        toastr.success(`Успешно извлечены данные для ${extractedData.characters.length} перс.`);
    } else {
        toastr.warning("Не найдено данных в формате 'ключ:Имя=значение'");
    }
}