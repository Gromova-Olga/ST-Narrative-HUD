// AIParser.js
export const AIParser = {
    /**
     * Парсит JSON ответ от ИИ
     */
    parseAIResponse(rawText) {
        // Очищаем от think-тегов и markdown
        const cleaned = rawText
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/```json|```/gi, '')
            .trim();

        // Ищем JSON объект
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error('Failed to parse AI response:', e);
            return null;
        }
    },

    /**
     * Извлекает персонажей из ответа
     */
    extractCharacters(parsedData) {
        if (!parsedData?.characters || !Array.isArray(parsedData.characters)) {
            return [];
        }

        return parsedData.characters.map(charData => ({
            name: charData.name,
            outfit: charData.outfit || '',
            state: charData.state || '',
            thoughts: charData.thoughts || '',
            emoji: charData.emoji || '👤',
            relationship: charData.relationship || 'Neutral',
            // Сохраняем все остальные поля как есть
            custom: Object.fromEntries(
                Object.entries(charData).filter(([key]) => 
                    !['name', 'outfit', 'state', 'thoughts', 'emoji', 'relationship'].includes(key)
                )
            )
        }));
    },

    /**
     * Извлекает инфоблоки (комментарии, монологи и т.д.)
     */
    extractInfoBlocks(parsedData) {
        const blocks = {};
        const blockTypes = ['comments', 'monologue', 'diary', 'skillchecks'];
        
        blockTypes.forEach(type => {
            if (parsedData[type] && typeof parsedData[type] === 'string') {
                blocks[type] = parsedData[type];
            }
        });
        
        return blocks;
    },

    /**
     * Извлекает значения трекеров
     */
    extractTrackers(parsedData, trackerConfig) {
        const trackers = {};
        
        if (parsedData.trackers) {
            trackerConfig.forEach(tracker => {
                if (parsedData.trackers[tracker.id] !== undefined) {
                    trackers[tracker.id] = Math.min(
                        Math.max(0, parseInt(parsedData.trackers[tracker.id]) || 0),
                        tracker.max
                    );
                }
            });
        }
        
        return trackers;
    },

    /**
     * Извлекает datetime
     */
    extractDateTime(parsedData) {
        return parsedData.datetime || '';
    }
};