// api/StreamHandler.js

/**
 * Обработка streaming-ответов от API
 * 
 * Парсит Server-Sent Events (SSE) из ReadableStream.
 */

import { eventBus } from '../core/EventBus.js';

/**
 * Обрабатывает streaming-ответ
 * @param {Response} response - fetch Response с streaming
 * @param {Function} onChunk - колбэк на каждый чанк текста
 * @returns {Promise<string>} полный собранный текст
 */
export async function handleStream(response, onChunk) {
    if (!response.body) {
        throw new Error('Response body is not readable (no stream)');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const parsed = parseSSELine(line);
                if (parsed) {
                    fullText += parsed;
                    if (onChunk) onChunk(parsed, fullText);
                    eventBus.emit('api:stream-chunk', { chunk: parsed, fullText });
                }
            }
        }

        // Обрабатываем остаток буфера
        if (buffer.trim()) {
            const parsed = parseSSELine(buffer);
            if (parsed) {
                fullText += parsed;
                if (onChunk) onChunk(parsed, fullText);
            }
        }
    } finally {
        reader.releaseLock();
    }

    eventBus.emit('api:stream-complete', { fullText });
    return fullText;
}

/**
 * Парсит одну строку SSE
 * @param {string} line
 * @returns {string|null} извлечённый текст или null
 */
function parseSSELine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':')) return null;

    // Формат: "data: {...}" или "data: [DONE]"
    if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        if (data === '[DONE]') return null;

        try {
            const json = JSON.parse(data);
            // OpenAI формат
            const content = json.choices?.[0]?.delta?.content;
            if (content) return content;

            // Claude формат
            if (json.type === 'content_block_delta' && json.delta?.text) {
                return json.delta.text;
            }

            return null;
        } catch {
            // Не JSON — возможно, просто текст
            return data;
        }
    }

    return null;
}

/**
 * Проверяет, поддерживает ли response streaming
 * @param {Response} response
 * @returns {boolean}
 */
export function isStreamResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('text/event-stream') || contentType.includes('stream');
}
