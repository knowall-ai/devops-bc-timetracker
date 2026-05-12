const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (_env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    entry: "./src/index.ts",
    devtool: isProduction ? "source-map" : "inline-source-map",
    output: {
      filename: "app.js",
      path: path.resolve(__dirname, "dist"),
      clean: true
    },
    resolve: {
      extensions: [".ts", ".js"]
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: "ts-loader",
          exclude: /node_modules/
        }
      ]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: "public", to: "." },
          { from: "src/styles.css", to: "app.css" },
          { from: "img", to: "img" },
          { from: "README.md", to: "README.md" },
          { from: "PRIVACY.md", to: "PRIVACY.md" },
          { from: "TERMS.md", to: "TERMS.md" },
          { from: "LICENSE", to: "LICENSE" }
        ]
      })
    ]
  };
};
