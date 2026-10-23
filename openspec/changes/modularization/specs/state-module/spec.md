## ADDED Requirements

### Requirement: Centralized state module
All shared application state previously on `window.wmgui` SHALL be exported from a centralized state module under `src_js/modules/state/`.

#### Scenario: Search state
- **WHEN** any module needs to read or write the `search` object
- **THEN** it SHALL import `search` from the state module

#### Scenario: API endpoint URLs
- **WHEN** any module needs API endpoint URLs (e.g., `search_endpoint`, `login_endpoint`, `phase_endpoint`)
- **THEN** it SHALL import them from the state module as named exports

#### Scenario: Edition configuration
- **WHEN** the application detects or applies edition-specific settings (MPDS, ASM)
- **THEN** edition IDs, URLs, CSS paths, and action functions SHALL be importable from the state module

#### Scenario: Application constants
- **WHEN** constants like `facets`, `inquiries`, `multi_facets`, `simple_facets`, `facet_names`, `numerics`, `aets`, `elemental_names` are needed
- **THEN** they SHALL be importable from the state module as named exports

#### Scenario: View mode and search type
- **WHEN** `view_mode` or `search_type` is read or modified
- **THEN** it SHALL be accessed via import from the state module

### Requirement: State module initialization
The state module SHALL provide an initialization function for values that depend on runtime conditions.

#### Scenario: Edition detection
- **WHEN** the application starts
- **THEN** the state module's `assign_edition` function SHALL detect the current hostname and set the active edition

#### Scenario: Host-dependent URLs
- **WHEN** API endpoint URLs depend on whether the app is in production or development mode
- **THEN** the state module SHALL compute these URLs during initialization based on `window.location`

### Requirement: State module no circular dependencies
The state module SHALL NOT import from any other application module; it SHALL only export data and simple initialization functions.

#### Scenario: State module imports
- **WHEN** the state module is inspected
- **THEN** its imports SHALL be limited to third-party libraries (if needed) and no other `src_js/modules/` modules

#### Scenario: Utility functions
- **WHEN** utility functions previously in `wmcore.js` (clean, cancel_event, etc.) are needed by the state module
- **THEN** they SHALL be duplicated or inlined in the state module, not imported from wmcore