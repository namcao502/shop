import nextCoreWebVitalsConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitalsConfig,
  {
    settings: {
      // Pin the React version so eslint-plugin-react doesn't call the removed
      // context.getFilename() API (removed in ESLint 10) for version detection.
      react: {
        version: "19",
      },
    },
    rules: {
      // react-hooks/set-state-in-effect is a new rule in react-hooks v5.
      // The codebase uses the common pattern of calling setState inside
      // useEffect to initialise from localStorage / fetch data; these are
      // intentional and not bugs. Disable until patterns are refactored.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
