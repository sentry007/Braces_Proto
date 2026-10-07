import { lazy } from 'react';

// Monaco is large, so the editors load as a separate chunk after first paint
export const CodeEditor = lazy(() => import('./CodeEditor'));
export const DiffView = lazy(() => import('./DiffView'));
