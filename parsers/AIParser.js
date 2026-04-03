// parsers/AIParser.js
import { JsonExtractor } from "./JsonExtractor.js";
import { TagRemover } from "./TagRemover.js";
import { CharacterExtractor } from "./CharacterExtractor.js";
import { TrackerExtractor } from "./TrackerExtractor.js";
import { InfoBlockExtractor } from "./InfoBlockExtractor.js";
import { GameEventExtractor } from "./GameEventExtractor.js";

export const AIParser = {
    _jsonExtractor: new JsonExtractor(),
    _tagRemover: new TagRemover(),
    _charExtractor: new CharacterExtractor(),
    _trackerExtractor: new TrackerExtractor(),
    _infoExtractor: new InfoBlockExtractor(),
    _eventExtractor: new GameEventExtractor(),

    /**
     * Парсит JSON ответ от ИИ
     */
    parseAIResponse(rawText, openTag = null, closeTag = null) {
        return this._jsonExtractor.extract(rawText, openTag, closeTag);
    },

    /**
     * Удаляет теги из сообщения
     */
    removeTags(text, openTag, closeTag) {
        return this._tagRemover.removeTags(text, openTag, closeTag);
    },

    /**
     * Проверяет наличие тегов
     */
    hasTags(text, openTag, closeTag) {
        return this._tagRemover.hasTags(text, openTag, closeTag);
    },

    /**
     * Извлекает персонажей из ответа
     */
    extractCharacters(parsedData, userName = null) {
        return this._charExtractor.extract(parsedData?.characters, userName);
    },

    /**
     * Извлекает инфоблоки
     */
    extractInfoBlocks(parsedData, blockIds = []) {
        const result = this._infoExtractor.extract(parsedData, blockIds);
        const dateTime = this._infoExtractor.extractDateTime(parsedData);
        return { ...result, ...dateTime };
    },

    /**
     * Извлекает значения трекеров
     */
    extractTrackers(parsedData, trackerConfig) {
        return this._trackerExtractor.extract(parsedData?.trackers, trackerConfig);
    },

    /**
     * Извлекает достижение
     */
    extractAchievement(parsedData) {
        return this._eventExtractor.extractAchievement(parsedData);
    },

    /**
     * Извлекает XP
     */
    extractXp(parsedData) {
        return this._eventExtractor.extractXp(parsedData);
    },

    /**
     * Извлекает квесты
     */
    extractQuests(parsedData) {
        return this._eventExtractor.extractQuests(parsedData);
    },

    /**
     * Извлекает запись в кодекс
     */
    extractCodex(parsedData) {
        return this._eventExtractor.extractCodex(parsedData);
    },

    /**
     * Извлекает фракции
     */
    extractFactions(parsedData) {
        return this._eventExtractor.extractFactions(parsedData);
    },

    /**
     * Извлекает событие календаря
     */
    extractCalendarEvent(parsedData) {
        return this._eventExtractor.extractCalendarEvent(parsedData);
    },

    /**
     * Извлекает datetime
     */
    extractDateTime(parsedData) {
        return this._infoExtractor.extractDateTime(parsedData);
    }
};