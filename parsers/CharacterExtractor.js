// parsers/CharacterExtractor.js
import { CharacterModel } from "../types/CharacterModel.js";
import { stripHtml } from "../utils/string/StringCleaner.js";

export class CharacterExtractor {
    /**
     * Извлечь персонажей из данных
     */
    extract(charactersData, userName = null) {
        if (!charactersData) return [];

        let charsArray = [];

        if (Array.isArray(charactersData)) {
            charsArray = charactersData;
        } else if (typeof charactersData === 'object') {
            charsArray = Object.entries(charactersData).map(([name, data]) => ({ name, ...data }));
        }

        const result = [];

        for (const charData of charsArray) {
            if (!charData.name) continue;
            if (userName && charData.name.toLowerCase() === userName.toLowerCase()) continue;

            const character = new CharacterModel(charData.name);
            character.updateFromAI({
                outfit: charData.outfit,
                state: charData.state,
                thoughts: charData.thoughts,
                emoji: charData.emoji,
                relationship: charData.relationship,
                relationship_status: charData.relationship_status,
                relationship_thoughts: charData.relationship_thoughts,
                relationship_hint: charData.relationship_hint,
                relationship_change_reason: charData.relationship_change_reason,
                ...charData.custom
            });

            result.push(character);
        }

        return result;
    }

    /**
     * Извлечь изменения отношений
     */
    extractRelationshipChange(character, oldValue, newValue, messageId, reason = null) {
        if (newValue === oldValue) return null;

        return {
            messageId,
            delta: newValue - oldValue,
            val: newValue,
            reason: stripHtml(reason || "Действия повлияли на отношение"),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    }
}