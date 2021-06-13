const core = require('@actions/core');
const github = require('@actions/github');
const githubService  = require("./lib/github");
try {
    let newVersion = core.getInput('new-version');
    let oldVersion = core.getInput('old-version');
    let additionalFiles = core.getInput('additional-files');
    const client = github.getOctokit(core.getInput('token'))
    githubService.createTag(newVersion, client, github, additionalFiles, oldVersion).catch((error) => {
        core.setFailed(error.message);
    })
} catch (error) {
    console.log(JSON.stringify(error));
    core.setFailed(error.message);
}