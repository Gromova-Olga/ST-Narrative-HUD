// messages/MessageWriter.js

/**
 * Запись и модификация сообщений SillyTavern
 * 
 * Управляет:
 * - Очисткой тегов из сообщений
 * - Сохранением данных в swipeData
 * - Модификацией DOM сообщений
 */

import { eventBus } from '../core/EventBus.js';
import { getMessageTextFromDOM, getMessageHtmlFromDOM, setMessageHtmlInDOM } from './MessageReader.js';

/**
 * Очищает теги из текста и HTML сообщения
 * @param {string|number} messageId
 * @param {string} openTag
 * @param {string} closeTag
 * @param {Object} messageObj - объект message из ST chat (для мутации .mes)
 * @returns {{ textChanged: boolean, htmlChanged: boolean }}
 */
export function cleanMessageTags(messageId, openTag, closeTag, messageObj) {
    let textChanged = false;
    let htmlChanged = false;

    // Очищаем DOM
    const el = document.querySelector(`.mes[mesid="${messageId}"] .mes_text`);
    if (el) {
        const rawHtml = el.innerHTML;
        const cleaned = removeTagOccurrences(rawHtml, openTag, closeTag);
        if (cleaned !== rawHtml) {
            el.innerHTML = cleaned;
            htmlChanged = true;
        }
    }

    // Очищаем объект message.mes
    if (messageObj?.mes && messageObj.mes.includes(openTag)) {
        const cleanedText = removeTagOccurrences(messageObj.mes, openTag, closeTag);
        if (cleanedText !== messageObj.mes) {
            messageObj.mes = cleanedText;
            textChanged = true;
        }
    }

    if (textChanged || htmlChanged) {
        eventBus.emit('message:cleaned', { messageId, textChanged, htmlChanged });
    }

    return { textChanged, htmlChanged };
}

/**
 * Удаляет вхождения тегов из текста (безопасная версия removeTagsFromMessage)
 */
function removeTagOccurrences(text, openTag, closeTag) {
    if (!text) return text;

    const openEscaped = escapeRegex(openTag);
    const closeEscaped = escapeRegex(closeTag);

    // Удаляем details с JSON
    const detailsRegex = new RegExp(
        `<details(?:[^>]*)>\\s*(?:<summary(?:[^>]*)>.*?<\\/summary>)?\\s*${openEscaped}[\\s\\S]*?${closeEscaped}\\s*<\\/details>`,
        'gi'
    );
    let cleaned = text.replace(detailsRegex, '');

    // Удаляем теги
    const regex = new RegExp(`${openEscaped}[\\s\\S]*?${closeEscaped}`, 'gi');
    cleaned = cleaned.replace(regex, '').trim();

    // Удаляем незакрытые теги
    const unclosedRegex = new RegExp(`${openEscaped}[\\s\\S]*$`, 'i');
    cleaned = cleaned.replace(unclosedRegex, '').trim();

    // Удаляем code blocks с JSON
    cleaned = cleaned.replace(/```json[\s\S]*?```/gi, '').trim();
    cleaned = cleaned.replace(/```[\s\S]*?\{[\s\S]*\}[\s\S]*?```/gi, '').trim();

    return cleaned;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Перезаписывает текст сообщения в DOM
 * @param {string|number} messageId
 * @param {string} newText
 */
export function overwriteMessageText(messageId, newText) {
    setMessageHtmlInDOM(messageId, newText);
    eventBus.emit('message:overwritten', { messageId });
}

/**
 * Проверяет, содержит ли сообщение указанные теги
 * @param {string} text
 * @param {string} openTag
 * @returns {boolean}
 */
export function messageContainsTags(text, openTag) {
    if (!text || !openTag) return false;
    return text.includes(openTag);
}
