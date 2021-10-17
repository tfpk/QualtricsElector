// From https://github.com/PeterTheOne/IRV/blob/gh-pages/js/irv.js

let result = [];

let irv = {
    createZeroFilledArray: function(length) {
        if (length < 0) {
            return [];
        }
        return Array.apply(null, new Array(length)).map(Number.prototype.valueOf,0);
    },
    getResults: function () {
        return result;
    },
    emptyResults: function () {
      result = [];
    },

    readBallots: function(ballotsText) {
        var ballots = ballotsText.split('\n');
        for (var i = 0; i < ballots.length; i++) {
            ballots[i] = ballots[i].replace(/\s+/g, '').split(',');
            for (var j = 0; j < ballots[i].length; j++) {
                ballots[i][j] = ballots[i][j] === '' ? 0 : parseInt(ballots[i][j]);
            }
        }
        return ballots;
    },

    validateCandidates: function(candidates) {
        if (candidates.length < 2) {
            result.push('You didn\'t enter at least two candidates!<br />');
            return false;
        }

        for (var i = 0; i < candidates.length; i++) {
          if (candidates[i].trim() === '') {
                result.push('Candidate # ' + (i + 1) + ' doesn\'t have a name.<br />');
                return false;
            }
        }

        return true;
    },

    validateBallots: function(ballots) {
        if (ballots.length < 1 || (ballots.length === 1 && ballots[0][0] === 0)) {
            result.push('You didn\'t enter any ballots!<br />');
            return false;
        }

        for (var i = 0; i < ballots.length; i++) {
            if (ballots[i].length < 1 || (ballots[i].length === 1 && ballots[i][0] === 0)) {
                result.push('Ballot # ' + (i + 1) + ' is empty.<br />');
                return false;
            }
        }

        return true;
    },

    validateThreshold: function(threshold) {
        if ((threshold >= 100 || threshold <= 0) || !String(threshold).match(/^[0-9]*\.?[0-9]*$/)){
            result.push('Victory threshold percentage must be a number greater than 0 and less than 100.<br />');
            return false;
        }

        return true;
    },

    validateInput: function(candidates, ballots, incompleteBallots, threshold) {
        if (!irv.validateCandidates(candidates)) {
            return false;
        }
        if (!irv.validateBallots(ballots)) {
            return false;
        }
        if (!irv.validateThreshold(threshold)) {
            return false;
        }


        var lowestAllowedRank = incompleteBallots ? 0 : 1;
        for (var i = 0; i < ballots.length; i++) {
            if (ballots[i].length !== candidates.length) {
                result.push('Ballot #' + (i + 1) + ' doesn\'t have the same ' +
                    'length (' + ballots[i].length + ') as there are candidates (' +
                        candidates.length + ').<br />');
                return false;
            }
            var numbers = irv.createZeroFilledArray(candidates.length + 1);
            for (var j = 0; j < ballots[i].length; j++) {
                if (ballots[i][j] < lowestAllowedRank || ballots[i][j] > candidates.length) {
                    result.push('Ballot #' + (i + 1) + ' Number #' + (j + 1) +
                        ' isn\'t a number between ' + lowestAllowedRank +
                        ' and the number of candidates.<br />');
                    return false;
                }
                numbers[ballots[i][j]]++;
            }
            if (incompleteBallots) {
                var lastCount = 1;
                for (var k = 1; k < numbers.length; k++) {
                    if (numbers[k] > 1) {
                        result.push('Ballot #' + (i + 1) + ' one or more numbers are used more than once (zeros not counted).<br />');
                        return false;
                    }
                    if (lastCount == 0 && numbers[k] === 1) {
                        result.push('In Ballot #' + (i + 1) + ' one or more numbers are left out.<br />');
                        return false;
                    }
                    lastCount = numbers[k];
                }
            } else {
                for (var l = 1; l < numbers.length; l++) {
                    if (numbers[l] !== 1) {
                        result.push('Ballot #' + (i + 1) + ' doesn\'t have exactly one of every number.<br />');
                        return false;
                    }
                }
            }
        }

        return true;
    },

    removeEmptyBallots: function(ballots) {
        var ballotsToRemove = [];
        for (var i = 0; i < ballots.length; i++) {
            var ballotEmptyOrInvalid = true;
            for (var j = 0; j < ballots[i].length; j++) {
                if (ballots[i][j] > 0) {
                    ballotEmptyOrInvalid = false;
                }
            }
            if (ballotEmptyOrInvalid) {
                ballotsToRemove.push(i);
            }
        }
        for (i = 0; i < ballotsToRemove.length; i++) {
            ballots.splice(ballotsToRemove[i] - i, 1);
        }
        return ballots;
    },

    countFirstVotes: function(candidatesCount, ballots) {
        return irv.countNVotes(1, candidatesCount, ballots);
    },

    countNVotes: function(n, candidatesCount, ballots) {
        var firstVotesCount = irv.createZeroFilledArray(candidatesCount);
        for (var i = 0; i < ballots.length; i++) {
            for (var j = 0; j < ballots[i].length; j++) {
                if (ballots[i][j] === n) {
                    firstVotesCount[j]++;
                }
            }
        }
        return firstVotesCount;
    },

    calculateRoundWinners: function(firstVotes) {
        var maxVotes = -1;
        var roundWinners = [];
        for (var i = 0; i < firstVotes.length; i++) {
            if (firstVotes[i] > maxVotes) {
                maxVotes = firstVotes[i];
                roundWinners = [];
                roundWinners.push(i);
            } else if (firstVotes[i] == maxVotes) {
                roundWinners.push(i);
            }
        }
        return roundWinners;
    },

    calculateRoundLosers: function(firstVotes, ballotsCount) {
        var minVotes = ballotsCount + 1;
        var roundLosers = [];
        for (var i = 0; i < firstVotes.length; i++) {
            if (firstVotes[i] < minVotes) {
                minVotes = firstVotes[i];
                roundLosers = [];
                roundLosers.push(i);
            } else if (firstVotes[i] == minVotes) {
                roundLosers.push(i);
            }
        }
        return roundLosers;
    },

    calculateRoundLosersOfCandidates: function(candidates, firstVotes, ballotsCount) {
        var minVotes = ballotsCount + 1;
        var roundLosers = [];
        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            if (firstVotes[candidate] < minVotes) {
                minVotes = firstVotes[candidate];
                roundLosers = [];
                roundLosers.push(candidate);
            } else if (firstVotes[candidate] == minVotes) {
                roundLosers.push(candidate);
            }
        }
        return roundLosers;
    },

    removeLoserCandidate: function(candidateNames, roundLoser) {
        candidateNames.splice(roundLoser, 1);
        return candidateNames;
    },

    removeLoserFromBallots: function(ballots, roundLoser) {
        for (var i = 0; i < ballots.length; i++) {
            var loserRank = ballots[i][roundLoser];
            if (loserRank > 0) {
                for (var j = 0; j < ballots[i].length; j++) {
                    if (ballots[i][j] > loserRank) {
                        ballots[i][j]--;
                    }
                }
            }
            ballots[i].splice(roundLoser, 1);
        }
        return irv.removeEmptyBallots(ballots);
    },

    candidateIndexToName: function(candidateNames, candidatesIndices) {
        for (var i = 0; i < candidatesIndices.length; i++) {
            candidatesIndices[i] = candidateNames[candidatesIndices[i]];
        }
        return candidatesIndices;
    },

    calculateWinner: function(candidateNames, ballots, tiebreakerSecondary, threshold) {
        var round = 0;

        ballots = irv.removeEmptyBallots(ballots);

        do {
            result.push('Round #'+ (round + 1) +':<br />');

            result.push('<br />' + candidateNames.length + ' candidates and ' +
                ballots.length + ' ballots.<br />');

            var firstVotes = irv.countFirstVotes(candidateNames.length, ballots);

            var roundWinners = irv.calculateRoundWinners(firstVotes);
            var roundLosers = irv.calculateRoundLosers(firstVotes, ballots.length);

            var ratioOfWinnerVotes = firstVotes[roundWinners[0]] / ballots.length;
            var ratioOfLoserVotes = firstVotes[roundLosers[0]] / ballots.length;

            result.push('<br />Number of first votes per candidate:<br />');
            for (var i = 0; i < candidateNames.length; i++) {
                result.push(candidateNames[i] + ': ' + firstVotes[i] + '<br />');
            }

            if (roundWinners.length === 1) {
                result.push('<br />' + candidateNames[roundWinners[0]] + ' has the highest number of votes with ' +
                    firstVotes[roundWinners[0]] + ' votes (' + (100 * ratioOfWinnerVotes).toFixed(2) +
                    '%)<br />');
            } else {
                result.push('<br />' + roundWinners.length + ' candidates have the highest number of votes with ' +
                    firstVotes[roundWinners[0]] + ' votes (' + (100 * ratioOfWinnerVotes).toFixed(2) +
                    '%)<br />');
            }
            if (roundLosers.length === 1) {
                result.push(candidateNames[roundLosers[0]] + ' has the lowest number of votes with ' +
                    firstVotes[roundLosers[0]] + ' votes (' + (100 * ratioOfLoserVotes).toFixed(2) +
                    '%)<br />');
            } else {
                result.push(roundLosers.length + ' candidates have the lowest number of votes with ' +
                    firstVotes[roundLosers[0]] + ' votes (' + (100 * ratioOfLoserVotes).toFixed(2) +
                    '%)<br />');
            }

            var roundWinner = roundWinners[0];
            var roundLoser = roundLosers[0];

            if (ratioOfWinnerVotes > threshold / 100) {
                result.push('<br />' + candidateNames[roundWinner] + ' won!<br />');
                return irv.candidateIndexToName(candidateNames, roundWinners);
            }

            if (candidateNames.length == 2) {
                result.push('<br />There are two candidates left and no one has over ' + threshold + '% of the votes.<br />');
                return irv.candidateIndexToName(candidateNames, roundWinners);
            }

            if (roundLosers.length > 1 && tiebreakerSecondary) {
                result.push('<br />');
                var n = 2;
                while (roundLosers.length > 1 && n <= candidateNames.length) {
                    var nVotes = irv.countNVotes(n, candidateNames.length, ballots);
                    roundLosers = irv.calculateRoundLosersOfCandidates(roundLosers, nVotes, ballots.length);
                    result.push('Tiebreaker: Use ' + n + '. votes: ' + roundLosers.length + ' losers left.<br />');

                    n++;
                }
                if (roundLosers.length === 1) {
                    roundLoser = roundLosers[0];
                    result.push('<br />Tiebreaker: ' + candidateNames[roundLoser] + ' was selected as the loser of the round.<br />');
                }
            }

            if (roundLosers.length > 1) {
                var randomIndex = Math.round(Math.random() * (roundLosers.length - 1));
                roundLoser = roundLosers[randomIndex];
                result.push('<br />Tiebreaker: ' + candidateNames[roundLoser] + ' was randomly selected as the loser of the round.<br />');
            }

            candidateNames = irv.removeLoserCandidate(candidateNames, roundLoser);
            ballots = irv.removeLoserFromBallots(ballots, roundLoser);

            result.push('<br />');

            round++;
        } while(true);
    }
};

exports.irv = irv;
