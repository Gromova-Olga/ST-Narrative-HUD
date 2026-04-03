// parsers/InfoBlockExtractor.js
export class InfoBlockExtractor {
    /**
     * Извлечь инфоблоки из данных
     */
    extract(data, blockIds) {
        const result = {};

        for (const blockId of blockIds) {
            if (data[blockId] !== undefined) {
                result[blockId] = this._formatValue(data[blockId]);
            }
        }

        return result;
    }

    /**
     * Извлечь datetime блоки
     */
    extractDateTime(data) {
        const result = {};

        if (data.datetime) result.datetime = this._formatValue(data.datetime);
        if (data.location) result.location = this._formatValue(data.location);
        if (data.weather) result.weather = this._formatValue(data.weather);

        return result;
    }

    /**
     * Форматировать значение блока
     */
    _formatValue(value) {
        if (!value) return '';

        if (Array.isArray(value)) {
            return value.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return Object.entries(item)
                        .map(([k, v]) => `🔹 <b>${k.toUpperCase()}</b>: ${v}`)
                        .join('\n');
                }
                return item;
            }).join('\n\n');
        }

        if (typeof value === 'object' && value !== null) {
            return Object.entries(value)
                .map(([k, v]) => `🔹 <b>${k.toUpperCase()}</b>: ${v}`)
                .join('\n\n');
        }

        return String(value);
    }
}