// types/MessageDataModel.js

/**
 * @typedef {Object} MessageData
 * @property {number|string} messageId - ID сообщения
 * @property {number} swipeId - ID свайпа
 * @property {string} key - Ключ формата "messageId_swipeId"
 * @property {string} [text] - Текст сообщения
 * @property {boolean} [isUser] - Сообщение от пользователя
 * @property {boolean} [isSystem] - Системное сообщение
 * @property {Object} [data] - Извлечённые данные (трекеры, персонажи и т.д.)
 */

export class MessageDataModel {
    /**
     * Создаёт модель данных сообщения
     */
    static create(messageId, swipeId = 0, text = '') {
        return {
            messageId,
            swipeId,
            key: `${messageId}_${swipeId}`,
            text,
            isUser: false,
            isSystem: false,
            data: null,
        };
    }

    /**
     * Создаёт из контекста SillyTavern
     */
    static fromSTContext(ctx, messageId) {
        const msg = ctx?.chat?.[messageId];
        if (!msg) return null;

        const swipeId = msg.swipe_id ?? 0;
        const model = MessageDataModel.create(messageId, swipeId, msg.mes || '');
        model.isUser = !!msg.is_user;
        model.isSystem = !!msg.is_system;
        return model;
    }

    /**
     * Получает ключ хранилища
     */
    static getStorageKey(messageId, swipeId) {
        return `${messageId}_${swipeId}`;
    }

    /**
     * Парсит ключ обратно в компоненты
     */
    static parseKey(key) {
        const parts = String(key).split('_');
        return {
            messageId: parts[0],
            swipeId: parseInt(parts[1]) || 0,
        };
    }

    /**
     * Валидирует модель
     */
    static isValid(model) {
        return model
            && model.messageId !== undefined
            && model.swipeId !== undefined
            && typeof model.key === 'string';
    }
}
