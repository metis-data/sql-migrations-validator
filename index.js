const execSync = require('child_process').execSync;
execSync('npm install -g pgsql-parser');
const globalPath = execSync('npm root -g');
const parserPath = `${globalPath}`.replace('\n', '') + '/pgsql-parser/main';
const core = require('@actions/core');
const fs = require('fs');
const axios = require('axios');
const { parse } = require(parserPath);
const { context, getOctokit } = require('@actions/github');

const tryToSettle = (queries, target) => {
  if (queries.length === target) return queries;
  const mergedQueries = [];
  queries.reduce((prev, curr) => {
    const query = prev + curr;
    try {
      parse(query);
      mergedQueries.push(query);
      return '';
    } catch (e) {
      return query + ';\n';
    }
  }, '');
  return mergedQueries;
};

async function main() {
  try {
    const shaFrom = core.getInput('from');
    const shaTo = core.getInput('to');
    const apiKey = core.getInput('metis_api_key');
    const githubToken = core.getInput('github_token');
    const url = core.getInput('target_url');
    const pull_request = context.payload?.pull_request;
    const octokit = getOctokit(githubToken);

    console.log(`sha from ${shaFrom}`);
    console.log(`sha to ${shaTo}`);
    if (!apiKey) {
      console.warn('api key is not defined');
    }

    let output = execSync(
      `git diff --diff-filter=ACM ${shaFrom} ${shaTo} --name-only | grep '.sql$' | jq -Rsc '. / "\n" - [""]'`,
    );
    const newMigrationsFiles = JSON.parse(output);
    console.log(`new files paths: ${newMigrationsFiles}`);

    if (newMigrationsFiles.length) {
      const migrationsData = [];
      const insights = {};
      await Promise.all(
        newMigrationsFiles.map((migration, index) => {
          let fileData = fs.readFileSync(migration, { encoding: 'utf-8' });
          fileData = fileData.replace(
            /(\/\*[^*]*\*\/)|(\/\/[^*]*)|(--[^.].*)/gm,
            '',
          );
          const queries = fileData.split(/;\s*\n/).filter(Boolean);
          const insight = parse(fileData);
          const finalQueries = tryToSettle(queries, insight.length);
          migrationsData.push(...finalQueries);
          Object.assign(insights, { [index]: insight });
        }),
      );
      const prId =
        `${pull_request?.number}` ||
        `${Math.floor(10000 + Math.random() * 90000)}`;

      const res = await axios.post(
        `${url}/api/migrations/create`,
        {
          migrationsData,
          prId,
          prName: pull_request?.title || context.sha,
          prUrl: pull_request?.html_url,
          insights,
        },
        { headers: { 'x-api-key': apiKey } },
      );
      console.log(
        `Got response status: ${res.status} with text: ${res.statusText}`,
      );

      try {
        await octokit.rest.issues.createComment({
          ...context.repo,
          issue_number: prId,
          body: `Metis analyzed your new migrations files. View the results under Pull Requests in the link: 
          ${encodeURI(`${url}/projects/${apiKey}/test/${shaFrom}/migration/${prId}`)}`,
        });
      } catch (e) {
        console.log(`Failed to comment on PR: ${e.status} ${e.message}`);
      }
    }
  } catch (e) {
    core.error(`Error: ${e.status} ${e.message}`);
    core.setFailed(e);
  }
}

main();
