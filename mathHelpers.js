// mathHelpers.js
const squareRoot = (num) => Math.sqrt(num);

const square = (num) => num * num;

const distance = (x1, y1, x2, y2) => {
  return squareRoot(square(x2 - x1) + square(y2 - y1));
};

module.exports = { distance };