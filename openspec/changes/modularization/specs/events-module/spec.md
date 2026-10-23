## ADDED Requirements

### Requirement: Events module extraction
All DOM event listener registration and event handler functions SHALL be extracted from `events.js` into dedicated event module files under `src_js/modules/events/`.

#### Scenario: Event registration
- **WHEN** the application initializes
- **THEN** the `register_events` function SHALL be importable from the events module and attach all DOM event listeners

#### Scenario: Event handler dependencies
- **WHEN** an event handler needs to call search, routing, or UI functions
- **THEN** it SHALL import those functions explicitly from their respective modules rather than accessing them from the global namespace

#### Scenario: No inline business logic
- **WHEN** an event handler contains business logic (e.g., search query construction, facet manipulation)
- **THEN** that logic SHALL be delegated to the search or state module; the events module SHALL only handle DOM event coordination

### Requirement: Events module split by domain
The events module files SHALL be split by interaction domain to improve maintainability.

#### Scenario: Search event handlers
- **WHEN** search-related UI events (search trigger, selectize changes, facet clicks) are handled
- **THEN** those handlers SHALL be in a dedicated search events module file

#### Scenario: Navigation event handlers
- **WHEN** navigation-related UI events (menu clicks, hash changes, modal triggers) are handled
- **THEN** those handlers SHALL be in a dedicated navigation events module file

#### Scenario: Ptable event handlers
- **WHEN** periodic table interaction events (element clicks, dtype radio changes) are handled
- **THEN** those handlers SHALL be in a dedicated ptable events module file