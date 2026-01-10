# Lit Form Builder with TanStack Virtual

A customizable, high-performance form builder built with Lit and TanStack Virtual, featuring infinite scrolling, drag-and-drop, and JSON export capabilities.

## Features

- ✨ **Lit-based Web Component** - Fast, lightweight, and framework-agnostic
- 🎯 **Virtual Scrolling** - Efficient rendering for infinite rows
- 📐 **Customizable Grid** - Default 4 columns, adjustable 1-12 via toolbar
- 🎨 **Field Palette** - Drag field types from left sidebar to add them
- 🔄 **Drag & Drop** - Drag fields to reposition them on the grid
- ↔️ **Field Resizing** - Resize fields by dragging edges (visual handles included)
- 🔄 **Infinite Rows** - Always includes an empty last row for adding new fields
- 📝 **Field Types** - Text, number, email, textarea, select, checkbox, radio
- 🖱️ **Field Selection** - Single and multi-select with Ctrl/Cmd+Click
- 📊 **Properties Panel** - Edit field attributes with proper overflow handling
- 💾 **JSON Export/Import** - Save and load form layouts
- 📡 **Event Emission** - Real-time events for layout and selection changes

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
// Get the current layout as JSON
const layout = formBuilder.getLayoutJSON();
// Returns: { columns: 4, fields: [...] }

// Programmatically export layout to a file
formBuilder.exportJSON();

// Access fields array
const fields = formBuilder.fields;

// Set fields programmatically
formBuilder.fields = [
  {
    id: 'my-field',
    type: 'text',
    label: 'Custom Field',
    row: 0,
    column: 0
  }
];

// Change number of columns
formBuilder.columns = 6;
```

### Loading an Example Layout

Try loading the included `example-layout.json` file using the "Load JSON" button in the form builder interface.

## Interacting with the Form Builder

1. **Add Fields from Palette** - Drag a field type from the left sidebar to any empty cell on the grid
2. **Add Fields by Double-Click** - Double-click on any empty cell to add a text field
3. **Move Fields** - Click and drag existing fields to reposition them on the grid
4. **Resize Fields** - Hover over field edges to see resize handles, then drag to resize (visual feedback provided)
5. **Select Fields** - Click on a field to select it
6. **Multi-Select** - Hold Ctrl (Windows) or Cmd (Mac) while clicking to select multiple fields
7. **Edit Properties** - Select a field and use the right sidebar to edit its properties
8. **Delete Fields** - Select fields and click the "Delete" button in the properties panel
9. **Adjust Grid Columns** - Use the "Grid Columns" input in the toolbar at the top
10. **Export Layout** - Click "Export JSON" to download the layout as a JSON file
11. **Import Layout** - Click "Load JSON" to import a previously saved layout

## Performance Testing

The form builder includes comprehensive performance testing tools to verify virtual scrolling efficiency with large datasets.

### Manual Performance Test

Open the performance test page in your browser:

```bash
npm run dev
# Then navigate to http://localhost:5173/performance-test.html
```

**Features:**
- Load 1,000, 10,000, or custom number of fields
- Real-time performance metrics (load time, render time, memory usage)
- Automatic scroll performance testing (FPS measurement)
- Visual console with detailed performance logs
- Test collision detection with large datasets

**What's Measured:**
- **Total Fields** - Number of fields loaded
- **Load Time** - Time to generate and apply all fields
- **Initial Render** - Time for first render to complete
- **Memory Usage** - JavaScript heap size (Chrome only)
- **Scroll FPS** - Frames per second during smooth scrolling
- **Visible Rows** - Number of rows actually rendered (virtual scrolling)

### Automated Performance Test

Run automated tests with Playwright:

```bash
# Install Playwright if not already installed
npm install --save-dev playwright

# Run default test (10,000 fields)
npm run test:performance

# Run with 1,000 fields
npm run test:performance:1k

# Run with 5,000 fields
npm run test:performance:5k

# Run with custom count
node performance-test.js --count=15000
```

The automated test will:
1. Launch a browser and load the performance test page
2. Automatically load the specified number of fields
3. Measure and display all performance metrics
4. Run scroll performance tests
5. Take a screenshot of the results
6. Evaluate performance and provide feedback

**Example Output:**
```
🚀 Starting Performance Test
   Field Count: 10,000
   ----------------------------------------

   ✓ Loaded 10000 fields in 1247ms
   ✓ Initial render: 143ms
   Memory usage: 145.23 MB
   Visible rows: 8 (virtual scrolling active)

   📊 Performance Metrics:
   ----------------------------------------
   Total Fields:     10,000
   Load Time:        1247ms
   Initial Render:   143ms
   Memory Usage:     145.23 MB
   Visible Rows:     8
   Scroll FPS:       58.3 fps
   ----------------------------------------

   ✅ Performance Evaluation:
   ----------------------------------------
   ✓ Render Time: EXCELLENT (<500ms)
   ✓ Scroll FPS: EXCELLENT (50+ fps)
   ----------------------------------------
```

### Performance Benchmarks

Expected performance on modern hardware:

| Field Count | Load Time | Render Time | Memory | Scroll FPS |
|------------|-----------|-------------|--------|------------|
| 1,000      | < 200ms   | < 50ms      | ~30MB  | 60 fps     |
| 5,000      | < 600ms   | < 100ms     | ~80MB  | 58+ fps    |
| 10,000     | < 1500ms  | < 200ms     | ~150MB | 55+ fps    |

**Key Points:**
- Only 6-10 rows are rendered at any time (virtual scrolling)
- Scroll performance remains smooth even with 10k+ fields
- Memory usage scales linearly with field count
- Initial render is fast due to virtual scrolling optimization

## Architecture

- **Lit** - Modern web component framework for reactive UI
- **Virtual Scrolling** - Custom implementation for high-performance rendering of infinite rows
  - Only renders visible rows plus overscan buffer
  - Efficient memory usage even with thousands of potential rows
  - Smooth scrolling with `transform: translateY()` positioning
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server

### Virtual Scrolling Implementation

The form builder uses a custom virtual scrolling implementation that:
- Calculates which rows are visible based on scroll position and container height
- Renders only visible rows plus a small overscan buffer (3 rows above/below)
- Uses absolute positioning with CSS transforms for smooth scrolling
- Automatically adjusts the total height based on the number of rows
- Always ensures at least 10 rows and includes an empty last row for adding fields

## License

ISC
