const fs = require("fs");
const yaml = require("yamljs");
const path = require("path");

const swaggerOptions = {
  explorer: true,
  customCssUrl: "/docs/api.css",
};
const swaggerJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs", "api.json"), "utf8"));
// const swaggerJson = yaml.load(path.join(__dirname,"../docs", "api.yml"));

module.exports = {swaggerJson,swaggerOptions};
