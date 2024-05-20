const fs = require("fs");
const https = require('https');
const http = require('http');
const url2pdf = require("url2pdf");

//
//

const ManifestPath = "Manifests/";
const SyllabiPath = "Syllabi/"

//
//

function getPath(manifest) {
    if (manifest.name === undefined) {
        return undefined;
    }

    let manifestPath = SyllabiPath + manifest.name;

    if (!fs.existsSync(manifestPath)) {
        fs.mkdirSync(manifestPath);
    }

    return manifestPath;
}

//
//

function getSyllabusPath(manifest, course) {
    let manifestPath = getPath(manifest);

    if (course.syllabus === undefined || course.syllabus === null) {
        return undefined;
    }

    return `${manifestPath}/${course.code}.pdf`;
}

//
//

function getAllSyllabiPaths(manifest) {
    let syllabiPaths = [ ];

    if (manifest === undefined || manifest === null) {
        return syllabiPaths;
    }

    if (manifest.undergrad !== undefined && manifest.undergrad !== null) {
        manifest.undergrad.forEach(elem => {
            let path = getSyllabusPath(manifest, elem);

            if (path === undefined || path === null || !fs.existsSync(path)) {
                return;
            }
            
            syllabiPaths.push(path);
        });
    }

    if (manifest.grad !== undefined && manifest.grad !== null) {
        manifest.grad.forEach(elem => {
            let path = getSyllabusPath(manifest, elem);

            if (path === undefined || path === null || !fs.existsSync(path)) {
                return;
            }
            
            syllabiPaths.push(path);
        });
    }

    return syllabiPaths;
}

//
//

function fetchCourseSyllabus(manifest, course) {
    let syllabusPath = getSyllabusPath(manifest, course);

    if (syllabusPath === undefined) {
        return;
    }

    if (course.syllabus.endsWith(".pdf")) {
        let file = fs.createWriteStream(syllabusPath);

        if (course.syllabus.startsWith("https")) {
            let request = https.get(course.syllabus, resp => {
                resp.pipe(file);
              });
        } else {
            let request = http.get(course.syllabus, resp => {
                resp.pipe(file);
            });
        }
    } else {
        url2pdf.renderPdf(course.syllabus).then(pdfPath => {
            fs.renameSync(pdfPath, syllabusPath);
        });
    }
}

//
//

function fetchSyllabi(manifest) {
    if (manifest.undergrad === undefined || manifest.grad === undefined) {
        return false;
    }

    for (let i = 0; i != manifest.undergrad.length; i++) {
        fetchCourseSyllabus(manifest, manifest.undergrad[i]);
    }

    for (let i = 0; i != manifest.grad.length; i++) {
        fetchCourseSyllabus(manifest, manifest.grad[i]);
    }

    return true;
}

//
//

function fromFile(manifestPath) {
    if (!fs.existsSync(manifestPath)) {
        return undefined;
    }

    let data = fs.readFileSync(manifestPath);
    let manifest = JSON.parse(data);

    return manifest;
}

//
//

function getAllManifests() {
    let manifests = [ ];

    fs.readdirSync(ManifestPath).forEach(manifestPath => {
        manifests.push(fromFile(`${ManifestPath}${manifestPath}`));
    });

    return manifests;
}

//
//

module.exports = {
    ManifestPath,
    SyllabiPath,

    fromFile,
    fetchSyllabi,
    fetchCourseSyllabus,
    getSyllabusPath,
    getPath,
    getAllManifests,
    getAllSyllabiPaths
};