## ADDED Requirements

### Requirement: UI module extraction
All HTML generation, DOM manipulation helpers, notification, and tooltip logic SHALL be extracted from `markup.js` and `main_logic.js` into dedicated UI module files under `src_js/modules/ui/`.

#### Scenario: HTML registration
- **WHEN** the application initializes
- **THEN** the `register_html` function SHALL be importable from the UI module and inject the full application markup into the document body

#### Scenario: Notification display
- **WHEN** the application needs to display a notification to the user
- **THEN** the `notify` function SHALL be importable from the UI module

#### Scenario: Tooltip system
- **WHEN** tooltips are shown or dismissed
- **THEN** tooltip-related functions (`show_tooltip`, tooltip data) SHALL be importable from the UI module

#### Scenario: View mode switching
- **WHEN** the application transitions between intro screen (mode 1) and results screen (mode 2)
- **THEN** the `switch_view_mode` function SHALL be importable from the UI module

#### Scenario: Modal and overlay management
- **WHEN** modals or overlays are shown or hidden
- **THEN** the corresponding DOM manipulation functions SHALL be importable from the UI module

### Requirement: Slider UI in dedicated module
The numeric range slider UI (noUiSlider-based) SHALL be in its own module file under `src_js/modules/ui/`.

#### Scenario: Slider creation and destruction
- **WHEN** numeric range sliders are created or destroyed
- **THEN** `create_floating_slider`, `destroy_numericbox`, and related functions SHALL be importable from the slider module