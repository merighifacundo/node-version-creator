const path = require('path');
const { readFile } = require('fs-extra');

const getCurrentCommit = async (
    client,
    github
  ) => {
    const getRefParam = {
      ...github.context.repo,
      ref: github.context.ref.replace('refs/',''),
    };
    console.log(`Getting current commit ${JSON.stringify(getRefParam)}`);
    
    const { data: refData } = await client.rest.git.getRef(getRefParam)
    console.log(`data: ${refData}`);
    const commitSha = refData.object.sha
    const { data: commitData } = await client.rest.git.getCommit({
      ...github.context.repo,
      commit_sha: commitSha,
    })
    return {
      commitSha,
      treeSha: commitData.tree.sha,
    }
  }
  
  
  const getFileAsUTF8 = (filePath) => readFile(filePath, 'utf8')
  
  const createBlobForFile = (client, github) => async (
    filePath
  ) => {
    const content = await getFileAsUTF8(filePath)
    const blobData = await client.rest.git.createBlob({
      ...github.context.repo,
      content,
      encoding: 'utf-8',
    })
    return blobData.data
  }
  
  const createNewTree = async (
    client, 
    github,
    blobs,
    paths,
    parentTreeSha
  ) => {
    // My custom config. Could be taken as parameters
    const tree = blobs.map(({ sha }, index) => ({
      path: paths[index],
      mode: `100644`,
      type: `blob`,
      sha,
    }))
    console.log(`tree: ${JSON.stringify(tree)}`);
    const { data } = await client.rest.git.createTree({
      ...github.context.repo,
      tree,
      base_tree: parentTreeSha,
    })
    return data
  }
  
  const createNewCommit = async (
    client,
    github,
    message,
    currentTreeSha,
    currentCommitSha
  ) =>
    (await client.rest.git.createCommit({
      ...github.context.repo,
      message,
      tree: currentTreeSha,
      parents: [currentCommitSha],
    })).data
  

const createTag = async (tag, client, github, additionalFiles, oldVersion) => {
        const currentCommit = await getCurrentCommit(client, github)
        const filesPaths = ['package.json', 'package-lock.json'];
        if (additionalFiles != null && additionalFiles != "") {
            additionalFiles.split(',').forEach(file => filesPaths.push(file));
        }
        const filesBlobs = await Promise.all(filesPaths.map(createBlobForFile(client, github)))
        const pathsForBlobs = filesPaths.map(fullPath => path.relative('./', fullPath))
        console.log(`before creating new tree ${JSON.stringify(currentCommit)} and ${pathsForBlobs}`);
    
        const newTree = await createNewTree(
          client, 
          github,
          filesBlobs,
          pathsForBlobs,
          currentCommit.treeSha
        )
        const commitMessage = `New Version`
        console.log(`before creating new commit ${JSON.stringify(newTree)}`);
        const newCommit = await createNewCommit(
          client, 
          github,
          commitMessage,
          newTree.sha,
          currentCommit.commitSha
        )
    
    
        
    
        const tag_rsp = await client.rest.git.createTag({
          ...github.context.repo,
          tag: `v${tag}`,
          message: `v${tag}`,
          object: newCommit.sha,
          type: 'commit'
        })
        if (tag_rsp.status !== 201) {
          core.setFailed(`Failed to create tag object (status=${tag_rsp.status})`)
          return
        }
      
        const ref_rsp = await client.rest.git.createRef({
          ...github.context.repo,
          ref: `refs/tags/v${tag}`,
          sha: newCommit.sha
        })
        if (ref_rsp.status !== 201) {
          core.setFailed(`Failed to create tag ref(status = ${tag_rsp.status})`)
          return
        }
      
        
    
        const ref_branch_rsp = await client.rest.git.createRef({
          ...github.context.repo,
          ref: `refs/heads/release-v${tag}`,
          sha: newCommit.sha
        })
        if (ref_rsp.status !== 201) {
          core.setFailed(`Failed to create tag ref(status = ${tag_rsp.status})`)
          return
        }
        let basehead = `master...release-v${tag}`;
    
        if (oldVersion != null && oldVersion != "") {
            basehead = `release-v${oldVersion}...release-v${tag}`
        }
    
        core.info(`Tagged ${tag_rsp.data.sha} as ${tag}`)
        const resultOfComparation = await client.rest.repos.compareCommitsWithBasehead({
          ...github.context.repo,
          basehead
        })
        //console.log(`result: ${JSON.stringify(resultOfComparation.data.commits)}`);
        let message = "Release Notes:\n The commit list: \n";
        resultOfComparation.data.commits.forEach(theCommit => {
          message += theCommit.commit.sha + ':' + theCommit.commit.message + "\n";
        })
        core.setOutput('release-notes',message);
        core.info(`Tagged ${ref_branch_rsp.data.sha} as ${tag}`)
    }

module.exports = {createTag, createNewCommit};