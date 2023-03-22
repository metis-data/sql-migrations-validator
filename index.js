const core = require('@actions/core');
const execSync = require('child_process').execSync;
const fs = require('fs');
const axios = require('axios');
const { parse } = require('pgsql-parser');
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
}

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
      `git diff --diff-filter=ACM ${shaFrom} ${shaTo} --name-only | grep '.sql' | jq -Rsc '. / "\n" - [""]'`,
    );
    const newMigrationsFiles = JSON.parse(output);
    console.log(`new files paths: ${newMigrationsFiles}`);
    if (newMigrationsFiles.length) {
      const migrationsData = [];
      const insights = {};
      execSync('npm install -g pgsql-parser');
      await Promise.all(
        newMigrationsFiles.map((migration, index) => {
          let fileData = fs.readFileSync(migration, { encoding: 'utf-8' });
          fileData = fileData.replace(
            /(\/\*[^*]*\*\/)|(\/\/[^*]*)|(--[^.].*)/gm,
            '',
          );
          const queries = fileData.split(/;\s*\n/).filter(Boolean);
          const rawInsight = execSync(`pgsql-parser ${migration}`);
          const insight = JSON.parse(rawInsight);
          const finalQueries = tryToSettle(queries, insight.length);
          migrationsData.push(...finalQueries);
          Object.assign(insights, { [index]: insight });
        }),
      );

      const res = await axios.post(
        `${url}/api/migrations/create`,
        {
          migrationsData,
          prId: `${pull_request.number}`,
          prName: pull_request.title || context.sha,
          insights,
        },
        { headers: { 'x-api-key': apiKey } },
      );
      console.log(
        `Got response status: ${res.status} with text: ${res.statusText}`,
      );

      await octokit.rest.issues.createComment({
        ...context.repo,
        issue_number: pull_request.number,
        body: `Metis analyzed your new migrations files. View the results under Pull Requests in the link: 
          ${encodeURI(`${url}/projects/${apiKey}`)}`,
      });
    }
  } catch (e) {
    core.error(`Error: ${e.status} ${e.message}`);
    core.setFailed(e);
  }
}

main();
