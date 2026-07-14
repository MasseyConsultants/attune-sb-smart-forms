// Author: Robert Massey | Created: 2026-07-14 | Module: Web / Workflow Builder
// Purpose: Lets the start node render the bound form's details (SB-020).
// React Flow instantiates node components itself, so the builder shares the
// trigger form through context instead of node data — form facts never get
// serialized into the saved graph.

'use client';

import { createContext } from 'react';

export interface TriggerFieldInfo {
  readonly id: string;
  readonly label: string;
  readonly type: string;
}

export interface TriggerFormInfo {
  readonly formName: string | null;
  readonly fields: readonly TriggerFieldInfo[];
}

export const TriggerFormContext = createContext<TriggerFormInfo>({
  formName: null,
  fields: [],
});
