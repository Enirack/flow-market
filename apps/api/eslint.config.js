const { base } = require('@flowmarket/config/eslint-preset');

module.exports = [
  ...base,
  {
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
