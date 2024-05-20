const fs       = require("fs");
const path     = require('path');
const openai   = require("openai");
const { exit } = require("process");

const manifest = require("./lib/Manifests")

//
//

const gptFileMapPath   = "GptFileMap.json";
const gptAnswerPath    = "Answers/"
const gptPromptPath    = "GptPrompt.txt";
const gptAssistantName = "Syllabus See'r";

const gptApiToken = process.env.OPENAI_API_TOKEN;
const gptPrompt = fs.readFileSync(gptPromptPath).toString();

const gpt = new openai.OpenAI({ apiKey: gptApiToken });

//
//

function fatalError(msg, err, code = -1) {
    console.error(`Fatal Error ${msg} => ${err}`);
    exit(code);
}

//
//

async function gptFileUpload(filePath) {
    try {
        const file = await gpt.files.create({
            file: fs.createReadStream(filePath),
            purpose: "assistants"
        });

        return file;

    } catch(err) {
        fatalError(`Unable to Upload File '${filePath}' to GPT`, err);
    }
}

//
//

async function gptFileRemove(fileId) {
    try {
        await gpt.files.del(fileId);
    } catch(err) {
        fatalError(`Unable to Remove File '${fileId}' from GPT`, err);
    }
}

async function gptFileList() {
    try {
        return await gpt.files.list();
    } catch(err) {
        fatalError(`Unable to Retrieve File List from GPT`, err);
    }
}

//
//

async function gptMapMissingFiles() {
    let map = JSON.parse(fs.readFileSync(gptFileMapPath));
    let fileList = await gptFileList();

    for (let mi = 0; mi !== map.length; mi++) {
        let uniObj = map[mi];
        console.log(`Mapping Syllabi For ${uniObj.name}`);

        for (let si = 0; si !== uniObj.syllabi.length; si++) {
            let syllObj = uniObj.syllabi[si];

            process.stdout.write(`\tMapping ${syllObj.code} : ${syllObj.gptFileId} => `, )
            
            // fileId exists and gpt has it
            if (fileList.data.find(elem => { return elem.id === syllObj.gptFileId }) !== undefined) {
                console.log("Syllabus Already Uploaded");
                continue;
            }

            // file doesn't exist
            if (!fs.existsSync(syllObj.path)) {
                console.log("Syllabus Doesn't Locally Exist");
                continue;
            }

            // empty pdfs seem to be under 2000 bytes
            if (fs.statSync(syllObj.path).size < 2000) {
                console.log("Syllabus Is Empty");
                continue;
            }

            process.stdout.write("Uploading... ");

            let fileObj = await gptFileUpload(syllObj.path);
            syllObj.gptFileId = fileObj.id;

            console.log(`Success ${fileObj.id}`);

            fs.writeFileSync(gptFileMapPath, JSON.stringify(map, null, 2));
        }
    }
}

//
//

async function main() {
    gptMapMissingFiles();
}

main();