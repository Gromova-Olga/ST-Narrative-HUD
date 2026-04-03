// api/ResponseParser.js

/**
 * Парсинг ответов от разных API
 * 
 * Каждый API (OpenAI, Claude, Google) возвращает данные в разном формате.
 * Этот модуль нормализует их в единый формат.
 */

import { chat_completion_sources } from '../../../../openai.js';

/**
 * Извлекает текст из ответа API
 * @param {Object} data - ответ от fetch
 * @param {string} cc_source - chat_completion_source
 * @returns {string}
 */
export function extractText(data, cc_source) {
    if (cc_source === chat_completion_sources.CLAUDE) {
        return data.content?.[0]?.text?.trim() || '';
    }

    if (cc_source === chat_completion_sources.MAKERSUITE) {
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }

    // Default: OpenAI-совместимый
    return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Проверяет, содержит ли ответ ошибку
 * @param {Object} data
 * @returns {{ hasError: boolean, message: string }}
 */
export function checkError(data) {
    if (data.error) {
        return {
            hasError: true,
            message: data.error.message || data.error || 'Unknown API error',
        };
    }
    return { hasError: false, message: '' };
}

/**
 * Извлекает usage/токены из ответа
 * @param {Object} data
 * @returns {{ prompt_tokens: number, completion_tokens: number, total_tokens: number }|null}
 */
export function extractUsage(data) {
    if (data.usage) {
        return {
            prompt_tokens: data.usage.prompt_tokens || 0,
            completion_tokens: data.usage.completion_tokens || 0,
            total_tokens: data.usage.total_tokens || 0,
        };
    }
    return null;
}

/**
 * Обрабатывает HTTP-ответ: проверяет статус и парсит JSON
 * @param {Response} response - fetch Response
 * @returns {Promise<Object>}
 */
export async function parseHttpResponse(response) {
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText.substring(0, 300)}`);
    }

    const data = await response.json();
    const errCheck = checkError(data);
    if (errCheck.hasError) {
        throw new Error(errCheck.message);
    }

    return data;
}
