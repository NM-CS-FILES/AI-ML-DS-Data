const fs       = require("fs");
const openai   = require("openai");
const { exit } = require("process");

//
//

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

        console.log(run);
        console.log(messageList);

        const response = messageList.data.pop();
        return response;

    } catch (err) {
        fatalError(`Failed to Get Thread (${threadId}) Response with Assistant (${assistantId})`, err);
    }
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

//
//

async function main() {
    
}

async function __main() {
    // let syllabus = await gptFileUpload("Syllabi/Cornell University/CS 4783.pdf");
    // let assistant = await gptAssistantGet();
    // let thread = await gptThreadMake(syllabus.id);

    // console.log(thread)

    // let resp = await gptThreadResponse(assistant.id, thread.id);

    // console.log(resp);

    // await gptThreadDestroy(thread.id)
    // await gptFileRemove(syllabus.id);

    // let files = await gpt.files.list();
    //console.log(files);
}

main();