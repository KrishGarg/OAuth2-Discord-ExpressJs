const path = require("path");
const fs = require("fs");

const indexFile = path.join(__dirname, "../index.js");

const main = () => {
  const content = fs.readFileSync(indexFile, {
    encoding: "utf-8",
  });

  const newContent = content.replace(/\/\*([\s\S]*?)\*\//g, "");

  fs.writeFileSync(indexFile, newContent);
};

main();
