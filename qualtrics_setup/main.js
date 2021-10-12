const fs = require('fs');
const pp = require('papaparse');
const argv = Array.from(process.argv);

// To run this script, you need to provide three files in a folder.

// The "metadata" file contains the metadata about the election you are running.
// It's first line should be: "property,value"
// And subsequent lines should specify a property name, then a value.
//
// At the moment, you can specify the properties:
//  - `start_date` (as an ISO8601 string, like 2021-10-12 23:59:59)
//  - `end_date` (as an ISO8601 string, like 2021-10-12 23:59:59)
//  - `survey_name`
//  - `survey_desc`
const METADATA_FILE = 'metadata.csv'

// The "positions" file lists the positions that can be elected for.
// It's first line should be:  "code,question"
// And subsequent lines should specify each position you are electing to.
//
// More specifically:
//   - `code` is the codename for the position ("copres" or "secretary"), which should be lowercase-letters
//   - `question` which is the question the voter will be asked ("What are your preferences for ...?")
const POSITIONS_FILE = 'positions.csv'

// The "candidates" file lists the actual candidates. Its first line should be:
//   "position_code,candidate_name,candidate_desc"
//
// Each subsequent line should be:
//   - `position_code` (the code of a position in `positions.csv`)
//   - `candidate_name` (the candidate's name)
//   - `candidate_desc` (the candidate's description, which is shown in a popup)
const CANDIDATES_FILE = 'candidates.csv'

function replace_REPLACE_with_properties(obj, properties) {
    const isObject = val =>
        typeof val === 'object' && !Array.isArray(val);

    if (obj && isObject(obj)) {
        Object.entries(obj).forEach(([key, value]) => {
         obj[key] =  replace_REPLACE_with_properties(value, properties);
       });

        return obj;
    }

    if (Array.isArray(obj)) {
        if (obj[0] === "REPLACE") {
            return properties[obj[1]] || obj[2];
        }
        return obj.map((x) => replace_REPLACE_with_properties(x, properties));
    }

    return obj;
}

function format_choice(choice) {
    return  `<strong>${choice.candidate_name}</strong><br/><div class=\"sturep-info\">${choice.candidate_desc}</div>`;
}

function formatChoicesForQualtrics(choices) {
    return Object.fromEntries(choices.map((choice, i) => [`${i + 1}`, {"Display": choice}]))
}

function create_qualtrics_file(metadata, positions, candidates) {
    // First, let's add the important metadata we need.
    // The number of questions:
    metadata['question_count'] = `${positions.length}`;

    // This is a weird qsf property that looks like:
    // [
    //   {
    //     "Type": "Question",
    //     "QuestionID": "QID1"
    //   }
    // ]
    //
    // So we just generate it.
    metadata['question_blocks'] = positions.map((_, i) => ({
        "Type": "Question",
        "QuestionID": `QID${i + 1}`,
    }));

    // Now get the QSF files we need
    const qsfBaseFile = fs.readFileSync(__dirname + '/qsf_components/SurveyBase.qsf', 'utf-8');
    let qsf = JSON.parse(qsfBaseFile);

    // Now for the fun bit. Anywhere you see a 3-long array of the form:
    // ["REPLACE", "question_blocks", "some_example_string"]
    // in the qsf, replace it with the relevant metadata.

    const qsfWithData = replace_REPLACE_with_properties(qsf, metadata);

    // Awesome, so last (and definitely not least), let's add in the actual survey questions

    const qsfQuestionFile = fs.readFileSync(__dirname + '/qsf_components/SurveyQuestion.qsf', 'utf-8');

    const surveyQuestions = positions.map((position, i) => {
        // do this inside the loop so every Question is it's own object.
        const qsfQuestion = JSON.parse(qsfQuestionFile);

        const positionCandidates = candidates.filter((candidate) => candidate.position_code == position.code);

        const question = replace_REPLACE_with_properties(qsfQuestion, {
            question_id: `QID${i + 1}`,
            data_export_tag: `Q${i + 1}`,
            question_text: position.question,
            choices: formatChoicesForQualtrics(positionCandidates.map(format_choice)),
            choices_order: positionCandidates.map((_, i) => i + 1),

            // These two can't be calculated inside the REPLACE function, so we prepare them
            max_choices: `${positionCandidates.length}`,
            next_choice: positionCandidates.length + 1,
        })

        if (i == 0) {
            question["Payload"]["QuestionJS"] = "Qualtrics.SurveyEngine.addOnload(function()\n{\n\t/*Place your JavaScript here to run when the page loads*/\n\n});\n\nQualtrics.SurveyEngine.addOnReady(function()\n{\n\tjQuery(\".sturep-info\").map(function(i) {\n        let me = this;\n        me.hide();\n        let node = document.createElement(\"button\");\n        node.style=\"margin-top: 6px; margin-botom: 6px;\";\n        node.innerText = \"Show/Hide Description\";\n\t\tnode.onclick = function () {\n             me.toggle();\n        }\n        me.before(node);\n\t})\n\n});\n\nQualtrics.SurveyEngine.addOnUnload(function()\n{\n\t/*Place your JavaScript here to run when the page is unloaded*/\n\n});";
        }

        return question

    })

    qsfWithData['SurveyElements'] = [...qsfWithData['SurveyElements'], ...surveyQuestions];

    return qsfWithData;

}



function qualtrics_setup(folderPath) {

    const parserConfig = {
        header: true,
        skipEmptyLines: true,
    };
    const metadataFile = fs.readFileSync(folderPath + '/' + METADATA_FILE, 'utf-8');
    const metadataParsed = pp.parse(metadataFile, { ...parserConfig, header: false });

    if (metadataParsed.errors.length) {
        console.error("Could not parse metadata: ");
        console.log(metadataParsed.errors);
        return null;
    }

    // slice removes the header row.
    const metadata = Object.fromEntries(metadataParsed.data.slice(1));

    const positionsFile = fs.readFileSync(folderPath + '/' + POSITIONS_FILE, 'utf-8');
    const positionsParsed = pp.parse(positionsFile, parserConfig);

    if (positionsParsed.errors.length) {
        console.error("Could not parse positions: ")
        console.log(positionsParsed.errors)
        return null;
    }

    const positions = positionsParsed.data;

    const candidatesFile = fs.readFileSync(folderPath + '/' + CANDIDATES_FILE, 'utf-8');
    const candidatesParsed = pp.parse(candidatesFile, parserConfig);

    if (candidatesParsed.errors.length) {
        console.error("Could not parse candidates: ")
        console.log(candidatesParsed.errors)
        return null;
    }

    const candidates = candidatesParsed.data;

    return create_qualtrics_file(metadata, positions, candidates);

}

console.log(JSON.stringify(qualtrics_setup(argv[argv.length - 1])));
