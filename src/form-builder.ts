import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * Form Builder Component with Virtual Scrolling
 * 
 * This component uses a custom virtual scrolling implementation inspired by TanStack Virtual.
 * While @tanstack/virtual-core is available as a dependency, we implemented a simpler
 * custom solution that integrates better with Lit's reactive rendering system.
 * 
 * The virtual scrolling approach:
 * - Only renders visible rows plus an overscan buffer
 * - Uses scroll position to calculate which rows to render
 * - Positions rows with CSS transforms for smooth scrolling
 * - Automatically adjusts for dynamic row counts
 */

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  row: number;
  column: number;
  columnSpan?: number;
  rowSpan?: number;
}

export interface LayoutConfig {
  columns: number;
  fields: FormField[];
}

@customElement('form-builder')
export class FormBuilder extends LitElement {
  @property({ type: Number }) columns = 4;
  @property({ type: Array }) fields: FormField[] = [];
  
  @state() private selectedFieldIds: Set<string> = new Set();
  @state() private scrollTop = 0;
  @state() private containerHeight = 600;
  @state() private draggedField: FormField | null = null;
  @state() private draggedFieldType: string | null = null;
  @state() private dragOverCell: { row: number; column: number } | null = null;
  @state() private resizingField: { field: FormField; edge: string } | null = null;
  @state() private collisionWarning: { row: number; column: number } | null = null;
  
  private readonly ROW_HEIGHT = 88; // 80px min cell + 8px gap
  private readonly OVERSCAN = 3;

  static styles = css`
    :host {
      display: flex;
      height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .form-builder {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .field-palette {
      width: 200px;
      background: #f5f5f5;
      border-right: 1px solid #ddd;
      padding: 16px;
      overflow-y: auto;
    }

    .field-palette h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #333;
    }

    .palette-item {
      padding: 12px;
      margin-bottom: 8px;
      background: white;
      border: 2px solid #ddd;
      border-radius: 4px;
      cursor: grab;
      font-size: 14px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .palette-item:hover {
      border-color: #4CAF50;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .palette-item:active {
      cursor: grabbing;
    }

    .palette-item-icon {
      font-size: 18px;
    }

    .grid-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-right: 1px solid #ddd;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      background: #fff;
      border-bottom: 1px solid #ddd;
    }

    .toolbar-label {
      font-weight: 600;
      font-size: 14px;
      color: #555;
    }

    .toolbar-input {
      width: 80px;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 14px;
    }

    .grid-header {
      display: grid;
      grid-template-columns: repeat(var(--columns), 1fr);
      gap: 8px;
      padding: 16px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
      font-weight: 600;
    }

    .grid-header-cell {
      padding: 8px;
      text-align: center;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .scroll-container {
      flex: 1;
      overflow: auto;
      position: relative;
    }

    .virtual-rows {
      position: relative;
      width: 100%;
    }

    .virtual-row {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      display: grid;
      grid-template-columns: repeat(var(--columns), 1fr);
      gap: 8px;
      padding: 0 16px;
    }

    .grid-cell {
      min-height: 80px;
      padding: 6px;
      background: white;
      border: 2px solid #ddd;
      border-radius: 4px;
      cursor: move;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow: hidden;
      position: relative;
    }

    .grid-cell.resizing {
      opacity: 0.8;
      border-color: #2196F3;
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
    }

    .grid-cell:hover {
      border-color: #4CAF50;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .grid-cell.selected {
      border-color: #2196F3;
      background: #E3F2FD;
      box-shadow: 0 2px 8px rgba(33,150,243,0.3);
    }

    .grid-cell.drag-over {
      border-color: #FF9800;
      background: #FFF3E0;
      border-style: dashed;
    }

    .grid-cell.empty {
      background: #fafafa;
      border-style: dashed;
      cursor: default;
    }

    .grid-cell.empty:hover {
      border-color: #ddd;
      box-shadow: none;
    }

    .grid-cell.empty.drag-over {
      border-color: #4CAF50;
      background: #E8F5E9;
    }

    .grid-cell.collision-warning {
      border-color: #FF5722 !important;
      background: #FFEBEE !important;
      animation: pulse-warning 0.6s ease-in-out infinite;
    }

    @keyframes pulse-warning {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    .field-label {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .field-type {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .field-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 13px;
      box-sizing: border-box;
    }

    .field-input:focus {
      outline: none;
      border-color: #4CAF50;
    }

    textarea.field-input {
      resize: none;
      min-height: 60px;
      max-height: 60px;
    }

    .resize-handle {
      position: absolute;
      background: rgba(33, 150, 243, 0.3);
      z-index: 10;
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
    }

    .grid-cell:hover .resize-handle {
      opacity: 1;
    }

    .resize-handle:hover {
      background: rgba(33, 150, 243, 0.8);
    }

    .resize-handle.resize-right {
      right: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
    }

    .resize-handle.resize-bottom {
      left: 0;
      right: 0;
      bottom: 0;
      height: 6px;
      cursor: row-resize;
    }

    .resize-handle.resize-corner {
      right: 0;
      bottom: 0;
      width: 12px;
      height: 12px;
      cursor: nwse-resize;
    }

    .resize-handle.resize-corner::after {
      content: '';
      position: absolute;
      right: 2px;
      bottom: 2px;
      width: 8px;
      height: 8px;
      border-right: 2px solid #999;
      border-bottom: 2px solid #999;
    }

    .sidebar {
      width: 300px;
      padding: 16px;
      background: #fafafa;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .sidebar h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #333;
    }

    .attribute-group {
      margin-bottom: 16px;
      padding: 12px;
      background: white;
      border-radius: 4px;
      border: 1px solid #ddd;
    }

    .attribute-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #555;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .attribute-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 13px;
      box-sizing: border-box;
    }

    .button {
      padding: 8px 16px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }

    .button:hover {
      background: #45a049;
    }

    .button.secondary {
      background: #2196F3;
    }

    .button.secondary:hover {
      background: #0b7dda;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    .no-selection {
      color: #999;
      text-align: center;
      padding: 32px 16px;
    }

  `;

  firstUpdated() {
    const scrollElement = this.shadowRoot?.querySelector('.scroll-container') as HTMLElement;
    if (scrollElement) {
      this.containerHeight = scrollElement.clientHeight;
      
      scrollElement.addEventListener('scroll', () => {
        this.scrollTop = scrollElement.scrollTop;
      });

      // Observe resize
      const resizeObserver = new ResizeObserver(() => {
        this.containerHeight = scrollElement.clientHeight;
      });
      resizeObserver.observe(scrollElement);
    }
  }

  // Collision Detection Methods
  private checkCollision(row: number, column: number, columnSpan: number, rowSpan: number, excludeFieldId?: string): boolean {
    // Check if the field would overlap with any existing fields
    for (const field of this.fields) {
      if (excludeFieldId && field.id === excludeFieldId) continue;
      
      const fieldColumnSpan = field.columnSpan || 1;
      const fieldRowSpan = field.rowSpan || 1;
      
      // Check if there's an overlap
      const columnOverlap = column < field.column + fieldColumnSpan && 
                           column + columnSpan > field.column;
      const rowOverlap = row < field.row + fieldRowSpan && 
                        row + rowSpan > field.row;
      
      if (columnOverlap && rowOverlap) {
        return true; // Collision detected
      }
    }
    return false;
  }


  private getVirtualRows() {
    const maxRow = this.fields.reduce((max, field) => Math.max(max, field.row), -1);
    const totalRows = Math.max(maxRow + 2, 10); // Always have at least 10 rows, +1 for empty last row
    
    const startIndex = Math.max(0, Math.floor(this.scrollTop / this.ROW_HEIGHT) - this.OVERSCAN);
    const endIndex = Math.min(
      totalRows - 1,
      Math.ceil((this.scrollTop + this.containerHeight) / this.ROW_HEIGHT) + this.OVERSCAN
    );
    
    const virtualRows = [];
    for (let i = startIndex; i <= endIndex; i++) {
      virtualRows.push({
        index: i,
        start: i * this.ROW_HEIGHT,
        size: this.ROW_HEIGHT
      });
    }
    
    return {
      virtualRows,
      totalHeight: totalRows * this.ROW_HEIGHT
    };
  }

  private getFieldsInRow(rowIndex: number): (FormField | null)[] {
    const rowFields = this.fields.filter(f => f.row === rowIndex);
    const cells: (FormField | null)[] = new Array(this.columns).fill(null);
    
    rowFields.forEach(field => {
      if (field.column < this.columns) {
        cells[field.column] = field;
      }
    });
    
    return cells;
  }

  private handleCellClick(field: FormField | null, event: MouseEvent) {
    if (!field) return;

    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      if (this.selectedFieldIds.has(field.id)) {
        this.selectedFieldIds.delete(field.id);
      } else {
        this.selectedFieldIds.add(field.id);
      }
    } else {
      // Single select
      this.selectedFieldIds.clear();
      this.selectedFieldIds.add(field.id);
    }
    
    this.selectedFieldIds = new Set(this.selectedFieldIds);
    this.emitSelectionChange();
  }

  private handleCellDoubleClick(rowIndex: number, colIndex: number) {
    // Add new field on double-click
    const existingField = this.fields.find(f => f.row === rowIndex && f.column === colIndex);
    if (!existingField) {
      const newField: FormField = {
        id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'text',
        label: `Field ${this.fields.length + 1}`,
        placeholder: 'Enter value',
        row: rowIndex,
        column: colIndex,
      };
      
      this.fields = [...this.fields, newField];
      this.emitLayoutChange();
    }
  }

  // Drag and Drop Methods
  private handlePaletteDragStart(event: DragEvent, fieldType: string) {
    this.draggedFieldType = fieldType;
    event.dataTransfer!.effectAllowed = 'copy';
    event.dataTransfer!.setData('fieldType', fieldType);
  }

  private handleFieldDragStart(event: DragEvent, field: FormField) {
    this.draggedField = field;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('fieldId', field.id);
    
    // Make the dragged element semi-transparent
    const target = event.target as HTMLElement;
    target.style.opacity = '0.5';
  }

  private handleFieldDragEnd(event: DragEvent) {
    const target = event.target as HTMLElement;
    target.style.opacity = '1';
    this.draggedField = null;
    this.draggedFieldType = null;
    this.dragOverCell = null;
  }

  private handleCellDragOver(event: DragEvent, row: number, column: number) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = this.draggedField ? 'move' : 'copy';
    this.dragOverCell = { row, column };
    
    // Check for collisions and show warning
    const columnSpan = this.draggedField?.columnSpan || 1;
    const rowSpan = this.draggedField?.rowSpan || 1;
    const excludeId = this.draggedField?.id;
    
    if (this.checkCollision(row, column, columnSpan, rowSpan, excludeId)) {
      this.collisionWarning = { row, column };
    } else {
      this.collisionWarning = null;
    }
  }

  private handleCellDragLeave() {
    this.dragOverCell = null;
    this.collisionWarning = null;
  }

  private handleCellDrop(event: DragEvent, row: number, column: number) {
    event.preventDefault();
    this.dragOverCell = null;
    this.collisionWarning = null;

    if (this.draggedField) {
      // Moving existing field
      const columnSpan = this.draggedField.columnSpan || 1;
      const rowSpan = this.draggedField.rowSpan || 1;
      
      // Check for collisions BEFORE moving - block the drop if collision detected
      if (this.checkCollision(row, column, columnSpan, rowSpan, this.draggedField.id)) {
        // Collision detected - don't allow the drop
        this.draggedField = null;
        return;
      }
      
      // No collision - update the field position
      const updatedField = { ...this.draggedField, row, column };
      this.fields = this.fields.map(f => 
        f.id === this.draggedField!.id 
          ? updatedField
          : f
      );
      
      this.draggedField = null;
      this.emitLayoutChange();
    } else if (this.draggedFieldType) {
      // Adding new field from palette
      
      // Check for collisions BEFORE adding - block the drop if collision detected
      if (this.checkCollision(row, column, 1, 1)) {
        // Collision detected - don't allow the drop
        this.draggedFieldType = null;
        return;
      }
      
      const newField: FormField = {
        id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: this.draggedFieldType as any,
        label: `${this.draggedFieldType.charAt(0).toUpperCase() + this.draggedFieldType.slice(1)} Field`,
        placeholder: `Enter ${this.draggedFieldType}`,
        row,
        column,
      };
      
      if (this.draggedFieldType === 'select') {
        newField.options = ['Option 1', 'Option 2', 'Option 3'];
      }
      
      // Add the new field
      this.fields = [...this.fields, newField];
      
      this.draggedFieldType = null;
      this.emitLayoutChange();
    }
  }

  // Resize Methods
  private handleResizeStart(event: MouseEvent, field: FormField, edge: string) {
    event.stopPropagation();
    event.preventDefault();
    this.resizingField = { field, edge };
    
    const startX = event.clientX;
    const startY = event.clientY;
    const gridElement = this.shadowRoot?.querySelector('.scroll-container');
    const cellElement = (event.target as HTMLElement).closest('.grid-cell') as HTMLElement;
    
    if (!gridElement || !cellElement) return;
    
    // Add visual feedback class
    cellElement.classList.add('resizing');
    
    const startWidth = cellElement.offsetWidth;
    const startHeight = cellElement.offsetHeight;
    const cellRect = cellElement.getBoundingClientRect();
    
    // Calculate cell width (approximate column width)
    const gridRect = gridElement.getBoundingClientRect();
    const columnWidth = (gridRect.width - 32) / this.columns; // 32 = padding
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!this.resizingField) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      if (edge === 'right' || edge === 'corner') {
        // Calculate new column span based on width change
        // Use a threshold of 30% into next column for snapping (even earlier)
        const newWidth = startWidth + deltaX;
        const newColumnSpan = Math.max(1, Math.floor(newWidth / columnWidth + 0.3));
        
        // Update field's columnSpan
        this.fields = this.fields.map(f => 
          f.id === field.id 
            ? { ...f, columnSpan: newColumnSpan }
            : f
        );
        this.requestUpdate();
      }
      
      if (edge === 'bottom' || edge === 'corner') {
        // Calculate new row span based on height change
        // Use a threshold of 30% into next row for snapping
        const newHeight = startHeight + deltaY;
        const newRowSpan = Math.max(1, Math.floor(newHeight / this.ROW_HEIGHT + 0.3));
        
        // Update field's rowSpan
        this.fields = this.fields.map(f => 
          f.id === field.id 
            ? { ...f, rowSpan: newRowSpan }
            : f
        );
        this.requestUpdate();
      }
    };
    
    const handleMouseUp = () => {
      // Remove visual feedback class
      cellElement.classList.remove('resizing');
      
      // Check for collisions after resize and revert if collision detected
      if (this.resizingField) {
        const resizedField = this.fields.find(f => f.id === this.resizingField!.field.id);
        if (resizedField) {
          const columnSpan = resizedField.columnSpan || 1;
          const rowSpan = resizedField.rowSpan || 1;
          
          if (this.checkCollision(resizedField.row, resizedField.column, columnSpan, rowSpan, resizedField.id)) {
            // Collision detected - revert to original size
            const originalColumnSpan = this.resizingField.field.columnSpan || 1;
            const originalRowSpan = this.resizingField.field.rowSpan || 1;
            
            this.fields = this.fields.map(f => 
              f.id === this.resizingField!.field.id 
                ? { ...f, columnSpan: originalColumnSpan, rowSpan: originalRowSpan }
                : f
            );
            this.requestUpdate();
          }
        }
      }
      
      this.resizingField = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      this.emitLayoutChange();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  private getSelectedFields(): FormField[] {
    return this.fields.filter(f => this.selectedFieldIds.has(f.id));
  }

  private getCommonAttributes(): Partial<FormField> {
    const selected = this.getSelectedFields();
    if (selected.length === 0) return {};
    if (selected.length === 1) return selected[0];

    // Find common attributes
    const common: any = {};
    const firstField = selected[0];
    
    for (const key of Object.keys(firstField)) {
      const allSame = selected.every(f => (f as any)[key] === (firstField as any)[key]);
      if (allSame) {
        common[key] = (firstField as any)[key];
      }
    }

    return common;
  }

  private updateSelectedFields(updates: Partial<FormField>) {
    this.fields = this.fields.map(field => {
      if (this.selectedFieldIds.has(field.id)) {
        return { ...field, ...updates };
      }
      return field;
    });
    
    this.emitLayoutChange();
  }

  private deleteSelectedFields() {
    this.fields = this.fields.filter(f => !this.selectedFieldIds.has(f.id));
    this.selectedFieldIds.clear();
    this.selectedFieldIds = new Set();
    this.emitLayoutChange();
  }

  private emitLayoutChange() {
    const event = new CustomEvent('layout-change', {
      detail: this.getLayoutJSON(),
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private emitSelectionChange() {
    const event = new CustomEvent('selection-change', {
      detail: {
        selectedIds: Array.from(this.selectedFieldIds),
        selectedFields: this.getSelectedFields()
      },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private getLayoutJSON(): LayoutConfig {
    return {
      columns: this.columns,
      fields: this.fields
    };
  }

  private exportJSON() {
    const json = JSON.stringify(this.getLayoutJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'form-layout.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private loadJSON(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const layout = JSON.parse(e.target?.result as string) as LayoutConfig;
        this.columns = layout.columns;
        this.fields = layout.fields;
        this.selectedFieldIds.clear();
        this.selectedFieldIds = new Set();
        this.emitLayoutChange();
      } catch (error) {
        console.error('Error loading JSON:', error);
      }
    };
    reader.readAsText(file);
  }

  private renderFieldContent(field: FormField) {
    switch (field.type) {
      case 'textarea':
        return html`
          <div class="field-label">${field.label}</div>
          <div class="field-type">${field.type}</div>
          <textarea class="field-input" placeholder="${field.placeholder || ''}" ?required="${field.required}"></textarea>
        `;
      case 'select':
        return html`
          <div class="field-label">${field.label}</div>
          <div class="field-type">${field.type}</div>
          <select class="field-input" ?required="${field.required}">
            ${field.options?.map(opt => html`<option>${opt}</option>`)}
          </select>
        `;
      case 'checkbox':
      case 'radio':
        return html`
          <div class="field-label">
            <input type="${field.type}" ?required="${field.required}">
            ${field.label}
          </div>
          <div class="field-type">${field.type}</div>
        `;
      default:
        return html`
          <div class="field-label">${field.label}</div>
          <div class="field-type">${field.type}</div>
          <input type="${field.type}" class="field-input" placeholder="${field.placeholder || ''}" ?required="${field.required}">
        `;
    }
  }

  render() {
    const selectedFields = this.getSelectedFields();
    const commonAttrs = this.getCommonAttributes();
    const { virtualRows, totalHeight } = this.getVirtualRows();
    const maxRow = this.fields.reduce((max, field) => Math.max(max, field.row), -1);
    const totalRows = Math.max(maxRow + 2, 10);

    const fieldTypes = [
      { type: 'text', icon: '📝', label: 'Text' },
      { type: 'number', icon: '🔢', label: 'Number' },
      { type: 'email', icon: '📧', label: 'Email' },
      { type: 'textarea', icon: '📄', label: 'Textarea' },
      { type: 'select', icon: '📋', label: 'Select' },
      { type: 'checkbox', icon: '☑️', label: 'Checkbox' },
      { type: 'radio', icon: '🔘', label: 'Radio' },
    ];

    return html`
      <div class="form-builder">
        <!-- Field Palette Sidebar -->
        <div class="field-palette">
          <h3>Field Types</h3>
          ${fieldTypes.map(ft => html`
            <div 
              class="palette-item"
              draggable="true"
              @dragstart="${(e: DragEvent) => this.handlePaletteDragStart(e, ft.type)}"
            >
              <span class="palette-item-icon">${ft.icon}</span>
              <span>${ft.label}</span>
            </div>
          `)}
        </div>

        <div class="grid-container">
          <!-- Toolbar -->
          <div class="toolbar">
            <span class="toolbar-label">Grid Columns:</span>
            <input 
              type="number" 
              class="toolbar-input"
              min="1"
              max="12"
              .value="${this.columns.toString()}"
              @input="${(e: InputEvent) => {
                this.columns = parseInt((e.target as HTMLInputElement).value);
                this.emitLayoutChange();
              }}"
            >
          </div>

          <div class="grid-header" style="--columns: ${this.columns}">
            ${Array.from({ length: this.columns }, (_, i) => html`
              <div class="grid-header-cell">Column ${i + 1}</div>
            `)}
          </div>
          
          <div class="scroll-container">
            <div class="virtual-rows" style="height: ${totalHeight}px">
              ${virtualRows.map(virtualRow => {
                const rowFields = this.getFieldsInRow(virtualRow.index);
                const isLastRow = virtualRow.index === totalRows - 1;
                
                return html`
                  <div 
                    class="virtual-row" 
                    style="--columns: ${this.columns}; transform: translateY(${virtualRow.start}px)"
                  >
                    ${rowFields.map((field, colIndex) => {
                      // Check if this cell should be highlighted during drag
                      const draggedColumnSpan = this.draggedField?.columnSpan || 1;
                      const isDragOver = this.dragOverCell?.row === virtualRow.index && 
                                        this.dragOverCell?.column <= colIndex &&
                                        colIndex < (this.dragOverCell?.column || 0) + draggedColumnSpan;
                      
                      // Check if this cell has a collision warning
                      const hasCollisionWarning = this.collisionWarning && 
                                                  field && 
                                                  this.collisionWarning.row === virtualRow.index &&
                                                  this.collisionWarning.column <= colIndex &&
                                                  colIndex < (this.collisionWarning.column || 0) + draggedColumnSpan;
                      
                      if (!field) {
                        return html`
                          <div 
                            class="grid-cell empty ${isDragOver ? 'drag-over' : ''}"
                            @dblclick="${() => this.handleCellDoubleClick(virtualRow.index, colIndex)}"
                            @dragover="${(e: DragEvent) => this.handleCellDragOver(e, virtualRow.index, colIndex)}"
                            @dragleave="${() => this.handleCellDragLeave()}"
                            @drop="${(e: DragEvent) => this.handleCellDrop(e, virtualRow.index, colIndex)}"
                          >
                            ${isLastRow ? html`<div style="text-align: center; color: #999;">Drag field here or double-click</div>` : ''}
                          </div>
                        `;
                      }
                      
                      return html`
                        <div 
                          class="grid-cell ${this.selectedFieldIds.has(field.id) ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''} ${hasCollisionWarning ? 'collision-warning' : ''}"
                          style="grid-column: span ${field.columnSpan || 1}; grid-row: span ${field.rowSpan || 1};"
                          draggable="true"
                          @click="${(e: MouseEvent) => this.handleCellClick(field, e)}"
                          @dragstart="${(e: DragEvent) => this.handleFieldDragStart(e, field)}"
                          @dragend="${(e: DragEvent) => this.handleFieldDragEnd(e)}"
                          @dragover="${(e: DragEvent) => this.handleCellDragOver(e, virtualRow.index, colIndex)}"
                          @dragleave="${() => this.handleCellDragLeave()}"
                          @drop="${(e: DragEvent) => this.handleCellDrop(e, virtualRow.index, colIndex)}"
                        >
                          ${this.renderFieldContent(field)}
                          
                          <!-- Resize Handles -->
                          <div class="resize-handle resize-right" 
                               @mousedown="${(e: MouseEvent) => this.handleResizeStart(e, field, 'right')}"></div>
                          <div class="resize-handle resize-bottom" 
                               @mousedown="${(e: MouseEvent) => this.handleResizeStart(e, field, 'bottom')}"></div>
                          <div class="resize-handle resize-corner" 
                               @mousedown="${(e: MouseEvent) => this.handleResizeStart(e, field, 'corner')}"></div>
                        </div>
                      `;
                    })}
                  </div>
                `;
              })}
            </div>
          </div>
        </div>

        <div class="sidebar">
          <h3>Properties</h3>
          
          ${selectedFields.length === 0 ? html`
            <div class="no-selection">
              Select a field to edit its properties
            </div>
          ` : html`
            <div class="attribute-group">
              <label class="attribute-label">Label</label>
              <input 
                type="text" 
                class="attribute-input"
                .value="${commonAttrs.label || ''}"
                @input="${(e: InputEvent) => this.updateSelectedFields({ label: (e.target as HTMLInputElement).value })}"
              >
            </div>

            <div class="attribute-group">
              <label class="attribute-label">Type</label>
              <select 
                class="attribute-input"
                .value="${commonAttrs.type || 'text'}"
                @change="${(e: Event) => this.updateSelectedFields({ type: (e.target as HTMLSelectElement).value as any })}"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="email">Email</option>
                <option value="textarea">Textarea</option>
                <option value="select">Select</option>
                <option value="checkbox">Checkbox</option>
                <option value="radio">Radio</option>
              </select>
            </div>

            <div class="attribute-group">
              <label class="attribute-label">Placeholder</label>
              <input 
                type="text" 
                class="attribute-input"
                .value="${commonAttrs.placeholder || ''}"
                @input="${(e: InputEvent) => this.updateSelectedFields({ placeholder: (e.target as HTMLInputElement).value })}"
              >
            </div>

            <div class="attribute-group">
              <label class="attribute-label">
                <input 
                  type="checkbox" 
                  .checked="${commonAttrs.required || false}"
                  @change="${(e: Event) => this.updateSelectedFields({ required: (e.target as HTMLInputElement).checked })}"
                >
                Required
              </label>
            </div>

            ${selectedFields.length === 1 ? html`
              <div class="attribute-group">
                <label class="attribute-label">Row</label>
                <input 
                  type="number" 
                  class="attribute-input"
                  min="0"
                  .value="${commonAttrs.row?.toString() || '0'}"
                  @input="${(e: InputEvent) => this.updateSelectedFields({ row: parseInt((e.target as HTMLInputElement).value) })}"
                >
              </div>

              <div class="attribute-group">
                <label class="attribute-label">Column</label>
                <input 
                  type="number" 
                  class="attribute-input"
                  min="0"
                  max="${this.columns - 1}"
                  .value="${commonAttrs.column?.toString() || '0'}"
                  @input="${(e: InputEvent) => this.updateSelectedFields({ column: parseInt((e.target as HTMLInputElement).value) })}"
                >
              </div>
            ` : ''}

            <div class="actions">
              <button class="button" @click="${() => this.deleteSelectedFields()}">Delete</button>
            </div>
          `}

          <div class="actions" style="margin-top: 32px;">
            <button class="button secondary" @click="${() => this.exportJSON()}">Export JSON</button>
          </div>
          
          <div class="actions">
            <label class="button secondary" style="cursor: pointer; display: inline-block; text-align: center;">
              Load JSON
              <input type="file" accept=".json" style="display: none;" @change="${this.loadJSON}">
            </label>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'form-builder': FormBuilder;
  }
}
