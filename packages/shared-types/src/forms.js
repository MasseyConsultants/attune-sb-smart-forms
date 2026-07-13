'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SubmissionStatus = exports.FormStatus = void 0;
var FormStatus;
(function (FormStatus) {
  FormStatus['DRAFT'] = 'DRAFT';
  FormStatus['PUBLISHED'] = 'PUBLISHED';
  FormStatus['ARCHIVED'] = 'ARCHIVED';
})(FormStatus || (exports.FormStatus = FormStatus = {}));
var SubmissionStatus;
(function (SubmissionStatus) {
  SubmissionStatus['DRAFT'] = 'DRAFT';
  SubmissionStatus['SUBMITTED'] = 'SUBMITTED';
  SubmissionStatus['IN_REVIEW'] = 'IN_REVIEW';
  SubmissionStatus['APPROVED'] = 'APPROVED';
  SubmissionStatus['REJECTED'] = 'REJECTED';
  SubmissionStatus['OVER_LIMIT'] = 'OVER_LIMIT';
})(SubmissionStatus || (exports.SubmissionStatus = SubmissionStatus = {}));
//# sourceMappingURL=forms.js.map
