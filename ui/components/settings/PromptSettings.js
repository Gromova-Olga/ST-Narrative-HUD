// components\settings\PromptSettings.js
// �������� �� _SettingsUI.internal.js (renderParserSettings, renderPromptBlocks)

import { getSettings, getLive, getChatTrackers } from '../../../core/StateManager.js';
import { NarrativeStorage } from '../../../storage/NarrativeStorage.js';
import { getContext } from '../../../integration/STContextProvider.js';
import { saveSettingsDebounced } from '../../../../../../script.js';
import { openRelationshipJournal, openAnalyticsPopup } from '../../Modals.js';
import { updateHistoryButtons } from '../../MessageActions.js';
import { renderTrackers, renderRelationships, renderCharacters, renderInfoBlockButtons, renderProfileSelect, applyDesignTheme, renderMiniSims } from '../../UIManager.js';
import { updateSettingsPosition, openSettingsPanel, closeSettingsPanel } from '../../_SettingsUI.internal.js';

function getUserName() { return getContext().name1 || ''; }
function getSTProfiles() { return getContext().extensionSettings?.connectionManager?.profiles || []; }
export function renderParserSettings() {
    const settings = getSettings();
    $("#nhud-parser-enabled").prop("checked", settings.jsonParser.enabled);
    $("#nhud-parser-open-tag").val(settings.jsonParser.openTag);
    $("#nhud-parser-close-tag").val(settings.jsonParser.closeTag);
    $("#nhud-parser-auto-remove").prop("checked", settings.jsonParser.autoRemoveTags);
}

export function renderSettingsCharacterAccordion() {
    const container = $("#nhud-settings-char-accordion");
    container.empty();

    const settings = extension_settings[extensionName] || {};
    const chatData = settings.chatData || {};
    const userName = getUserName();

    if (Object.keys(chatData).length === 0) {
        container.append('<div class="nhud-hint">Нет данных по чатам.</div>');
        return;
    }

    Object.entries(chatData).forEach(([chatId, data]) => {
        const chars = data.liveData?.characters || {};
        const charNames = Object.keys(chars).filter(name => 
            name.toLowerCase() !== userName.toLowerCase() &&
            !name.toLowerCase().includes('system')
        );
        if (!charNames.length) return;

        const shortId = chatId.length > 40 ? chatId.substring(0, 40) + '…' : chatId;
        const accordion = $(`
            <div class="nhud-accordion">
                <div class="nhud-accordion-header" style="display:flex; align-items:center; gap:8px;">
                    <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${chatId}">💬 ${shortId}</span>
                    <span class="nhud-accordion-count">${charNames.length} перс.</span>
                    <button class="nhud-rename-chat-btn" data-chat="${chatId}" title="Перепривязать к новому имени чата" style="padding:2px 6px; background:rgba(80,140,80,0.3); border:1px solid #286a28; border-radius:4px; color:#60c060; cursor:pointer;">✏️</button>
                    <button class="nhud-s-delete nhud-delete-chat-btn" data-chat="${chatId}" title="Удалить данные чата" style="padding:2px 6px;">🗑️</button>
                    <span class="nhud-accordion-arrow">▼</span>
                </div>
                <div class="nhud-accordion-body" style="display:none;"></div>
            </div>
        `);

        accordion.find('.nhud-delete-chat-btn').on('click', function(e) {
            e.stopPropagation();
            if (confirm('Точно удалить все данные мода для этого чата?')) {
                NarrativeStorage.deleteChat($(this).data('chat'));
                renderSettingsCharacterAccordion();
            }
        });

        accordion.find('.nhud-rename-chat-btn').on('click', function(e) {
            e.stopPropagation();
            const oldId = $(this).data('chat');
            const newId = prompt('Введи новое название чата (как оно теперь называется в ST), чтобы перенести данные:', oldId);
            
            if (newId && newId !== oldId) {
                if (settings.chatData[newId]) {
                    alert('Ошибка: Чат с таким именем уже существует в базе расширения!');
                    return;
                }
                settings.chatData[newId] = settings.chatData[oldId];
                delete settings.chatData[oldId];
                
                extension_settings[extensionName] = settings;
                saveSettingsDebounced();
                renderSettingsCharacterAccordion();
                toastr.success('Данные успешно перепривязаны!');
            }
        });

        const body = accordion.find('.nhud-accordion-body');

        charNames.forEach(name => {
            body.append(buildCharEditBlock(name, chars[name], settings, chatId, data));
        });

        const addRow = $(`
            <div style="padding:8px;">
                <div style="display:flex;gap:6px;">
                    <input class="nhud-acc-add-name nhud-input" type="text" placeholder="Имя нового персонажа..." style="flex:1;" />
                    <button class="nhud-add-btn nhud-acc-add-btn" style="margin:0;white-space:nowrap;">+ Добавить</button>
                </div>
            </div>
        `);

        addRow.find('.nhud-acc-add-btn').on('click', function() {
            const name = addRow.find('.nhud-acc-add-name').val().trim();
            if (!name) return;
            if (!data.liveData) data.liveData = { trackerValues: {}, characters: {} };
            if (!data.liveData.characters) data.liveData.characters = {};
            data.liveData.characters[name] = { outfit: { head: "", torso: "", legs: "", feet: "", accessories: "" }, state: "", thoughts: "" };
            extension_settings[extensionName] = settings;
            saveSettingsDebounced();
            renderSettingsCharacterAccordion();
            if (chatId === NarrativeStorage.getCurrentChatId()) {
                getSettings().liveData.characters[name] = { outfit: { head: "", torso: "", legs: "", feet: "", accessories: "" }, state: "", thoughts: "" };
                renderCharacters();
            }
        });

        body.append(addRow);

        if (data.liveData?.ignoredCharacters && data.liveData.ignoredCharacters.length > 0) {
            const unignoreRow = $(`
                <div style="padding:8px; border-top:1px dashed #3a1525; margin-top:8px;">
                    <div style="font-size:0.7em; color:#a08080; margin-bottom:6px;">В игноре (нажми, чтобы вернуть):</div>
                    <div class="nhud-ignored-list" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
                </div>
            `);
            
            const ignoredContainer = unignoreRow.find('.nhud-ignored-list');
            
            data.liveData.ignoredCharacters.forEach(ignoredName => {
                const badge = $(`
                    <button class="nhud-unignore-single-btn" title="Вернуть ${ignoredName} в HUD" style="background:rgba(82, 168, 224, 0.15); border:1px solid #3a5a80; color:#80b0e0; border-radius:4px; padding:3px 8px; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; transition:0.2s;" onmouseover="this.style.background='rgba(82, 168, 224, 0.3)'" onmouseout="this.style.background='rgba(82, 168, 224, 0.15)'">
                        👻 ${ignoredName}
                    </button>
                `);
                
                badge.on('click', function() {
                    data.liveData.ignoredCharacters = data.liveData.ignoredCharacters.filter(n => n !== ignoredName);
                    
                    if (!data.liveData.characters) data.liveData.characters = {};
                    data.liveData.characters[ignoredName] = { outfit: { head: "", torso: "", legs: "", feet: "", accessories: "" }, state: "", thoughts: "" };
                    
                    extension_settings[extensionName] = settings;
                    saveSettingsDebounced();
                    
                    if (chatId === NarrativeStorage.getCurrentChatId()) {
                        getSettings().liveData.ignoredCharacters = getSettings().liveData.ignoredCharacters.filter(n => n !== ignoredName);
                        getSettings().liveData.characters[ignoredName] = { outfit: { head: "", torso: "", legs: "", feet: "", accessories: "" }, state: "", thoughts: "" };
                        
                        renderCharacters();
                        if (typeof renderRelationships === 'function') renderRelationships();
                        if (typeof renderSettingsTrackers === 'function') renderSettingsTrackers();
                    }
                    
                    renderSettingsCharacterAccordion();
                    toastr.success(`${ignoredName} возвращен из призраков!`);
                });
                
                ignoredContainer.append(badge);
            });

            body.append(unignoreRow);
        }

        accordion.find('.nhud-accordion-header').on('click', function() {
            body.toggle();
            accordion.find('.nhud-accordion-arrow').text(body.is(':visible') ? '▲' : '▼');
        });

        container.append(accordion);
    });
}

export function buildCharEditBlock(name, liveData, settings, chatId, data) {
    const globalChar = (settings.characters || []).find(
        c => c.name?.toLowerCase() === name.toLowerCase()
    ) || {};

    const block = $(`
        <div class="nhud-accordion-char-edit">
            <div class="nhud-accordion-char-top">
                <div class="nhud-char-avatar-wrap" style="width:40px;height:40px;flex-shrink:0;">
                    <img src="${globalChar.avatar || ''}"
                         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                         style="${globalChar.avatar ? '' : 'display:none;'}width:100%;height:100%;object-fit:cover;border-radius:4px;"/>
                    <div style="${globalChar.avatar ? 'display:none;' : 'display:flex;'}width:100%;height:100%;background:#1a1628;border-radius:4px;align-items:center;justify-content:center;color:#6060a0;font-weight:bold;">
                        ${name[0].toUpperCase()}
                    </div>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.85em;color:#c0b0d8;font-weight:bold;margin-bottom:4px;">${name}</div>
                    ${liveData?.outfit ? (() => { const o = liveData.outfit; if (typeof o === 'object') { const worn = Object.values(o).filter(v => v && typeof v === 'string').map(v => v.substring(0,30)); return worn.length ? `<div style="font-size:0.7em;color:#7070a0;">👗 ${worn.join(', ').substring(0,60)}</div>` : ''; } else if (typeof o === 'string') { return `<div style="font-size:0.7em;color:#7070a0;">👗 ${o.substring(0,60)}</div>`; } return ''; })() : ''}
                    ${liveData?.state  ? `<div style="font-size:0.7em;color:#909090;">${liveData.state.substring(0,70)}${liveData.state.length>70?'…':''}</div>` : ''}
                </div>
                ${liveData?.isHiddenFromScene ? `<button class="nhud-acc-return-scene" title="Вернуть персонажа в сцену (на экраны)" style="flex-shrink:0; margin-left:4px; background:none; border:none; cursor:pointer; font-size:14px;">🏃</button>` : ''}
                <button class="nhud-acc-ghost-char" title="Превратить в призрака 👻 (Добавить в Игнор)" style="flex-shrink:0; margin-left:4px; background:none; border:none; cursor:pointer; font-size:14px; opacity:0.7; transition:0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">👻</button>
                <button class="nhud-acc-delete-char nhud-s-delete" title="Просто удалить из текущего кэша" style="flex-shrink:0;margin-left:4px;">✕</button>
            </div>
            <div class="nhud-accordion-char-avatar-edit">
                <label style="font-size:0.72em;color:#505070;text-transform:uppercase;letter-spacing:0.05em;">Аватар</label>
                <div class="nhud-avatar-row" style="margin-top:4px;">
                    <div class="nhud-avatar-btns">
                        <input class="nhud-acc-avatar-url nhud-input" type="text"
                               placeholder="URL..."
                               value="${globalChar.avatar && !globalChar.avatar.startsWith('data:') ? globalChar.avatar : ''}" />
                        <label class="nhud-file-btn" style="margin-top:4px;">
                            📁 С компа
                            <input class="nhud-acc-avatar-file" type="file" accept="image/*" style="display:none;" />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `);

    block.find('.nhud-acc-delete-char').on('click', () => {
        if (!confirm(`Просто удалить ${name} из чата? (Он снова появится, если ИИ его упомянет)`)) return;
        delete data.liveData.characters[name];
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
        if (chatId === NarrativeStorage.getCurrentChatId()) {
            delete getSettings().liveData.characters[name];
            renderCharacters();
        }
        renderSettingsCharacterAccordion();
    });

    block.find('.nhud-acc-return-scene').on('click', () => {
        liveData.isHiddenFromScene = false;
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
        if (chatId === NarrativeStorage.getCurrentChatId()) {
            getSettings().liveData.characters[name].isHiddenFromScene = false;
            renderCharacters();
            if (typeof renderRelationships === 'function') renderRelationships();
            if (typeof renderSettingsTrackers === 'function') renderSettingsTrackers();
        }
        renderSettingsCharacterAccordion();
    });

    block.find('.nhud-acc-ghost-char').on('click', () => {
        if (!confirm(`Превратить ${name} в призрака 👻?\nМод навсегда перестанет замечать этого персонажа в этом чате.`)) return;
        
        delete data.liveData.characters[name];
        
        if (!data.liveData.ignoredCharacters) data.liveData.ignoredCharacters = [];
        if (!data.liveData.ignoredCharacters.includes(name)) data.liveData.ignoredCharacters.push(name);
        
        extension_settings[extensionName] = settings;
        saveSettingsDebounced();
        
        if (chatId === NarrativeStorage.getCurrentChatId()) {
            delete getSettings().liveData.characters[name];
            if (!getSettings().liveData.ignoredCharacters) getSettings().liveData.ignoredCharacters = [];
            if (!getSettings().liveData.ignoredCharacters.includes(name)) getSettings().liveData.ignoredCharacters.push(name);
            renderCharacters();
            if (typeof renderRelationships === 'function') renderRelationships();
        }
        renderSettingsCharacterAccordion();
    });

    block.find('.nhud-acc-avatar-url').on('input', function() {
        const url = $(this).val();
        updateGlobalAvatar(name, url);
        block.find('img').attr('src', url).show();
        block.find('div[style*="display:flex"]').hide();
        renderCharacters();
    });

    block.find('.nhud-acc-avatar-file').on('change', function() {
        const file = this.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            updateGlobalAvatar(name, base64);
            block.find('.nhud-acc-avatar-url').val('');
            block.find('img').attr('src', base64).show();
            block.find('div[style*="display:flex"]').hide();
            renderCharacters();
        };
        reader.readAsDataURL(file);
    });

    return block;
}

export function renderPromptBlocks() {
    const settings = getSettings();
    const list = $("#nhud-prompt-blocks-list");
    list.empty();

    settings.promptBlocks.forEach((block, idx) => {
        const row = $(`
            <div class="nhud-prompt-block-row">
                <div class="nhud-prompt-block-header">
                    <input class="nhud-pb-enabled" type="checkbox" ${block.enabled ? 'checked' : ''} title="Включить блок" />
                    <input class="nhud-pb-label nhud-input" type="text" placeholder="Название" value="${block.label}" style="flex:1;" />
                    <input class="nhud-pb-id nhud-input" type="text" placeholder="id (для JSON)" value="${block.id}" style="width:110px;" title="Ключ в JSON ответе" />
                    <button class="nhud-s-delete nhud-pb-delete">✕</button>
                </div>
                <textarea class="nhud-pb-prompt nhud-textarea" rows="2" placeholder="Промт для этого блока...">${block.prompt}</textarea>
            </div>
        `);

        row.find(".nhud-pb-enabled").on("change", e => {
            settings.promptBlocks[idx].enabled = e.target.checked;
            saveSettingsDebounced(); renderInfoBlockButtons();
        });
        row.find(".nhud-pb-label").on("input", e => {
            settings.promptBlocks[idx].label = e.target.value;
            saveSettingsDebounced(); renderInfoBlockButtons();
        });
        row.find(".nhud-pb-id").on("input", e => {
            settings.promptBlocks[idx].id = e.target.value;
            saveSettingsDebounced();
            renderInfoBlockButtons();
        });
        row.find(".nhud-pb-prompt").on("input", e => {
            settings.promptBlocks[idx].prompt = e.target.value;
            saveSettingsDebounced();
        });
        row.find(".nhud-pb-delete").on("click", () => {
            settings.promptBlocks.splice(idx, 1);
            saveSettingsDebounced(); renderPromptBlocks(); renderInfoBlockButtons();
        });

        list.append(row);
    });
}

