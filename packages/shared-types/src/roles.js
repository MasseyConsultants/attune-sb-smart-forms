'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ROLE_LEVEL = exports.Role = void 0;
var Role;
(function (Role) {
  Role['PLATFORM_ADMIN'] = 'PLATFORM_ADMIN';
  Role['OWNER'] = 'OWNER';
  Role['ADMIN'] = 'ADMIN';
  Role['BUILDER'] = 'BUILDER';
  Role['VIEWER'] = 'VIEWER';
})(Role || (exports.Role = Role = {}));
exports.ROLE_LEVEL = {
  [Role.PLATFORM_ADMIN]: 100,
  [Role.OWNER]: 80,
  [Role.ADMIN]: 60,
  [Role.BUILDER]: 40,
  [Role.VIEWER]: 10,
};
//# sourceMappingURL=roles.js.map
