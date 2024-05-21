const fs = require("fs");
const { exit } = require("process");

const parsedFilePath = "GptParsedAnswers.json";
const fileMapPath = "GptFileMap.json";

const fileMap = JSON.parse(fs.readFileSync(fileMapPath));
const parsedMap = JSON.parse(fs.readFileSync(parsedFilePath));

function parseFileInit() {
    let parse = [ ]

    fileMap.forEach(uni => {
        let uniObj = { };

        uniObj.name = uni.name;
        uniObj.courses = [ ];

        uni.syllabi.forEach(syl => {
            let course = { };

            course.code = syl.code;
            course.answers = { };
            course.answers.rq1 = null;
            course.answers.rq21 = null;
            course.answers.rq22 = null;
            course.answers.rq31 = null;
            course.answers.rq32 = null;
            course.answers.rq4 = null;
            course.answers.rq5 = null;
            course.answers.rq6 = null;
            course.answers.rq7 = null;

            uniObj.courses.push(course);
        });

        parse.push(uniObj);
    });

    fs.writeFileSync(parsedFilePath, JSON.stringify(parse, null, 2));
}

function parsedUpdateFile() {
    fs.writeFileSync(parsedFilePath, JSON.stringify(parsedMap, null, 2));
}

function parseAnswerText(textFilePath) {
    let txtData = fs.readFileSync(textFilePath).toString();
    let rgxs = [ /1.1/, /2.1/, /3.1/, /3.2/, /4.1/, /5.1/, /6.1/, /7.1/ ];
    let ansrgx = /\((\d)\)/;
    let pos = [ ];
    let ans = [ ];

    rgxs.forEach(rgx => {
        let m = rgx.exec(txtData);
        pos.push((m === null) ? null : m.index);
    });

    pos.forEach(idx => {
        let r = null;

        if (idx !== null) {
            let stxt = txtData.slice(idx, txtData.length);
            let match = ansrgx.exec(stxt);

            if (match !== null) {
                r = match[0][1];
            }
        }

        ans.push(r);
    })

    return ans;
}

function parseAnswer(uniName, sylObj) {
    let txtFilePath = `GptRawAnswers/${uniName}/${sylObj.code}.txt`

    if (!fs.existsSync(txtFilePath)) {
        return;
    }

    let ans = parseAnswerText(txtFilePath);

    sylObj.answers.rq1 = ans[0];
    sylObj.answers.rq21 = ans[1];
    sylObj.answers.rq31 = ans[2];
    sylObj.answers.rq32 = ans[3];
    sylObj.answers.rq4 = ans[4];
    sylObj.answers.rq5 = ans[5];
    sylObj.answers.rq6 = ans[6];
    sylObj.answers.rq7 = ans[7];

    parsedUpdateFile();
}

parseFileInit();

parsedMap.forEach(uniObj => {
    uniObj.courses.forEach(sylObj => {
        parseAnswer(uniObj.name, sylObj);
    });
});