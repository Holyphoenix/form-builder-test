import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

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
  
  private readonly ROW_HEIGHT = 96;
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

    .grid-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-right: 1px solid #ddd;
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
      padding: 12px;
      background: white;
      border: 2px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      gap: 4px;
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

    .grid-cell.empty {
      background: #fafafa;
      border-style: dashed;
      cursor: default;
    }

    .grid-cell.empty:hover {
      border-color: #ddd;
      box-shadow: none;
    }

    .field-label {
      font-weight: 600;
      font-size: 14px;
      color: #333;
    }

    .field-type {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }

    .field-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 13px;
    }

    .field-input:focus {
      outline: none;
      border-color: #4CAF50;
    }

    textarea.field-input {
      resize: vertical;
      min-height: 60px;
    }

    .sidebar {
      width: 300px;
      padding: 16px;
      background: #fafafa;
      overflow-y: auto;
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
    }

    .attribute-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 13px;
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

    .resize-handle {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      cursor: col-resize;
      background: transparent;
    }

    .resize-handle:hover {
      background: #4CAF50;
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

    return html`
      <div class="form-builder">
        <div class="grid-container">
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
                      if (!field) {
                        return html`
                          <div 
                            class="grid-cell empty"
                            @dblclick="${() => this.handleCellDoubleClick(virtualRow.index, colIndex)}"
                          >
                            ${isLastRow ? html`<div style="text-align: center; color: #999;">Double-click to add field</div>` : ''}
                          </div>
                        `;
                      }
                      
                      return html`
                        <div 
                          class="grid-cell ${this.selectedFieldIds.has(field.id) ? 'selected' : ''}"
                          @click="${(e: MouseEvent) => this.handleCellClick(field, e)}"
                        >
                          ${this.renderFieldContent(field)}
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

          <div class="attribute-group" style="margin-top: 32px;">
            <label class="attribute-label">Grid Columns</label>
            <input 
              type="number" 
              class="attribute-input"
              min="1"
              max="12"
              .value="${this.columns.toString()}"
              @input="${(e: InputEvent) => {
                this.columns = parseInt((e.target as HTMLInputElement).value);
                this.emitLayoutChange();
              }}"
            >
          </div>

          <div class="actions">
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
