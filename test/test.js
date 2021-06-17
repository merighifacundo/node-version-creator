const githubService  = require("../lib/github");
const array = [];
githubService.appendAdditionalFiles("lib,test", array).then((result) => (console.log(array)));