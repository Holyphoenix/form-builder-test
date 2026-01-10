import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/form-builder.ts',
      name: 'FormBuilder',
      fileName: 'form-builder',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  }
});
