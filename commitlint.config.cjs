/** Conventional Commits — bắt buộc cho mọi commit của dự án. */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        '',
        'api',
        'web',
        'shared',
        'db',
        'auth',
        'catalog',
        'cart',
        'order',
        'admin',
        'infra',
        'deps',
      ],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 120],
  },
};
