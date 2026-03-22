// utils/helpers.js

export function getSTContext() {
    try { return SillyTavern.getContext(); } catch(e) { return {}; }
}

export function getUserName() {
    return getSTContext().name1 || "";
}

export function getCharName() {
    return getSTContext().name2 || "";
}

export function getCharAvatar() {
    try {
        const ctx = getSTContext();
        const charName = ctx.name2;
        const char = ctx.characters?.find(c => c.name === charName);
        if (char?.avatar) {
            return `/thumbnail?type=avatar&file=${encodeURIComponent(char.avatar)}`;
        }
        return "";
    } catch(e) { return ""; }
}

export function showStatus(message, type) {
    $("#nhud-api-status").text(message).attr('data-type', type || 'info');
}

export function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripHtml(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/<[^>]+>/gm, '').replace(/&[a-z0-9#]+;/gi, ' ').trim();
}

export function parseJsonFromMessage(text, openTag, closeTag) {
    if (!text) return null;
    const openEscaped = escapeRegex(openTag);
    const closeEscaped = escapeRegex(closeTag);
    
    const regex = new RegExp(`${openEscaped}\\s*(\\{[\\s\\S]*?\\})\\s*${closeEscaped}`, 'i');
    const match = text.match(regex);
    
    if (match) {
        try { return JSON.parse(match[1]); } catch(e) { console.warn("[NHUD] Failed to parse JSON from tags:", e); }
    }
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try { return JSON.parse(jsonMatch[0]); } catch(e) { return null; }
    }
    return null;
}

export function removeTagsFromMessage(text, openTag, closeTag) {
    if (!text) return text;
    const openEscaped = escapeRegex(openTag);
    const closeEscaped = escapeRegex(closeTag);

    // Стандартное удаление по тегам (как было)
    const detailsRegex = new RegExp(`<details(?:[^>]*)>\\s*(?:<summary(?:[^>]*)>.*?<\\/summary>)?\\s*${openEscaped}[\\s\\S]*?${closeEscaped}\\s*<\\/details>`, 'gi');
    let cleaned = text.replace(detailsRegex, '');

    const regex = new RegExp(`${openEscaped}[\\s\\S]*?${closeEscaped}`, 'gi');
    cleaned = cleaned.replace(regex, '').trim();

    const unclosedRegex = new RegExp(`${openEscaped}[\\s\\S]*$`, 'i');
    cleaned = cleaned.replace(unclosedRegex, '').trim();

    // НОВОЕ: Беспощадно вырезаем блоки кода от ИИ (с JSON и без)
    cleaned = cleaned.replace(/```json[\s\S]*?```/gi, '').trim();
    cleaned = cleaned.replace(/```[\s\S]*?\{[\s\S]*\}[\s\S]*?```/gi, '').trim();

    return cleaned;
}

export function findCharacterKey(characters, targetName) {
    if (characters[targetName]) return targetName;
    const targetLower = targetName.toLowerCase();
    for (const key of Object.keys(characters)) {
        if (key.toLowerCase() === targetLower) return key;
    }
    const targetFirstName = targetLower.split(/\s+/)[0];
    for (const key of Object.keys(characters)) {
        const keyFirstName = key.toLowerCase().split(/\s+/)[0];
        if (targetFirstName === keyFirstName && targetFirstName.length > 3) {
            return key;
        }
    }
    return null;
}

export function getCurrentSwipeId(messageId) {
    const ctx = getSTContext();
    if (ctx?.chat?.[messageId] && ctx.chat[messageId].swipe_id !== undefined) {
        return ctx.chat[messageId].swipe_id;
    }
    const mesEl = document.querySelector(`.mes[mesid="${messageId}"]`);
    if (mesEl) {
        const swipeId = mesEl.getAttribute('swipeid');
        return swipeId !== null ? parseInt(swipeId) : 0;
    }
    return 0;
}

export function getCurrentMessageInfo() {
    const ctx = getSTContext();
    if (!ctx?.chat?.length) return { msgId: null, swipeId: null, key: null };
    
    let lastBotIndex = -1;
    for (let i = ctx.chat.length - 1; i >= 0; i--) {
        if (!ctx.chat[i].is_user && !ctx.chat[i].is_system) {
            lastBotIndex = i;
            break;
        }
    }
    
    if (lastBotIndex === -1) return { msgId: null, swipeId: null, key: null };
    const swipeId = getCurrentSwipeId(lastBotIndex);
    return { msgId: String(lastBotIndex), swipeId: swipeId, key: `${lastBotIndex}_${swipeId}` };
}

export function getSTProfiles() {
    try { return getSTContext().extensionSettings?.connectionManager?.profiles || []; }
    catch(e) { return []; }
}

// --- Вспомогательная функция для красивого рендера текста ---
export function formatPopupText(text) {
    if (!text) return '<i style="color:#555">Нет данных</i>';
    return String(text)
        .split('\n')
        .filter(line => line.trim() !== '') // Убираем пустые строки
        .map(line => `<div style="margin-bottom:8px; line-height:1.4;">${
            line.replace(/\*\*(.*?)\*\*/g, '<b style="color:var(--nhud-text-main, #e0b0b0);">$1</b>') // Жирный текст
                .replace(/\*(.*?)\*/g, '<i>$1</i>') // Курсив
        }</div>`)
        .join('');
}
