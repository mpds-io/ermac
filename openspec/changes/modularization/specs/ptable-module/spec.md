## ADDED Requirements

### Requirement: Periodic table module extraction
All periodic table widget logic SHALL be extracted from `ptable.js` into a dedicated module under `src_js/modules/ptable/`.

#### Scenario: Ptable state and methods
- **WHEN** the periodic table needs to show, hide, activate, or deactivate
- **THEN** the corresponding `wmgui.ptable.show`, `wmgui.ptable.hide`, `wmgui.ptable.activate`, `wmgui.ptable.deactivate` functions SHALL be importable from the ptable module

#### Scenario: Element selection and series
- **WHEN** an element is selected or a series of elements is highlighted
- **THEN** the `select_ptable_el`, `select_ptable_series`, and related functions SHALL be importable from the ptable module

#### Scenario: Ptable HTML data reading
- **WHEN** the application reads periodic table HTML data from the DOM
- **THEN** the `read_ptable_html` function SHALL be importable from the ptable module

#### Scenario: Ptable visualization
- **WHEN** element data distributions or crystal structure SVGs are fetched
- **THEN** the corresponding AJAX and rendering functions SHALL be importable from the ptable module

### Requirement: Ptable module self-containment
The ptable module SHALL be self-contained with no dependency on the `window.wmgui` global namespace.

#### Scenario: Internal state
- **WHEN** the ptable module manages its own state (visible, activated, dtypes, query, etc.)
- **THEN** that state SHALL be held in module-scoped variables or exported objects, not on `window.wmgui.ptable`

#### Scenario: External dependencies
- **WHEN** the ptable module needs utility functions or state from other modules
- **THEN** it SHALL import them explicitly via `import` statements