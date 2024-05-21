const fs       = require("fs");
const openai   = require("openai");
const pdftxt   = require('pdf-to-text');
const { exit } = require("process");

//
//

const gptAnswerPath = "Answers/"
const gptPromptPath = "GptPrompt.txt";
// Still a rough estimate https://platform.openai.com/tokenizer 
const gptPromptTokenCount = 2000;
const gptAvgPdfTokenCount = 3500;
const gptAssistantName = "Syllabus See'r";

const gptApiToken = process.env.OPENAI_API_TOKEN;

if (gptApiToken === undefined) {
    console.log("No OpenAI Api Token Found in Enviroment, Add It To 'OPENAI_API_TOKEN'");
    exit(-1);
}

const gptPrompt = fs.readFileSync(gptPromptPath).toString();

const gpt = new openai.OpenAI({ apiKey: gptApiToken });

const fileMap = JSON.parse(fs.readFileSync("GptFileMap.json"))

//
//

function fatalError(msg, err, code = -1) {
    console.error(`Fatal Error ${msg} => ${err}`);
    exit(code);
}

function updateFileMap() {
    fs.writeFileSync("GptFileMap.json", JSON.stringify(fileMap, null, 2));
}

//
//

async function gptAssistantMake() {
    try {
        return await gpt.beta.assistants.create({
            name: gptAssistantName,
            instructions: "You're an academically oriented, objective reviewer of syllabuses for machine learning, artificial intelligence, and data mining college courses",
            tools: [{ "type": "file_search" }],
            model: "gpt-4o"
        });
    } catch (err) {
        fatalError("Failed to Make GPT Assistant", err);
    }
}

//
//

async function gptAssistantGet() {
    try {
        let assistantsData = await gpt.beta.assistants.list();
        let assistant = null;

        let i = 0;
        for (; i != assistantsData.data.length; i++) {
            assistant = assistantsData.data[i];

            if (assistant.name === gptAssistantName) {
                break;
            }
        }

        if (i === assistantsData.data.length) {
            return await gptAssistantMake();
        }

        return assistant;
    } catch (err) {
        fatalError("Failed to Get GPT Assistant", err);
    }
}

//
//

async function gptThreadMake(fileId) {
    try {
        return await gpt.beta.threads.create({
            messages: [{
                role: "user",
                content: gptPrompt,
                attachments: [{ file_id: fileId, tools: [{ type: "file_search" }] }]
            }]
        });
    } catch (err) {
        fatalError("Failed to Make GPT Thread", err);
    }
}

//
//

async function gptThreadDestroy(threadId) {
    try {
        return await gpt.beta.threads.del(threadId)

    } catch (err) {
        fatalError(`Failed to Destroy GPT Thread '${threadId}'`, err);
    }
}

//
//

async function gptThreadRun(assistantId, threadId) {
    try {
        return await gpt.beta.threads.runs.createAndPoll(
            threadId,
            { assistant_id: assistantId }
        );

    } catch (err) {
        fatalError(`Failed to Run Thread '${threadId}', with Assistant '${assistantId}'`, err);
    }
}


//
//

async function gptThreadResponse(assistantId, threadId) {
    try {
        const run = await gptThreadRun(assistantId, threadId);
        const messageList = await gpt.beta.threads.messages.list(threadId, { run_id: run.id });

        //console.log(run);
        //console.log(messageList);

        const message = messageList.data.pop();

        if (message === undefined) {
            return undefined;
        }

        const { text } = message.content[0];

        return text.value;

    } catch (err) {
        fatalError(`Failed to Get Thread (${threadId}) Response with Assistant (${assistantId})`, err);
    }
}

//
//

async function gptPromptSyllabus(assistantId, uniName, syllabiMapObj) {
    if (syllabiMapObj.gptFileId === null) {
        return null;
    }

    let thread = await gptThreadMake(syllabiMapObj.gptFileId);
    let resp = await gptThreadResponse(assistantId, thread.id);

    if (resp !== undefined) {
        fs.writeFileSync(`GptRawAnswers/${uniName}/${syllabiMapObj.code}.txt`, resp);
        syllabiMapObj.completed = true;
        updateFileMap();
        await gptThreadDestroy(thread.id);
    }

    return resp;
}

//
//

function psleep(ms) {
    return new Promise((res) => {
        setTimeout(res, ms);
    });
}

//
//

async function main() {
    let assistant = await gptAssistantGet();

    for (let mi = 0; mi !== fileMap.length; mi++) {
        let uniObj = fileMap[mi];

        console.log(`${uniObj.name}: `);

        for (let ci = 0; ci !== uniObj.syllabi.length; ci++) {
            let sylObj = uniObj.syllabi[ci];

            if (sylObj.completed === true || !fs.existsSync(sylObj.path) || fs.statSync(sylObj.path).size < 2000 || sylObj.gptFileId === null) {
                continue;
            }

            process.stdout.write(`\tPrompting ${sylObj.code} => `);

            let resp = await gptPromptSyllabus(assistant.id, uniObj.name, sylObj);

            process.stdout.write((resp === undefined) ? "Failed" : "Succeeded");
            console.log(" Sleeping...");

            await psleep(60000);
        }
    }
}

main();