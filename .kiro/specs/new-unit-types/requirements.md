# Requirements Document

## Introduction

This feature adds unit types to items in the bills and shopping list application. Currently, items have a numeric `quantity` field with no associated unit, making it ambiguous whether "2" means 2 kilograms, 2 liters, or 2 packs. By adding an optional unit type (e.g., kg, lb, liter, pack, unit), quantities gain meaningful context. The unit type is displayed alongside the quantity in item rows and is included in data export/import.

## Glossary

- **Item_Form**: The modal form component used to add or edit items in a list.
- **Item_Row**: The component that displays an individual item within a list view.
- **Unit_Type**: A label representing the measurement unit associated with an item's quantity. Supported values: "unit", "kg", "lb", "g", "liter", "ml", "pack", "dozen", "oz".
- **System**: The bills and shopping list web application.
- **Totals_Bar**: The component that displays calculated totals for the current list.
- **LocalStorage_Persistence_Layer**: The module responsible for reading and writing application state to the browser's LocalStorage.

## Requirements

### Requirement 1: Unit Type Data Model

**User Story:** As a user, I want each item to optionally have a unit type associated with its quantity, so that I know what the quantity refers to.

#### Acceptance Criteria

1. THE System SHALL support the following unit types: "unit", "kg", "lb", "g", "liter", "ml", "pack", "dozen", "oz".
2. THE System SHALL store the unit type as an optional field on each item, defaulting to "unit" when no unit type is explicitly selected.
3. WHEN a new item is created without specifying a unit type, THE System SHALL assign "unit" as the default unit type.
4. THE System SHALL preserve the unit type field when duplicating an item.

### Requirement 2: Unit Type Selection in Item Form

**User Story:** As a user, I want to select a unit type when adding or editing an item, so that I can specify the measurement unit for the quantity.

#### Acceptance Criteria

1. WHEN the Item_Form is displayed for adding a new item, THE Item_Form SHALL show a unit type selector with all supported unit types.
2. WHEN the Item_Form is displayed for editing an existing item, THE Item_Form SHALL pre-select the item's current unit type in the selector.
3. THE Item_Form SHALL display the unit type selector adjacent to the quantity field to visually associate the unit with the quantity value.
4. WHEN the user submits the Item_Form with a selected unit type, THE System SHALL save the selected unit type with the item.

### Requirement 3: Unit Type Display in Item Row

**User Story:** As a user, I want to see the unit type displayed alongside the quantity in each item row, so that I can quickly understand the measurement context.

#### Acceptance Criteria

1. WHEN an item has a unit type assigned, THE Item_Row SHALL display the unit type abbreviation next to the quantity value.
2. WHEN an item has the unit type "unit" and quantity equals 1, THE Item_Row SHALL omit displaying the unit type abbreviation.
3. WHEN an item has a unit type other than "unit", THE Item_Row SHALL display the quantity followed by the unit abbreviation (e.g., "2 kg", "500 ml", "1.5 liter").

### Requirement 4: Data Persistence and Migration

**User Story:** As a user, I want my existing items to continue working after the update, so that I do not lose any data.

#### Acceptance Criteria

1. WHEN the System loads items from LocalStorage that do not have a unit type field, THE LocalStorage_Persistence_Layer SHALL treat those items as having the "unit" unit type.
2. THE System SHALL include the unit type field when exporting list data to JSON.
3. WHEN importing JSON data that contains items without a unit type field, THE System SHALL assign "unit" as the default unit type for those items.
4. THE LocalStorage_Persistence_Layer SHALL persist the unit type field for every item in LocalStorage.

### Requirement 5: Unit Type Localization

**User Story:** As a user, I want unit type labels to appear in my selected language, so that the interface remains consistent with my locale preference.

#### Acceptance Criteria

1. THE System SHALL provide localized display labels for each unit type in both English and Brazilian Portuguese.
2. WHEN the locale is set to English, THE System SHALL display unit type labels in English (e.g., "kg", "lb", "liter", "pack").
3. WHEN the locale is set to Brazilian Portuguese, THE System SHALL display unit type labels in Brazilian Portuguese (e.g., "kg", "lb", "litro", "pacote").
4. THE Item_Form SHALL display localized unit type labels in the unit type selector.

### Requirement 6: Unit Type in Totals and Calculations

**User Story:** As a user, I want the unit type to be purely informational and not affect price calculations, so that my totals remain accurate regardless of measurement units.

#### Acceptance Criteria

1. THE Totals_Bar SHALL calculate totals using quantity multiplied by unit price regardless of the unit type assigned to an item.
2. THE System SHALL treat all unit types equivalently for the purpose of tax calculations.
3. WHEN items with different unit types are present in the same list, THE System SHALL calculate list totals without any unit conversion between items.
