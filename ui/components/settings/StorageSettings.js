// components\settings\StorageSettings.js
// Вынесено из _SettingsUI.internal.js (renderStorageStats)

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
export function renderStorageStats() {
    const stats = NarrativeStorage.getChatStats();
    const usedTypes = NarrativeStorage.getUsedBlockTypes();
    const allChats = Object.keys(extension_settings[extensionName]?.chatData || {}).length;
    const chatId = NarrativeStorage.getCurrentChatId();
    
    $("#nhud-storage-stats").html(`
        <div class="nhud-stat-row"><span>Р§Р°С‚:</span><span style="font-size:0.75em;word-break:break-all;">${chatId || 'вЂ”'}</span></div>
        <div class="nhud-stat-row"><span>РЎРѕРѕР±С‰РµРЅРёР№ СЃ Р±Р»РѕРєР°РјРё:</span><span>${stats.messagesWithBlocks}</span></div>
        <div class="nhud-stat-row"><span>Р Р°Р·РјРµСЂ РґР°РЅРЅС‹С…:</span><span>${stats.estimatedSizeKB} KB</span></div>
        <div class="nhud-stat-row"><span>РўРёРїС‹ Р±Р»РѕРєРѕРІ:</span><span>${usedTypes.join(', ') || 'вЂ”'}</span></div>
        <div class="nhud-stat-row"><span>Р’СЃРµРіРѕ С‡Р°С‚РѕРІ РІ Р±Р°Р·Рµ:</span><span>${allChats}</span></div>
        ${stats.exists ? `<div class="nhud-stat-row"><span>РџРѕСЃР»РµРґРЅРёР№ РґРѕСЃС‚СѓРї:</span><span>${stats.lastAccessed}</span></div>` : ''}
    `);
}

