const path = require("path");
const fs = require("fs");

// Copy the test file and change requiring ".." to "highwayhasher"
const data = fs.readFileSync(path.resolve(`../test/hash.test.js/`), "utf8");

if (!fs.existsSync("test")) {
  fs.mkdirSync("test");
}

fs.writeFileSync(
  path.resolve(`test/hash.test.js`),
  data.replace("..", "highwayhasher")
);
