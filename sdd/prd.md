# 🧾 PRD — Offline Bills & Shopping List Web App

## 1. Overview

A mobile-first, offline-capable web application that allows users to create and manage lists for:

* 🛒 Supermarket shopping
* 🍽️ Restaurant consumption

Users can:

* Add items with quantity and optional price
* Track selected (already picked/consumed) items
* Apply tax or tip percentages
* View real-time totals
* Store all data locally in the browser
* Export/import data via JSON

---

## 2. Goals

### Primary Goal

Enable users to estimate and track total expenses in real-time while shopping or dining.

### Secondary Goals

* Provide a fast, offline-first experience
* Minimize friction for adding/editing items
* Support simple data portability (JSON export/import)

---

## 3. Non-Goals (Out of Scope for MVP)

* User accounts / authentication
* Cloud sync
* Receipt scanning (OCR)
* Barcode scanning
* Bill splitting between people
* Currency conversion

---

## 4. Platform & Technology

* **Frontend:** React
* **Styling:** Tailwind CSS
* **Storage:** Browser LocalStorage
* **Hosting:** GitHub Pages
* **Architecture:** Fully client-side (no backend)

---

## 5. Core Concepts

### 5.1 List

A list represents a shopping session or restaurant bill.

#### Properties:

* `id`: string (UUID or timestamp)
* `name`: string
* `type`: "shopping" | "restaurant"
* `currency`: "BRL" | "USD"
* `taxPercentage`: number (>= 0)
* `items`: Item[]
* `archived`: boolean

---

### 5.2 Item

Represents a product or ordered item.

#### Properties:

* `id`: string
* `name`: string (required)
* `quantity`: number (default = 1, decimal allowed)
* `unitPrice`: number (optional, default = 0)
* `selected`: boolean (picked/consumed)
* `includeInTax`: boolean (default = true)

---

## 6. Calculations

All calculations update **in real-time**.

### 6.1 Base Totals

* **Total Items (All)**
  Sum of (quantity × unitPrice) for all items

* **Total Selected Items**
  Sum of selected items only

---

### 6.2 Tax Logic

* Tax applies to all items by default
* Items with `includeInTax = false` are excluded from tax calculation

---

### 6.3 Tax Totals

* **Total Items + Tax**
* **Total Selected Items + Tax**

Tax is applied only to items included in tax.

---

## 7. Features

## 7.1 Dashboard (Home Screen)

* Displays all active lists
* Separate tab for:

  * Active lists
  * Archived lists

### Actions:

* Create new list
* Open list
* Duplicate list
* Archive / Unarchive
* Delete (with confirmation)

---

## 7.2 Create List

* Opens in a new page/view

### Inputs:

* Name (required)
* Type:

  * Shopping
  * Restaurant
* Currency:

  * BRL
  * USD
* Tax/Tip %

---

## 7.3 List Detail Page

### Features:

* Add items via floating “+” button
* Edit items inline or via form
* Reorder items (drag & drop or controls)
* Toggle:

  * Selected
  * Include in tax

---

### Empty State:

* Show hint: “Add your first item”

---

## 7.4 Item Management

### Add Item:

* Name (required)
* Quantity (default = 1, decimal allowed)
* Unit price (optional)

### Edit Item:

* All fields editable

---

## 7.5 Totals Display

Show clearly:

* Total items (all)
* Total selected items
* Total with tax
* Total selected with tax

---

## 7.6 Import / Export

### Export:

* Button to download `.json` file
* Includes all lists and items

### Import:

* Upload `.json`
* Replaces all existing data

---

## 7.7 Duplicate List

* Copies entire list:

  * Items
  * Prices
  * Tax %
* New name: `"Copy of {original}"`

---

## 7.8 Delete List

* Requires confirmation modal

---

## 7.9 Dark Mode

* Manual toggle

---

## 8. Data Persistence

### Strategy:

* Single JSON object stored in LocalStorage

### Example:

```json
{
  "lists": [
    {
      "id": "123",
      "name": "Supermarket",
      "type": "shopping",
      "currency": "BRL",
      "taxPercentage": 10,
      "archived": false,
      "items": [
        {
          "id": "i1",
          "name": "Milk",
          "quantity": 2,
          "unitPrice": 5.5,
          "selected": true,
          "includeInTax": true
        }
      ]
    }
  ]
}
```

---

## 9. Validation Rules

* Item name: required
* Quantity: default = 1, must be >= 0
* Unit price: >= 0
* Tax %: >= 0
* Currency: BRL or USD only

---

## 10. UX Guidelines

* Mobile-first responsive design
* Floating action button for adding items
* Fast interactions (no loading states)
* Clear visual distinction:

  * Selected vs unselected items
* Simple and minimal UI

---

## 11. Performance Constraints

* Designed for dozens of lists (not hundreds)
* Must stay within LocalStorage limits (~5MB)

---

## 12. Future Enhancements (V2+)

* Bill splitting (restaurant)
* Multi-user sharing
* Cloud sync
* Analytics / charts
* Saved item templates
* PWA support (installable app)

---

## 13. Success Criteria

* User can create a list in < 10 seconds
* User can add item in < 3 seconds
* Totals update instantly
* App works fully offline
* Data persists reliably across sessions

---
