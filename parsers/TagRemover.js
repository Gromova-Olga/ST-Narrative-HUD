// parsers/TagRemover.js
import { escapeRegex } from "../utils/string/StringCleaner.js";

export class TagRemover {
    /**
     * Удалить теги из сообщения
     */
    removeTags(text, openTag, closeTag) {
        if (!text) return text;

        const openEscaped = escapeRegex(openTag);
        const closeEscaped = escapeRegex(closeTag);

        // Удаляем теги внутри details
        const detailsRegex = new RegExp(
            `<details(?:[^>]*)>\\s*(?:<summary(?:[^>]*)>.*?<\\/summary>)?\\s*${openEscaped}[\\s\\S]*?${closeEscaped}\\s*<\\/details>`,
            'gi'
        );
        let cleaned = text.replace(detailsRegex, '');

        // Удаляем сами теги
        const tagRegex = new RegExp(`${openEscaped}[\\s\\S]*?${closeEscaped}`, 'gi');
        cleaned = cleaned.replace(tagRegex, '').trim();

        // Удаляем незакрытые теги
        const unclosedRegex = new RegExp(`${openEscaped}[\\s\\S]*$`, 'i');
        cleaned = cleaned.replace(unclosedRegex, '').trim();

        // Удаляем code blocks с JSON
        cleaned = cleaned.replace(/```json[\s\S]*?```/gi, '').trim();
        cleaned = cleaned.replace(/```[\s\S]*?\{[\s\S]*\}[\s\S]*?```/gi, '').trim();

        return cleaned;
    }

    /**
     * Удалить только JSON блок, оставив остальной текст
     */
    removeJsonBlock(text, openTag, closeTag) {
        if (!text) return text;

        const openEscaped = escapeRegex(openTag);
        const closeEscaped = escapeRegex(closeTag);

        const regex = new RegExp(`${openEscaped}[\\s\\S]*?${closeEscaped}`, 'gi');
        return text.replace(regex, '').trim();
    }

    /**
     * Проверить, содержит ли текст теги
     */
    hasTags(text, openTag, closeTag) {
        if (!text) return false;

        const openEscaped = escapeRegex(openTag);
        const regex = new RegExp(openEscaped, 'i');
        return regex.test(text);
    }
}