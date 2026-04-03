// systems/characters/RelationshipCalculator.js

/**
 * Расчёт и отслеживание изменений отношений персонажей
 */

/**
 * Вычисляет текстовый статус отношения по числовому значению
 * @param {number} value - значение 0-100
 * @param {string} statuses - строка статусов через запятую
 * @returns {string}
 */
export function calculateStatus(value, statuses = "Враг, Незнакомец, Нейтралитет, Приятель, Друг, Возлюбленный, Заклятый враг") {
    const parts = statuses.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return '';

    // Равномерно распределяем диапазоны
    const step = 100 / parts.length;
    const index = Math.min(Math.floor(value / step), parts.length - 1);
    return parts[index];
}

/**
 * Вычисляет дельту отношения и формирует запись истории
 * @param {number} oldValue
 * @param {number} newValue
 * @param {string|number} messageId
 * @param {string} reason
 * @returns {Object|null} запись для relHistory или null если нет изменений
 */
export function calculateDelta(oldValue, newValue, messageId, reason = '') {
    if (oldValue === newValue) return null;

    return {
        messageId: String(messageId),
        delta: newValue - oldValue,
        val: newValue,
        reason: reason || 'Действия повлияли на отношение',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
}

/**
 * Применяет обновление отношения к персонажу
 * @param {Object} characterData - данные персонажа из JSON
 * @param {Object} liveCharacter - объект live.characters[name]
 * @param {string|number} messageId
 * @param {Object} relHistory - объект live.relHistory
 * @returns {{ updated: boolean, changes: string[] }}
 */
export function applyRelationshipUpdate(characterData, liveCharacter, messageId, relHistory) {
    const changes = [];

    if (characterData.relationship !== undefined) {
        const newVal = Math.min(100, Math.max(0, parseInt(characterData.relationship) || 50));
        const oldVal = liveCharacter.relationship ?? 50;

        if (newVal !== oldVal) {
            const entry = calculateDelta(oldVal, newVal, messageId, characterData.relationship_change_reason);
            if (entry) {
                // Фильтруем старые записи для этого messageId
                const charName = Object.keys(relHistory).find(k => relHistory[k] === relHistory) || '';
                // relHistory передаётся как объект по имени персонажа
                const history = relHistory;
                if (history) {
                    const filtered = history.filter(e => String(e.messageId) !== String(messageId));
                    filtered.push(entry);
                    // Заменяем содержимое массива
                    history.length = 0;
                    filtered.forEach(e => history.push(e));
                }
            }

            liveCharacter.relationship = newVal;
            changes.push(`relationship: ${oldVal} → ${newVal}`);
        }
    }

    if (characterData.relationship_status !== undefined) {
        const val = characterData.relationship_status;
        if (liveCharacter.relationship_status !== val) {
            liveCharacter.relationship_status = val;
            changes.push('relationship_status');
        }
    }

    if (characterData.relationship_thoughts !== undefined) {
        const val = characterData.relationship_thoughts;
        if (liveCharacter.relationship_thoughts !== val) {
            liveCharacter.relationship_thoughts = val;
            changes.push('relationship_thoughts');
        }
    }

    if (characterData.relationship_hint !== undefined) {
        const val = characterData.relationship_hint;
        if (liveCharacter.relationship_hint !== val) {
            liveCharacter.relationship_hint = val;
            changes.push('relationship_hint');
        }
    }

    if (characterData.relationship_change_reason !== undefined) {
        const val = characterData.relationship_change_reason;
        if (liveCharacter.relationship_change_reason !== val) {
            liveCharacter.relationship_change_reason = val;
        }
    }

    return { updated: changes.length > 0, changes };
}

/**
 * Считает среднее отношение ко всем персонажам
 */
export function getAverageRelationship(characters) {
    const values = Object.values(characters)
        .map(c => c.relationship)
        .filter(v => typeof v === 'number');

    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
