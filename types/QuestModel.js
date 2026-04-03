// types/QuestModel.js

/**
 * @typedef {Object} QuestData
 * @property {string} title - Название квеста
 * @property {string} desc - Описание
 * @property {'active'|'completed'|'failed'|'paused'} status - Статус
 * @property {string} [dateAdded] - Дата добавления
 * @property {string} [dateCompleted] - Дата завершения
 */

export class QuestModel {
    static STATUS = {
        ACTIVE: 'active',
        COMPLETED: 'completed',
        FAILED: 'failed',
        PAUSED: 'paused',
    };

    /**
     * Создаёт новый квест
     */
    static create(title, desc, status = QuestModel.STATUS.ACTIVE) {
        return {
            title,
            desc,
            status,
            dateAdded: new Date().toLocaleDateString('ru-RU'),
            dateCompleted: null,
        };
    }

    /**
     * Завершает квест
     */
    static complete(quest) {
        return {
            ...quest,
            status: QuestModel.STATUS.COMPLETED,
            dateCompleted: new Date().toLocaleDateString('ru-RU'),
        };
    }

    /**
     * Помечает квест как проваленный
     */
    static fail(quest) {
        return {
            ...quest,
            status: QuestModel.STATUS.FAILED,
            dateCompleted: new Date().toLocaleDateString('ru-RU'),
        };
    }

    /**
     * Валидирует квест
     */
    static isValid(quest) {
        return quest
            && typeof quest.title === 'string' && quest.title.trim().length > 0
            && typeof quest.desc === 'string'
            && Object.values(QuestModel.STATUS).includes(quest.status);
    }

    /**
     * Мержит обновление квеста
     */
    static merge(existing, update) {
        return {
            ...existing,
            desc: update.desc || existing.desc,
            status: update.status || existing.status,
            dateCompleted: update.status === QuestModel.STATUS.COMPLETED || update.status === QuestModel.STATUS.FAILED
                ? new Date().toLocaleDateString('ru-RU')
                : existing.dateCompleted,
        };
    }
}
