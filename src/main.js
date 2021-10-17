const fs = require('fs');
const pp = require('papaparse');
let irv = require('./irv.js');
irv = irv.irv;

const argv = Array.from(process.argv);

function parse_results(votingResultsPath, election, remove_names) {

    const parserConfig = {
        header: false,
        skipEmptyLines: true,
    };
    const votingResultsFile = fs.readFileSync(votingResultsPath, 'utf-8');
    const votingResults = pp.parse(votingResultsFile, parserConfig).data;

    const electionIndexes = [];
    // header row
    votingResults.shift().forEach((code, i) => {
        if (code.startsWith(election)) {
            electionIndexes.push(i);
        }
    });

    // question info
    const questionHTML = electionIndexes.map((i) => votingResults[0][i]);
    votingResults.shift();
    // Get rid of import ids
    votingResults.shift();

    // This is a bit hacky.
    const candidates = questionHTML.map((html) => html.split("<strong>")[1].split("</strong>")[0]);

    // Get the numbers from the relevant ballots
    const ballots = votingResults
          .map((ballot) => ballot
               .filter((_, i) => electionIndexes.includes(i))
               .map((num) => num ? Number.parseInt(num) : '')
              );

    // Remove people who are instructed to be removed.
    const removeIndexes = removeNames.map((name) => candidates.indexOf(name));
    const fixedBallots = ballots.map((ballot) => {
        removeIndexes.forEach((removeIndex) => {
            const valueRemoved = ballot[removeIndex];
            ballot[removeIndex] = 0;
            ballot.forEach((vote, i) => {
                if(ballot[i] > valueRemoved) ballot[i] -= 1;
            });
        })
    })

    // Whether to use a secondary tie breaker.
    const tiebreakerSecondary = false;

    // Whether to allow incomplete ballots
    const incompleteBallots = true;

    // threshold -- set to 50% (i.e. majority)
    const threshold = 50;

    irv.emptyResults();

    const isValid = irv.validateInput(candidates, ballots, incompleteBallots, threshold);
    const validResults = irv.getResults();

    if (!isValid) {
        console.error("Could not run IRV calculator.")
        validResults.map((result) => console.log(result));
        return;
    }

    irv.emptyResults();

    console.log(ballots);
    const winner = irv.calculateWinner(candidates, ballots, tiebreakerSecondary, threshold);
    const results = irv.getResults();

    results.forEach((result) => console.log(result));

    if (isValid) {
        console.log(`Finished: ${winner}`);
    } else {
        console.error("Could not get result.")
        console.log(`Got: ${winner}`);
    }

}

parse_results(argv[argv.length - 2], argv[argv.length - 1], [])
