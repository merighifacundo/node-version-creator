const core = require('@actions/core');
const github = require('@actions/github');
const githubService  = require("./lib/github");
try {
    const newVersion = core.getInput('new-version');
    const oldVersion = core.getInput('old-version');
    const additionalFiles = core.getInput('additional-files');
    const createReleaseBranch = core.getInput('release-branch') !== 'false';
    const client = github.getOctokit(core.getInput('token'))
    console.log(`Welcome to Node Version Creator this workflow will create a new tag and could create a release branch with the new version.`)
    console.log(`The new version number: ${newVersion}, The old version number: ${oldVersion}`)
    console.log(`Additional files for the versioning commit: ${additionalFiles}`)
    console.log(`Should create the releaseBranch? ${createReleaseBranch}`)
    githubService.createTag(newVersion, client, github, additionalFiles, oldVersion, createReleaseBranch).catch((error) => {
        core.setFailed(error.message);
    })
} catch (error) {
    console.log(JSON.stringify(error));
    core.setFailed(error.message);
}