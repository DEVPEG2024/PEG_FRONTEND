// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser', // If you're using TypeScript, otherwise use "babel-eslint"
  parserOptions: {
    ecmaVersion: 2020, // Latest ECMAScript version
    sourceType: 'module', // Allows for the use of imports
    ecmaFeatures: {
      jsx: true, // Enable JSX
    },
  },
  settings: {
    react: {
      version: 'detect', // Automatically detect the version of React
    },
  },
  extends: [
    'eslint:recommended', // Use recommended rules
    'plugin:react/recommended', // Use recommended React rules
    'plugin:prettier/recommended', // Use Prettier's recommended configuration
  ],
  rules: {
    // Customize rules as needed
    'react/prop-types': 'off', // Disable prop-types as we use TypeScript
    'prettier/prettier': 'error', // Show Prettier errors as ESLint errors
    'react/react-in-jsx-scope': 'off',
  },
};
