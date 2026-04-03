// constants/ApiConstants.js

export const API_CONSTANTS = {
    // Стандартные заголовки для запросов
    headers: {
        'Content-Type': 'application/json',
    },

    // Таймауты
    timeouts: {
        default: 60000,      // 60 секунд
        streaming: 120000,   // 2 минуты для стриминга
        retry: 5000,         // 5 секунд между ретраями
    },

    // Максимальное количество ретраев
    maxRetries: 3,

    // Размер контекста по умолчанию
    defaultContextMessages: 10,

    // Максимальные токены
    defaultMaxTokens: 4000,

    // Температура по умолчанию
    defaultTemperature: 0.7,

    // Режимы API
    modes: {
        CHAT: 'chat',
        TEXT: 'text',
        STREAMING: 'streaming',
    },

    // Статусы ответов
    statusCodes: {
        SUCCESS: 200,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        RATE_LIMIT: 429,
        SERVER_ERROR: 500,
    },
};
