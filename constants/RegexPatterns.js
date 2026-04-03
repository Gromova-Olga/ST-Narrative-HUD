// constants/RegexPatterns.js

export const REGEX_PATTERNS = {
    // Извлечение JSON из тегов
    jsonInTags: (openTag, closeTag) => {
        const openEscaped = openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const closeEscaped = closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`${openEscaped}\\s*(\\{[\\s\\S]*?\\})\\s*${closeEscaped}`, 'i');
    },

    // Удаление тегов из сообщения
    removeTags: (openTag, closeTag) => {
        const openEscaped = openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const closeEscaped = closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`${openEscaped}[\\s\\S]*?${closeEscaped}`, 'gi');
    },

    // Незакрытые теги
    unclosedTag: (openTag) => {
        const openEscaped = openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`${openEscaped}[\\s\\S]*$`, 'i');
    },

    // JSON-блоки в details
    detailsWithJson: (openTag, closeTag) => {
        const openEscaped = openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const closeEscaped = closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`<details(?:[^>]*)>\\s*(?:<summary(?:[^>]*)>.*?<\\/summary>)?\\s*${openEscaped}[\\s\\S]*?${closeEscaped}\\s*<\\/details>`, 'gi');
    },

    // Блоки кода с JSON
    jsonCodeBlock: /```json[\s\S]*?```/gi,
    codeBlockWithJson: /```[\s\S]*?\{[\s\S]*\}[\s\S]*?```/gi,

    // HTML-теги
    htmlTags: /<[^>]+>/gm,
    htmlEntities: /&[a-z0-9#]+;/gi,

    // Имена персонажей (для мэтчинга)
    charName: /^[A-Za-zА-Яа-яЁё0-9_\-\s]+$/,

    // Форматирование текста
    markdown: {
        bold: /\*\*(.*?)\*\*/g,
        italic: /\*(.*?)\*/g,
        code: /`(.*?)`/g,
        link: /\[([^\]]+)\]\(([^)]+)\)/g,
    },
};
