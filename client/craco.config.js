module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Suppress the "Critical dependency" warning from react-datepicker
      webpackConfig.ignoreWarnings = [
        {
          module: /node_modules\/react-datepicker/,
          message: /Critical dependency: the request of a dependency is an expression/,
        },
      ];
      return webpackConfig;
    },
  },
};
