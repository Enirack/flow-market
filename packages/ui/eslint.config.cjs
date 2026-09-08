const { base, react } = require('@flowmarket/config/eslint-preset');

module.exports = [
  ...base,
  ...react,
  {
    // Composants primitifs génériques : le contenu (children) est toujours fourni
    // par l'appelant via les props, jamais visible statiquement par le linter ici.
    rules: {
      'jsx-a11y/anchor-has-content': 'off',
      'jsx-a11y/heading-has-content': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
    },
  },
];
