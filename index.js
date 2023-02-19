const core = require("@actions/core");
const execSync = require("child_process").execSync;
const fs = require("fs");
const axios = require("axios");
const path = require("path");
const { context, getOctokit } = require('@actions/github');
const { DataTypes, Sequelize } = require('sequelize');
// const { Umzug } = require('umzug');

const SEQUELIZE_EXECUTION_LOG_PREFIX = 'Executing (default): ';
// const writeFile = util.promisify(fs.writeFileSync);
// const writeFileFunc = async (path, data, options) => { await writeFile(path, data, options); };
// const appendFile = util.promisify(fs.appendFileSync);
// const appendFileFunc = async (path, data, options) => { await appendFile(path, data, options); };

async function main() {
  try {
    const shaFrom = core.getInput("from");
    const shaTo = core.getInput("to");
    const apiKey = core.getInput("metis_api_key");
    const githubToken = core.getInput("github_token");
    const url = core.getInput("target_url");
    const migrationsDir = core.getInput("migrations_dir");
    const pull_request = context.payload?.pull_request;
    const octokit = getOctokit(githubToken);

    console.log(`sha from ${shaFrom}`);
    console.log(`sha to ${shaTo}`);
    console.log(`api key ${apiKey}`);
    console.log(`migrations dir ${migrationsDir}`);

    let diffCmd = `git diff --diff-filter=ACM ${shaFrom} ${shaTo} --name-only | grep '.sql' | jq -Rsc '. / "\n" - [""]'`;
    if (migrationsDir) {
      diffCmd = `git diff --diff-filter=ACM ${shaFrom} ${shaTo} --name-only ${migrationsDir} | jq -Rsc '. / "\n" - [""]'`;
    }
    const output = execSync(diffCmd);
    const newMigrationsFiles = JSON.parse(output);
    console.log(`new files paths: ${newMigrationsFiles}`);
    // const newMigrationsFiles = ['migrations/stam.js'];
    // const migrationsDir = 'migrations';
    if (newMigrationsFiles.length) {
      let sequelize, queryInterface;
      execSync('npm install -g pgsql-parser');
      if (migrationsDir) {
        sequelize = new Sequelize({
          host: '18.193.157.86',
          port: 5555,
          username: 'readonly',
          password: 'readonly',
          database: 'demo',
          schema: 'migrations',
          dialect: 'postgres',
          logging: (sql) => queries.push(sql),
        });
        queryInterface = sequelize.getQueryInterface();
        // umzug = new Umzug({
        //   migrations: {
        //     glob: `${migrationsDir}/*.js`,
        //     resolve: ({ name, path, context }) => {
        //       const migration = require(path || '')
        //       return {
        //         name,
        //         up: async () => migration.up(context, Sequelize),
        //         down: async () => migration.down(context, Sequelize),
        //       }
        //     },
        //   },
        //   context: queryInterface,
        //   logger: console
        // })
      }

      const migrationsData = [];
      const insights = {};
      const tempMigrations = [];
      await Promise.all(
        newMigrationsFiles.map(async (migration, index) => {
          if (migration.endsWith('.js') || migration.endsWith('.ts')) {
            const requirePath = path.join(process.cwd(), migration);
            console.log(`path: ${requirePath}`);
            const { up, down } = require(`${requirePath}`);
            if (typeof up !== 'function' || typeof down !== 'function') {
              core.info(`Migration file ${migration} is missing up/down definitions`);
              return;
            }
            const tempMigration = `temp_${index}.sql`;
            tempMigrations.push(tempMigration);
            await up(queryInterface, DataTypes);
            const rawUpSql = queries.pop()?.split(SEQUELIZE_EXECUTION_LOG_PREFIX)?.[1];
            console.log(`Got up sql ${rawUpSql}`);
            fs.writeFileSync(tempMigration, rawUpSql, { encoding: 'utf-8', flag: 'wx' } );

            await down(queryInterface, DataTypes);
            const rawDownSql = queries.pop()?.split(SEQUELIZE_EXECUTION_LOG_PREFIX)?.[1];
            console.log(`Got down sql ${rawDownSql}`);
            fs.appendFileSync(tempMigration, rawDownSql, { encoding: 'utf-8' });
          }
        }),
      );
      const appliedMigrations = migrationsDir ? tempMigrations : newMigrationsFiles;
      console.log(`applied migrations ${appliedMigrations}`);

      appliedMigrations.map((migration, index) => {
        migrationsData.push(fs.readFileSync(migration, { encoding: 'utf-8' }));
        console.log(`running the parser on migration ${migration}`);
        const rawInsight = execSync(`pgsql-parser ${migration}`);
        const insight = JSON.parse(rawInsight);
        console.log(`got insights ${insight}`);
        Object.assign(insights, {[index]: insight});
      });

      console.log('trying to send insights');
      const res = await axios.post(`${url}/api/migrations/create`, {
        migrationsData,
        prId: `${pull_request.number}`,
        apiKey,
        insights
      });
      console.log(res);

      await octokit.rest.issues.createComment({
        ...context.repo,
        issue_number: pull_request.number,
        body: `Metis analyzed your new migrations files. View the results in the link: ${encodeURI(
          `${url}/migrations/${apiKey}/${pull_request.number}`
        )}`,
      });
    }
  } catch (e) {
    core.error(e);
    core.setFailed(e);
  }
}

const queries = [];

main();