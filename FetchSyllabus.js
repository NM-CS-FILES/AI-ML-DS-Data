const fs = require("fs");
const http = require('https');
const url2pdf = require("url2pdf");

const ManifestPath = "Manifest/";
const SyllabiPath = "Syllabi/"

//
//

function manifestGetPath(manifest) {
    if (manifest.name == undefined) {
        console.error(`Error Getting Manifest Path ${manifest}`);
    }

    let manifestPath = SyllabiPath + manifest.name;

    if (!fs.existsSync(manifestPath)) {
        fs.mkdirSync(manifestPath);
    }

    return manifestPath;
}

//
//

function manifestFetchCourseSyllabus(manifest, course) {
    let manifestPath = manifestGetPath(manifest);

    if (course.syllabus == undefined || course.syllabus == null) {
        return;
    }

    console.log(`Fetching Course Syllabus ${course.syllabus}`);

    let syllabusPath = `${manifestPath}/${course.code}.pdf`

    if (course.syllabus.endsWith(".pdf")) {
        let file = fs.createWriteStream(syllabusPath);
        let request = http.get(course.syllabus, resp => {
          resp.pipe(file);
        });
    } else {
        url2pdf.renderPdf(course.syllabus).then(pdfPath => {
            fs.renameSync(pdfPath, syllabusPath);
        });
    }
}

//
//

function manifestFetchSyllabi(manifest) {
    console.log(`Fetching Syllabi From ${manifest.name}`);

    if (manifest.undergrad == undefined || manifest.grad == undefined) {
        console.error(`Error Invalid Manifest Missing Fields ${manifest.name}`);
    }

    for (let i = 0; i != manifest.undergrad.length; i++) {
        manifestFetchCourseSyllabus(manifest, manifest.undergrad[i]);
    }

    for (let i = 0; i != manifest.grad.length; i++) {
        manifestFetchCourseSyllabus(manifest, manifest.grad[i]);
    }
}

//
//

function manifestFromFile(manifestPath) {
    if (!fs.existsSync(manifestPath)) {
        console.log(`Error Manifest Path Doesn't Exist ${manifestPath}`);
    }

    let data = fs.readFileSync(manifestPath);
    let manifest = JSON.parse(data);

    return manifest;
}

//
//

const manifests = fs.readdirSync(ManifestPath)

for (let i = 0; i != manifests.length; i++) {
    let manifestPath = ManifestPath + manifests[i];
    let manifest = manifestFromFile(manifestPath);

    manifestFetchSyllabi(manifest);
}
