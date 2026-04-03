// parsers/JsonExtractor.js
import { escapeRegex } from "../utils/string/StringCleaner.js";
import { JSON_OBJECT_REGEX, JSON_CODE_BLOCK_REGEX, THINK_TAG_REGEX } from "../constants/RegexPatterns.js";

export class JsonExtractor {
    /**
     * Извлечь JSON из текста с тегами
     */
    extractWithTags(text, openTag, closeTag) {
        if (!text) return null;

        const openEscaped = escapeRegex(openTag);
        const closeEscaped = escapeRegex(closeTag);
        const regex = new RegExp(`${openEscaped}\\s*(\\{[\\s\\S]*?\\})\\s*${closeEscaped}`, 'i');
        const match = text.match(regex);

        if (match) {
            try {
                return JSON.parse(match[1]);
            } catch (e) {
                console.warn('[JsonExtractor] Failed to parse JSON from tags:', e);
            }
        }
        return null;
    }

    /**
     * Извлечь JSON из текста (без тегов)
     */
    extractRaw(text) {
        if (!text) return null;

        const jsonMatch = text.match(JSON_OBJECT_REGEX);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Извлечь JSON из code block
     */
    extractFromCodeBlock(text) {
        if (!text) return null;

        const match = text.match(JSON_CODE_BLOCK_REGEX);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1].trim());
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Очистить текст от мусора перед парсингом
     */
    cleanText(text) {
        if (!text) return '';

        let cleaned = text
            .replace(THINK_TAG_REGEX, '')
            .replace(/```json|```/gi, '')
            .trim();

        return cleaned;
    }

    /**
     * Основной метод извлечения JSON
     */
    extract(text, openTag = null, closeTag = null) {
        if (!text) return null;

        // Если есть теги, сначала пробуем с ними
        if (openTag && closeTag) {
            const withTags = this.extractWithTags(text, openTag, closeTag);
            if (withTags) return withTags;
        }

        // Пробуем из code block
        const fromCodeBlock = this.extractFromCodeBlock(text);
        if (fromCodeBlock) return fromCodeBlock;

        // Очищаем текст
        const cleaned = this.cleanText(text);

        // Пробуем извлечь сырой JSON
        const raw = this.extractRaw(cleaned);
        if (raw) return raw;

        return null;
    }
}