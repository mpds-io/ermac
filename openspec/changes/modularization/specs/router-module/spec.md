## ADDED Requirements

### Requirement: Router module extraction
All hash-based routing logic SHALL be extracted from `router.js` into a dedicated router module under `src_js/modules/router/`.

#### Scenario: Route dispatch
- **WHEN** the URL hash changes
- **THEN** the `url_redraw_react` function SHALL be importable from the router module and dispatch to the correct `url__*` handler

#### Scenario: Route handler functions
- **WHEN** a specific route is matched (start, search, inquiry, phase, polyhedra, etc.)
- **THEN** the corresponding `url__*` handler function SHALL be importable from the router module

#### Scenario: Hash change listener
- **WHEN** the application initializes
- **THEN** the router module SHALL register the `hashchange` event listener

#### Scenario: Router dependencies
- **WHEN** a route handler needs search or UI functions
- **THEN** it SHALL import them explicitly from their respective modules rather than accessing them from the global namespace

### Requirement: Router module isolation
The router module SHALL NOT contain business logic; it SHALL only coordinate between URL hash state and the appropriate module functions.

#### Scenario: Route handler delegating to search
- **WHEN** `url__search` is called with a query argument
- **THEN** it SHALL call the search module's search function, not implement search logic itself

#### Scenario: Route handler delegating to UI
- **WHEN** `url__start` is called
- **THEN** it SHALL call the UI module's view mode switching function