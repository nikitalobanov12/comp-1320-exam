const { table } = require('table');
const fs = require('node:fs/promises');

const parseCSV = file => {
	//split the csv into an array where each element is a line
	//If i split with '\n' there are trailing \r's at the end so i split with \r\n and it seems to work
	const splitLines = file.split('\r\n');
	//return a 2d array
	return splitLines.map(line => line.split(','));
};

const parsePlayers = file => {
	const rows = parseCSV(file);
	const header = rows.shift(); //remove the header from the array
	const players = rows;

	//convert the 2d array into an array of objects
	const formattedPlayers = players.map(player => {
		return {
			id: player[0],
			first_name: player[1],
			last_name: player[2],
			country: player[3],
			gender: player[4],
			age: player[5],
			weight: player[6],
			height: player[7],
		};
	});
	return formattedPlayers;
};
function splitGameLine(line) {
	//you can't split the whole line by commas since each line looks like this
	//China,[2,4,5,7,9,11,12,17],[2,8,10,2,2,2,3,3]
	//therefore you need to first remove the country, and then split by the brackets ],[
	//then you can remove the other bracket at the start and end, and then you can split those 2 items by commas to have an array of players & points
	const countrySliceIndex = line.indexOf(',');
	const winningTeam = line.slice(0, countrySliceIndex); //slice the array from index 0 until the first comma (this will be the winning team)

	const remainingFields = line.slice(countrySliceIndex + 1);

	const [playersString, pointsString] = remainingFields.split('],[');

	const cleanPlayersString = playersString.replace('[', '').replace(']', ''); //remove the unneccessary brackets
	const cleanPointsString = pointsString.replace('[', '').replace(']', '');

	const playersArray = cleanPlayersString.split(',').map(num => Number(num)); //split by commas and convert to a number
	const pointsArray = cleanPointsString.split(',').map(num => Number(num));

	return [winningTeam, playersArray, pointsArray];
}

const parseGames = file => {
	const lines = file.trim().split('\r\n');
	const header = lines.shift(); //remove the header from the array
	//loop through each line and split it up further
	const games = lines.map(line => {
		const [winningTeam, players, points] = splitGameLine(line);
		return {
			winningTeam: winningTeam,
			players: players,
			points: points,
		};
	});
	return games;
};

const convertWeightToKg = weight => {
	let value = parseFloat(weight); //take the number without the kg or lbs string
	if (weight.includes('kg'))
		return value; // if the weight is already kg, just return the value
	else return value * 0.453592;
};

const convertHeightToCm = height => {
	const values = height.split('feet');
	const parsedValues = values.map(value => parseInt(value)); //convert the string to an integer & remove the excess info
	parsedValues[0] = parsedValues[0] * 12; //multiply the feet by 12 to get the full inches of the person
	const totalInches = parsedValues.reduce((acc, num) => acc + num, 0);
	const totalCm = totalInches * 2.54;
	return totalCm;
};

//helper filter functions
const filterMale = players => players.filter(player => player.gender === 'M');
const filterFemale = players => players.filter(player => player.gender === 'F');
const filterChinese = players =>
	players.filter(player => player.country === 'China');
const filterCanadian = players =>
	players.filter(player => player.country === 'Canada');
const filterCanadaWins = games =>
	games.filter(game => game.winningTeam === 'Canada');
const filterChineseWins = games =>
	games.filter(game => game.winningTeam === 'China');

//helper sorting functions
const sortByHeight = players => players.sort((a, b) => b.height - a.height);
const sortByWeight = players => players.sort((a, b) => b.weight - a.weight);

const formatForTable = players => {
	const header = ['Name', 'Country', 'Weight'];
	const rows = players.map(p => [
		`${p.first_name} ${p.last_name}`,
		p.country,
		p.weight,
	]);
	return [header, ...rows];
};

const appendToStats = async content => {
	await fs.appendFile('stats.txt', content, 'utf8');
};

async function main() {
	try {
		/* 
        parsing and cleaning up the data into usable data for the questions
        */
		// Read and parse players.csv to a format we can use
		const playersCSV = await fs.readFile('./players.csv', 'utf8');
		const players = parsePlayers(playersCSV);

		//convert the weight and height to standard units for question 1 and 2
		for (const player of players) {
			player.weight = convertWeightToKg(player.weight);
			player.height = convertHeightToCm(player.height);
		}

		// Read and parse games.csv to a format we can use
		const gamesCSV = await fs.readFile('./games.csv', 'utf8');
		const games = parseGames(gamesCSV);

		/* 
        QUESTION 1: Top 5 heaviest male players 
        */
		const malePlayers = filterMale(players);
		const sortedMales = sortByWeight(malePlayers);
		const top5HeaviestMales = sortedMales.slice(0, 5);
		const tableData = formatForTable(top5HeaviestMales);
		await fs.writeFile('stats.txt', `Q1: \n${table(tableData)}`, 'utf8'); // Write the table to stats.txt

		/*
        QUESTION 2: Tallest female basketball player from China
        */
		const femaleChinesePlayers = filterChinese(filterFemale(players));
		const sortedFemalesByHeight = sortByHeight(femaleChinesePlayers);
		const tallestFemaleChinese = sortedFemalesByHeight[0];
		const q2Output = `\nQ2: TALLEST PLAYER:\nThe tallest female basketball player from China is ${tallestFemaleChinese.first_name} ${tallestFemaleChinese.last_name}, ${tallestFemaleChinese.height}cm tall.\n`;
		await appendToStats(q2Output);

		/* 
        QUESTION 3: How many games did China win where they scored over 50 points? 
        */
		const chinaHighScoringGames = filterChineseWins(games).filter(game => {
			const totalPoints = game.points.reduce((sum, pts) => sum + pts, 0);
			return totalPoints > 50;
		});
		const q3Output = `\nQ3: GAMES WHERE CHINA SCORED OVER 50 POINTS\n ${chinaHighScoringGames.length} \n`;
		await appendToStats(q3Output);

		/* 
        QUESTION 4: Highest scoring male Canadian basketball player across all Canada games
        */
		const canadaGames = filterCanadaWins(games);
		const canadaPlayerPoints = {};

		//loops through all of canadas games and keeps track of how many points each player scored across all the games
		for (const game of canadaGames) {
			game.players.forEach((playerID, index) => {
				const pts = game.points[index];
				canadaPlayerPoints[playerID] =
					(canadaPlayerPoints[playerID] || 0) + pts;
			});
		}
		//filter for male players
		const maleCanadianPlayers = filterMale(players);

		let highestScoringMaleCanadian = null;
		let maxPoints = 0;

		maleCanadianPlayers.forEach(player => {
			const totalPts = canadaPlayerPoints[player.id] || 0;
			if (totalPts > maxPoints) {
				maxPoints = totalPts;
				highestScoringMaleCanadian = player;
			}
		});

		const q4Output = `\nQ4: HIGHEST SCORING MALE CANADIAN PLAYER:\n${highestScoringMaleCanadian.first_name} ${highestScoringMaleCanadian.last_name} with ${maxPoints} points total.\n`;

		await appendToStats(q4Output);

		console.log('tasks completed no errors');
	} catch (error) {
		console.error(error);
	}
}

main();
