// systems/inventory/InventorySystem.js

/**
 * Система инвентаря и активов
 */

import { eventBus } from '../../core/EventBus.js';

/**
 * Создаёт пустой инвентарь
 */
export function createEmptyInventory() {
    return {
        money: 0,
        currency: 'Кредитов',
        items: [],
        vehicles: [],
        estate: [],
    };
}

/**
 * Добавляет предмет
 */
export function addItem(inventory, item) {
    if (!item || typeof item !== 'string' || !item.trim()) return false;
    if (inventory.items.includes(item.trim())) return false;

    inventory.items.push(item.trim());
    eventBus.emit('inventory:changed', { type: 'item-added', value: item.trim() });
    return true;
}

/**
 * Удаляет предмет
 */
export function removeItem(inventory, item) {
    const idx = inventory.items.indexOf(item);
    if (idx === -1) return false;

    inventory.items.splice(idx, 1);
    eventBus.emit('inventory:changed', { type: 'item-removed', value: item });
    return true;
}

/**
 * Изменяет деньги
 */
export function changeMoney(inventory, amount) {
    inventory.money = Math.max(0, (inventory.money || 0) + amount);
    eventBus.emit('inventory:changed', { type: 'money', value: inventory.money, delta: amount });
    return inventory.money;
}

/**
 * Добавляет транспорт
 */
export function addVehicle(inventory, vehicle) {
    if (!vehicle?.name) return false;
    const existing = inventory.vehicles.find(v => v.name.toLowerCase() === vehicle.name.toLowerCase());
    if (existing) {
        Object.assign(existing, vehicle);
        return false;
    }
    inventory.vehicles.push({ name: vehicle.name, desc: vehicle.desc || '' });
    eventBus.emit('inventory:changed', { type: 'vehicle-added', value: vehicle.name });
    return true;
}

/**
 * Добавляет недвижимость
 */
export function addEstate(inventory, estate) {
    if (!estate?.name) return false;
    const existing = inventory.estate.find(e => e.name.toLowerCase() === estate.name.toLowerCase());
    if (existing) {
        Object.assign(existing, estate);
        return false;
    }
    inventory.estate.push({ name: estate.name, desc: estate.desc || '' });
    eventBus.emit('inventory:changed', { type: 'estate-added', value: estate.name });
    return true;
}

/**
 * Получает текст для промпта
 */
export function getInventoryPromptText(inventory) {
    if (!inventory) return '';
    let text = `Money: ${inventory.money} ${inventory.currency}\n`;
    if (inventory.items?.length) text += `Items: ${inventory.items.join(', ')}\n`;
    if (inventory.vehicles?.length) text += `Vehicles: ${inventory.vehicles.map(v => `${v.name}${v.desc ? ` (${v.desc})` : ''}`).join(', ')}\n`;
    if (inventory.estate?.length) text += `Real Estate: ${inventory.estate.map(e => `${e.name}${e.desc ? ` (${e.desc})` : ''}`).join(', ')}\n`;
    return text;
}
