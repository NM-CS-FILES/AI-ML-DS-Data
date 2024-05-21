const fs = require("fs");
const csv = require("csv");
const manifest = require("./lib/Manifests")

const fileMap = JSON.parse(fs.readFileSync("GptFileMap.json"));

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function genArray(len, fill) {
    let a = [ ];

    for (let i = 0; i != len; i++) {
        a.push(clone(fill));
    }

    return a;
}

function gen2dArray(rows, columns, fill) {
    let a = [ ];

    for(let r = 0; r != rows; r++) {
        a.push(genArray(columns, fill));
    }

    return a;
}

function getCourseManifest(uniName, code) {
    let m = manifest.getAllManifests().find(elem => {
        return elem.name === uniName;
    });

    if (m === undefined) {
        return undefined;
    }

    let r = m.undergrad.find(elem => {
        return elem.code === code;
    });

    if (r === undefined) {
        r = m.grad.find(elem => {
            return elem.code === code;
        });
    }

    return r;
}

function courseIsGrad(uniName, code) {
    let m = manifest.getAllManifests().find(elem => {
        return elem.name === uniName;
    });

    if (m === undefined) {
        return undefined;
    }

    let r = m.grad.find(elem => {
        return elem.code === code;
    });

    return (r !== undefined);
}

function genCsvInitArray() {
    let courseCount = 0;

    fileMap.forEach(uniObj => {
        uniObj.syllabi.forEach(sylObj => {
            if (sylObj.completed === true) {
                courseCount += 1;
            }
        });
    });

    return gen2dArray(courseCount + 1, 12, "");
}

function genCsvFrom2dArray(arr, delim = ",") {
    return arr.map(v => v.map(x => `"${x}"`).join(delim)).join('\n');
}

function courseGetAnswers(uniName, courseName) {
    let obj = JSON.parse(fs.readFileSync("GptParsedAnswers.json"));

    let u = obj.find(elem => { return elem.name === uniName; });

    if (u === undefined) {
        return null;
    }

    let a = u.courses.find(elem => { return elem.code === courseName });

    return (a === undefined) ? null : a;
}

function csvStage(arr) {
    arr[0][0] = "University";
    arr[0][1] = "Name";
    arr[0][2] = "Code";
    arr[0][3] = "Level";
    arr[0][4] = "1";
    arr[0][5] = "2.1";
    arr[0][6] = "2.2";
    arr[0][7] = "3.1";
    arr[0][8] = "3.2";
    arr[0][9] = "4";
    arr[0][10] = "5";
    arr[0][11] = "6";
    arr[0][12] = "7";
}

function csvPutCourse(arr, rowIdx, uniName, isGrad, sylObj) {
    let row = arr[rowIdx];
    row[0] = uniName;
    row[1] = sylObj.name;
    row[2] = (isGrad === true) ? "grad" : "undergrad";
    row[3] = sylObj.code;
    row[4] = sylObj.ans.rq1;
    row[5] = sylObj.ans.rq21;
    //row[6] = sylObj.ans.rq3;
    row[7] = sylObj.ans.rq31;
    row[8] = sylObj.ans.rq32;
    row[9] = sylObj.ans.rq4;
    row[10] = sylObj.ans.rq5;
    row[11] = sylObj.ans.rq6;
    row[12] = sylObj.ans.rq7;
}

function getTotalMap() {
    let totalMap = { };

    fileMap.forEach(uniObj => {
        let uniKey = uniObj.name.replaceAll(" ", "-");
    
        totalMap[uniKey] = { };
        totalMap[uniKey].undergrad = [ ];
        totalMap[uniKey].grad = [ ];

        uniObj.syllabi.forEach(sylObj => {
            if (sylObj.completed === false) {
                return;
            }
    
            let m = getCourseManifest(uniObj.name, sylObj.code);

            if (m === undefined) {
                return;
            }

            let g = courseIsGrad(uniObj.name, sylObj.code);

            let sso = { };
            sso.name = m.name;
            sso.code = m.code;
            sso.ans = courseGetAnswers(uniObj.name, sylObj.code).answers;

            if (g) {
                totalMap[uniKey].grad.push(sso);
            } else {
                totalMap[uniKey].undergrad.push(sso);
            }
        });
    });

    return totalMap;
}

let totalMap = getTotalMap();
let csvArr = genCsvInitArray();
let rowIdx = 1;

Object.keys(totalMap).forEach(key => {
    
    let uniObj = totalMap[key];
    
    for (let i = 0; i != uniObj.undergrad.length; i++) {
        csvPutCourse(csvArr, rowIdx, key, false, uniObj.undergrad[i]);
        rowIdx++;
    }

    
    for (let i = 0; i != uniObj.grad.length; i++) {
        csvPutCourse(csvArr, rowIdx, key, true, uniObj.grad[i]);
        rowIdx++;
    }
});

fs.writeFileSync("out.csv",genCsvFrom2dArray(csvArr))