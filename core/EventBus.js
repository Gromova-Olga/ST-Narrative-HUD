// core/EventBus.js

/**
 * Центральная шина событий для развязки модулей
 * 
 * Принципы:
 * - UI отправляет события в EventBus
 * - Systems подписываются на события и публикуют результаты
 * - UI слушает изменения через EventBus
 * 
 * Поток: UI → EventBus → Systems → EventBus → UI
 */

class EventBus {
    constructor() {
        this.listeners = {};
        this.onceListeners = {};
        this.debug = false;
    }

    /**
     * Подписка на событие
     * @param {string} event - Название события
     * @param {Function} callback - Обработчик
     * @returns {Function} Функция отписки
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);

        if (this.debug) {
            console.log(`[EventBus] Subscribed to: ${event}`);
        }

        // Возвращаем функцию отписки
        return () => this.off(event, callback);
    }

    /**
     * Одноразовая подписка
     * @param {string} event - Название события
     * @param {Function} callback - Обработчик
     * @returns {Function} Функция отписки
     */
    once(event, callback) {
        if (!this.onceListeners[event]) {
            this.onceListeners[event] = [];
        }
        this.onceListeners[event].push(callback);

        return () => {
            const idx = this.onceListeners[event]?.indexOf(callback);
            if (idx > -1) this.onceListeners[event].splice(idx, 1);
        };
    }

    /**
     * Отписка от события
     * @param {string} event - Название события
     * @param {Function} callback - Обработчик для удаления
     */
    off(event, callback) {
        if (this.listeners[event]) {
            const idx = this.listeners[event].indexOf(callback);
            if (idx > -1) this.listeners[event].splice(idx, 1);
        }
        if (this.onceListeners[event]) {
            const idx = this.onceListeners[event].indexOf(callback);
            if (idx > -1) this.onceListeners[event].splice(idx, 1);
        }
    }

    /**
     * Отписка всех обработчиков от события
     * @param {string} event - Название события
     */
    offAll(event) {
        if (event) {
            delete this.listeners[event];
            delete this.onceListeners[event];
        } else {
            this.listeners = {};
            this.onceListeners = {};
        }
    }

    /**
     * Отправка события
     * @param {string} event - Название события
     * @param {*} data - Данные события
     */
    emit(event, data) {
        if (this.debug) {
            console.log(`[EventBus] Emit: ${event}`, data);
        }

        // Обычные слушатели
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`[EventBus] Error in listener for ${event}:`, e);
                }
            });
        }

        // Одноразовые слушатели
        if (this.onceListeners[event]) {
            const callbacks = [...this.onceListeners[event]];
            this.onceListeners[event] = [];
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`[EventBus] Error in once-listener for ${event}:`, e);
                }
            });
        }
    }

    /**
     * Асинхронная отправка события
     * @param {string} event - Название события
     * @param {*} data - Данные события
     * @returns {Promise<void>}
     */
    async emitAsync(event, data) {
        if (this.debug) {
            console.log(`[EventBus] EmitAsync: ${event}`, data);
        }

        const allCallbacks = [
            ...(this.listeners[event] || []),
            ...(this.onceListeners[event] || []),
        ];

        // Очищаем once-слушатели
        if (this.onceListeners[event]) {
            this.onceListeners[event] = [];
        }

        for (const callback of allCallbacks) {
            try {
                await callback(data);
            } catch (e) {
                console.error(`[EventBus] Error in async listener for ${event}:`, e);
            }
        }
    }

    /**
     * Проверяет наличие подписчиков на событие
     * @param {string} event - Название события
     * @returns {boolean}
     */
    hasListeners(event) {
        return (this.listeners[event]?.length > 0) || (this.onceListeners[event]?.length > 0);
    }

    /**
     * Включает/выключает debug-логирование
     * @param {boolean} enabled
     */
    setDebug(enabled) {
        this.debug = enabled;
    }
}

// Singleton — единая шина для всего приложения
export const eventBus = new EventBus();
