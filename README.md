# Lit Form Builder with TanStack Virtual

A customizable, high-performance form builder built with Lit and TanStack Virtual, featuring infinite scrolling, drag-and-drop, and JSON export capabilities.

## Features

- ✨ **Lit-based Web Component** - Fast, lightweight, and framework-agnostic
- 🎯 **TanStack Virtual Integration** - Efficient virtual scrolling for infinite rows
- 📐 **Customizable Grid** - Default 4 columns, adjustable up to 12
- 🔄 **Infinite Rows** - Always includes an empty last row for adding new fields
- 🎨 **Field Types** - Text, number, email, textarea, select, checkbox, radio
- 🖱️ **Field Selection** - Single and multi-select with Ctrl/Cmd+Click
- 📊 **Attribute Panel** - Edit properties of selected fields
- 💾 **JSON Export/Import** - Save and load form layouts
- 📡 **Event Emission** - Real-time events for layout and selection changes
- ⚡ **Row/Column Resizing** - Flexible field positioning

## Installation

```bash
npm install
```

## Development

Run the development server:

```bash
npm run dev
```

Open your browser to `http://localhost:5173` to see the form builder in action.

## Build

Build the library:

```bash
npm run build
```

## Usage

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="./dist/form-builder.js"></script>
</head>
<body>
  <form-builder id="myFormBuilder"></form-builder>

  <script type="module">
    const formBuilder = document.getElementById('myFormBuilder');
    
    // Set initial fields
    formBuilder.fields = [
      {
        id: 'field-1',
        type: 'text',
        label: 'Name',
        placeholder: 'Enter your name',
        required: true,
        row: 0,
        column: 0
      }
    ];

    // Listen to events
    formBuilder.addEventListener('layout-change', (e) => {
      console.log('Layout changed:', e.detail);
    });

    formBuilder.addEventListener('selection-change', (e) => {
      console.log('Selection changed:', e.detail);
    });
  </script>
</body>
</html>
```

### Properties

- `columns` (number) - Number of grid columns (default: 4)
- `fields` (FormField[]) - Array of form fields

### Field Interface

```typescript
interface FormField {
  id: string;
  type: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select fields
  row: number;
  column: number;
  columnSpan?: number; // Future feature
  rowSpan?: number; // Future feature
}
```

### Events

- `layout-change` - Emitted when fields are added, removed, or modified
- `selection-change` - Emitted when field selection changes

### Methods

The component exposes methods through the custom element API:

```javascript
// Export layout as JSON
const layout = formBuilder.getLayoutJSON();

// Programmatically export to file
formBuilder.exportJSON();
```

## Interacting with the Form Builder

1. **Add Fields** - Double-click on any empty cell to add a new field
2. **Select Fields** - Click on a field to select it
3. **Multi-Select** - Hold Ctrl (Windows) or Cmd (Mac) while clicking to select multiple fields
4. **Edit Properties** - Select a field and use the sidebar to edit its properties
5. **Delete Fields** - Select fields and click the "Delete" button in the sidebar
6. **Adjust Columns** - Change the "Grid Columns" value in the sidebar
7. **Export Layout** - Click "Export JSON" to download the layout as a JSON file
8. **Import Layout** - Click "Load JSON" to import a previously saved layout

## Architecture

- **Lit** - Modern web component framework for reactive UI
- **TanStack Virtual** - High-performance virtual scrolling for large lists
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server

## License

ISC
