// components\settings\ProfileSettings.js
// Вынесено из _SettingsUI.internal.js (renderSettingsProfileSelect)

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
export function renderSettingsProfileSelect() {
    const settings = getSettings();
    const sel = $("#nhud-settings-profile-select");
    if (!sel.length) return;
    sel.empty();
    
    const isLight = settings.requestSettings?.lightMode;
    
    if (isLight) {
        sel.append(`<option value="__quiet__" disabled>вќЊ РўРµРєСѓС‰РµРµ РїРѕРґРєР»СЋС‡РµРЅРёРµ ST (РќРµРґРѕСЃС‚СѓРїРЅРѕ РІ Р›Р°Р№С‚-СЂРµР¶РёРјРµ)</option>`);
    } else {
        sel.append(`<option value="__quiet__" ${!settings.useSTProfile ? 'selected' : ''}>рџ”„ РўРµРєСѓС‰РµРµ РїРѕРґРєР»СЋС‡РµРЅРёРµ ST</option>`);
    }
    
    getSTProfiles().forEach(p => {
        const selected = settings.useSTProfile && settings.activeProfile === p.name ? 'selected' : '';
        sel.append(`<option value="${p.name}" ${selected}>${p.name} (${p.api || '?'})</option>`);
    });
}

