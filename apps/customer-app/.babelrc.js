module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "@react-native/babel-preset",
        {
          useTransformReactJSXExperimental: true,
          runtime: "automatic",
        },
      ],
    ],
  };
};
