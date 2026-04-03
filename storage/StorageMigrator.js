// storage/StorageMigrator.js

/**
 * Миграции структуры данных хранилища
 * 
 * Обеспечивает совместимость при обновлениях расширения.
 * Каждая миграция проверяет версию и применяет изменения.
 */

const CURRENT_VERSION = 2;

/**
 * Проверяет и применяет миграции
 * @param {Object} settings - объект настроек расширения
 * @returns {{ migrated: boolean, fromVersion: number, toVersion: number }}
 */
export function runMigrations(settings) {
    const currentVersion = settings._storageVersion || 1;

    if (currentVersion >= CURRENT_VERSION) {
        return { migrated: false, fromVersion: currentVersion, toVersion: CURRENT_VERSION };
    }

    console.log(`[StorageMigrator] Migrating from v${currentVersion} to v${CURRENT_VERSION}`);

    // Миграция v1 → v2: добавляем metadata в chatData
    if (currentVersion < 2) {
        migrateV1ToV2(settings);
    }

    settings._storageVersion = CURRENT_VERSION;
    return { migrated: true, fromVersion: currentVersion, toVersion: CURRENT_VERSION };
}

/**
 * Миграция v1 → v2
 * Добавляет metadata в каждый chatData если нет
 */
function migrateV1ToV2(settings) {
    if (!settings.chatData) return;

    Object.entries(settings.chatData).forEach(([chatId, chat]) => {
        if (!chat.metadata) {
            chat.metadata = {
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                totalBlocks: Object.keys(chat.blocks || {}).length,
                estimatedSize: 0,
            };
        }

        // Подсчёт размера
        let totalSize = 0;
        Object.values(chat.blocks || {}).forEach(messageBlocks => {
            Object.values(messageBlocks).forEach(text => {
                totalSize += (text?.length || 0) * 2;
            });
        });
        chat.metadata.estimatedSize = totalSize;
        chat.metadata.estimatedSizeKB = (totalSize / 1024).toFixed(2);
    });

    console.log('[StorageMigrator] v1 → v2: added metadata to chatData');
}

/**
 * Получает текущую версию хранилища
 */
export function getStorageVersion(settings) {
    return settings._storageVersion || 1;
}

/**
 * Проверяет, нужна ли миграция
 */
export function needsMigration(settings) {
    return (settings._storageVersion || 1) < CURRENT_VERSION;
}
