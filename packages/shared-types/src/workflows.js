'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NODE_TIER = exports.WorkflowStatus = void 0;
var WorkflowStatus;
(function (WorkflowStatus) {
  WorkflowStatus['DRAFT'] = 'DRAFT';
  WorkflowStatus['PUBLISHED'] = 'PUBLISHED';
  WorkflowStatus['ARCHIVED'] = 'ARCHIVED';
})(WorkflowStatus || (exports.WorkflowStatus = WorkflowStatus = {}));
exports.NODE_TIER = {
  start: 'core',
  end: 'core',
  form: 'core',
  condition: 'core',
  email: 'core',
  pdf_generate: 'core',
  fill_document: 'core',
  send_document: 'core',
  notify: 'core',
  approval: 'growth',
  webhook: 'growth',
  api: 'growth',
  switch: 'growth',
  data_transform: 'growth',
  export: 'growth',
  delay: 'business',
  sub_workflow: 'business',
  excel_generate: 'business',
  loop: 'business',
};
//# sourceMappingURL=workflows.js.map
