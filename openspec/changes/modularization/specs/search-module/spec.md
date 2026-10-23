## ADDED Requirements

### Requirement: Search module extraction
All search-related logic SHALL be extracted from `main_logic.js` and `wmsettings.js` into dedicated search module files under `src_js/modules/search/`.

#### Scenario: Search request function
- **WHEN** the user initiates a search (via search field, URL hash, periodic table click, or advanced search)
- **THEN** the `request_search` function and all related search orchestration SHALL be importable from the search module

#### Scenario: Augmented search command
- **WHEN** a facet is selected or toggled in the UI
- **THEN** the `aug_search_cmd` function SHALL be importable from the search module and produce the correct hash URL

#### Scenario: Search state management
- **WHEN** the search state object (`wmgui.search`) is read or mutated
- **THEN** it SHALL be accessed via explicit import from the search module, not from the global `wmgui` object

#### Scenario: Facet definitions and category constants
- **WHEN** facet lists, multi-facet lists, inquiry lists, or facet name mappings are needed
- **THEN** they SHALL be importable from the search module as named exports

### Requirement: Search module displays
The search module SHALL include functions for rendering search results, pagination, and data display.

#### Scenario: Result rendering
- **WHEN** search results are received from the API
- **THEN** the result rendering functions SHALL be importable from the search module

#### Scenario: Quick search and pagination
- **WHEN** the user scrolls or requests more results
- **THEN** pagination and quick-search functions SHALL be importable from the search module