const { argv } = require('process');
const { distance } = require('./mathHelpers');
const fs = require('node:fs/promises');
const path = require('path');
const folderPath = 'dataPoints';
const fileName = 'points.txt';
const os = require('os');
const filePath = path.join(__dirname, folderPath, fileName);

// destructure args from the process.argv array
const [, , x1, y1, x2, y2] = argv;

// A function called processInput receive userInput ✅
const processInput = async userInput => {
	try {
		// Create a folder called dataPoints ✅
		await fs.mkdir(folderPath, { recursive: true });

		// Write userInput info into points.txt ✅
		await fs.writeFile(filePath, userInput);
		console.log('Content written to file');

		// Calculate distance and append to file
		const distanceCalculation = distance(
			Number(x1),
			Number(y1),
			Number(x2),
			Number(y2)
		);
		const distanceMsg = `${os.EOL}The distance between your two points: (${x1},${y1}), (${x2},${y2}) is ${distanceCalculation}`;
		await fs.appendFile(filePath, distanceMsg);
	} catch (err) {
		throw new Error(err);
	}
};

async function main() {
	await processInput(`${x1}, ${y1}, ${x2}, ${y2}`);
	console.log('program completed!');
}

main();
