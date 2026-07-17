// Author: Robert Massey | Module: Field App Babel Config
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo']],
  };
};
