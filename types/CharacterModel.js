// types/CharacterModel.js

/**
 * Модель персонажа
 * Перенесён из core/CharacterModel.js
 */

export class CharacterModel {
    constructor(name, avatar = '') {
        this.name = name;
        this.avatar = avatar;
        this.outfit = '';
        this.state = '';
        this.thoughts = '';
        this.emoji = '👤';
        this.relationship = 'Neutral';
        this.stats = {};
        this.customFields = {};
    }

    /**
     * Обновить поля из данных от ИИ
     */
    updateFromAI(data) {
        if (data.outfit) this.outfit = data.outfit;
        if (data.state) this.state = data.state;
        if (data.thoughts) this.thoughts = data.thoughts;
        if (data.emoji) this.emoji = data.emoji;
        if (data.relationship) this.relationship = data.relationship;

        Object.entries(data).forEach(([key, value]) => {
            if (!['name', 'outfit', 'state', 'thoughts', 'emoji', 'relationship'].includes(key)) {
                this.customFields[key] = value;
            }
        });
    }

    /**
     * Преобразовать в JSON
     */
    toJSON() {
        return {
            name: this.name,
            outfit: this.outfit,
            state: this.state,
            thoughts: this.thoughts,
            emoji: this.emoji,
            relationship: this.relationship,
            ...this.customFields,
        };
    }

    /**
     * Создаёт из объекта данных
     */
    static fromData(data) {
        const char = new CharacterModel(data.name || '', data.avatar || '');
        char.updateFromAI(data);
        return char;
    }
}
