// systems/characters/CharacterSystem.js

/**
 * Управление персонажами — CRUD и обновления
 * 
 * Обрабатывает данные персонажей из JSON-ответа AI.
 * Публикует события в EventBus.
 */

import { eventBus } from '../../core/EventBus.js';
import { stripHtml } from '../../utils/string/StringCleaner.js';
import { findCharacterKey, deduplicateCharacters } from './CharacterMatcher.js';
import { applyRelationshipUpdate } from './RelationshipCalculator.js';

/**
 * Применяет обновления персонажей из JSON-данных AI
 * @param {Object} jsonData - полный JSON ответ AI
 * @param {string} userName - имя пользователя (для исключения)
 * @param {Object} liveCharacters - объект live.characters
 * @param {Object} relHistory - объект live.relHistory
 * @param {string|number} messageId
 * @param {Array} ignoredCharacters - список игнорируемых
 * @returns {{ characters: Object, changed: boolean }}
 */
export function applyCharactersUpdate(jsonData, userName, liveCharacters, relHistory, messageId, ignoredCharacters = []) {
    if (!jsonData?.characters) return { characters: liveCharacters, changed: false };

    let charsArray = [];
    if (Array.isArray(jsonData.characters)) {
        charsArray = jsonData.characters;
    } else if (typeof jsonData.characters === 'object') {
        charsArray = Object.entries(jsonData.characters).map(([name, data]) => ({ name, ...data }));
    }

    let changed = false;
    const updatedNames = [];

    charsArray.forEach(charData => {
        if (!charData.name) return;
        if (charData.name.toLowerCase() === userName?.toLowerCase()) return;
        if (ignoredCharacters.includes(charData.name.trim())) return;

        const rawName = charData.name.trim();
        const existingKey = findCharacterKey(liveCharacters, rawName);
        const name = existingKey || rawName;

        if (!liveCharacters[name]) {
            liveCharacters[name] = {};
            changed = true;
        }

        liveCharacters[name].isHiddenFromScene = false;

        if (charData.outfit !== undefined && charData.outfit !== '') {
            liveCharacters[name].outfit = stripHtml(charData.outfit);
            changed = true;
        }
        if (charData.state !== undefined && charData.state !== '') {
            liveCharacters[name].state = stripHtml(charData.state);
            changed = true;
        }
        if (charData.thoughts !== undefined && charData.thoughts !== '') {
            liveCharacters[name].thoughts = stripHtml(charData.thoughts);
            changed = true;
        }
        if (charData.emoji !== undefined) {
            liveCharacters[name].emoji = charData.emoji;
        }

        // Отношения
        if (relHistory && relHistory[name] === undefined) {
            relHistory[name] = [];
        }
        const relResult = applyRelationshipUpdate(
            charData,
            liveCharacters[name],
            messageId,
            relHistory?.[name]
        );
        if (relResult.updated) changed = true;

        updatedNames.push(name);
    });

    if (changed) {
        eventBus.emit('characters:updated', {
            names: updatedNames,
            characters: { ...liveCharacters },
        });
    }

    return { characters: liveCharacters, changed };
}

/**
 * Убеждается что текущий персонаж чата есть в live
 */
export function ensureCharacterInLive(charName, userName, liveCharacters, ignoredCharacters = []) {
    if (!charName || charName === userName) return false;
    if (ignoredCharacters.includes(charName)) return false;

    const existingKey = findCharacterKey(liveCharacters, charName);

    if (!existingKey) {
        liveCharacters[charName] = {
            outfit: '',
            state: '',
            thoughts: '',
            relationship: 50,
            relationship_status: '',
            relationship_thoughts: '',
            relationship_hint: '',
        };
        eventBus.emit('characters:added', { name: charName });
        return true;
    }

    if (existingKey !== charName) {
        liveCharacters[charName] = liveCharacters[existingKey];
        delete liveCharacters[existingKey];
        eventBus.emit('characters:renamed', { oldName: existingKey, newName: charName });
        return true;
    }

    return false;
}

/**
 * Скрывает персонажа из сцены (не удаляет данные)
 */
export function hideCharacter(charName, liveCharacters) {
    if (liveCharacters[charName]) {
        liveCharacters[charName].isHiddenFromScene = true;
        eventBus.emit('characters:hidden', { name: charName });
    }
}

/**
 * Удаляет персонажа полностью
 */
export function removeCharacter(charName, liveCharacters) {
    if (liveCharacters[charName]) {
        delete liveCharacters[charName];
        eventBus.emit('characters:removed', { name: charName });
        return true;
    }
    return false;
}

/**
 * Получает список видимых персонажей
 */
export function getVisibleCharacters(liveCharacters) {
    return Object.entries(liveCharacters)
        .filter(([_, data]) => !data.isHiddenFromScene)
        .reduce((acc, [name, data]) => { acc[name] = data; return acc; }, {});
}
