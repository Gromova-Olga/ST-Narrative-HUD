# Архитектура ST-Narrative-HUD — Рефакторинг

## Общие принципы

- **Однонаправленный поток данных**: User Action → UI Components → Event Bus → Systems → Storage → State Manager → UI Update
- **Правило слоёв**: Зависимости идут только вниз по иерархии
  - ui → systems → storage → utils
  - systems НЕ импортирует ui
  - storage НЕ импортирует systems
- **Event Bus** для развязки модулей

## Ключевые паттерны

### 1. Event Bus Pattern (Singleton)
- `core/EventBus.js` — центральная шина событий
- UI отправляет события, Systems подписываются и публикуют результаты

### 2. Dependency Injection через index.js
- index.js инициализирует системы и передаёт зависимости
- Системы НЕ импортируют UI напрямую

### 3. Adapter Pattern для Storage
- `ChatDataAdapter`, `SwipeDataAdapter`, `MessageBlocksAdapter` изолируют логику
- `NarrativeStorage.js` только координирует адаптеры

### 4. Provider Pattern для ST-интеграции
- `integration/STContextProvider.js` — единственная точка доступа к ST API
- Все модули импортируют его вместо прямого `SillyTavern.getContext()`

## Граф зависимостей

### index.js
- → core/EventBus.js (singleton)
- → core/StateManager.js
- → core/LifecycleManager.js
- → integration/STEventListener.js
- → ui/UIManager.js
- → systems/* (регистрация систем)

### core/
- EventBus.js → utils/validation/*
- StateManager.js → storage/NarrativeStorage.js, types/*, EventBus.js
- LifecycleManager.js → EventBus.js
- ConfigLoader.js → constants/DefaultSettings.js

### systems/
- TrackerSystem.js → storage/*, types/TrackerModel, EventBus
- CharacterSystem.js → storage/*, types/CharacterModel, EventBus
- CharacterMatcher.js → utils/string/Transliterator
- RelationshipCalculator.js → types/CharacterModel
- QuestSystem.js → storage/*, types/QuestModel, EventBus

### storage/
- NarrativeStorage.js → integration/STContextProvider, ChatDataAdapter, SwipeDataAdapter, MessageBlocksAdapter
- Адаптеры → utils/validation/DataValidator

### api/
- NarrativeApiService.js → ProfileResolver, RequestBuilder, ResponseParser, integration/STContextProvider
- ProfileResolver.js → integration/STProfileManager
- RequestBuilder.js → constants/ApiConstants
- ResponseParser.js → parsers/JsonExtractor

### parsers/
- AIParser.js → JsonExtractor, CharacterExtractor, TrackerExtractor
- JsonExtractor.js → utils/string/StringCleaner, constants/RegexPatterns
- TagRemover.js → utils/string/RegexHelper
- CharacterExtractor.js → types/CharacterModel
- TrackerExtractor.js → types/TrackerModel

### ui/
- UIManager.js → EventBus, ui/components/*, ui/rendering/*
- components/* → EventBus, rendering/DomBuilder, TemplateEngine, interactions/*, constants/UiConstants
- MessageButtonInjector.js → messages/SwipeDetector, EventBus
- JsonEditorModal.js → EventBus, utils/validation/JsonValidator

### messages/
- MessageActions.js → EventBus, messages/MessageReader, SwipeDetector, parsers/DataExtractor
- MessageReader.js → integration/STContextProvider
- SwipeDetector.js → integration/STContextProvider
- DataExtractor.js → constants/RegexPatterns

### integration/
- STContextProvider.js → (прямой доступ к SillyTavern.getContext)
- STEventListener.js → EventBus (преобразование ST-событий)
- STChatObserver.js → EventBus
- STProfileManager.js → STContextProvider
