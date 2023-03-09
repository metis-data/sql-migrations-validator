# sql-migrations-validator
Github action for auto analyze sql files in PRs

## SQL Migrations Validator Action For GitHub Actions

An action for auto recognize new sql files submitted in a pull request. Those files will be sent to be analyzed 
and derive insights on Metis-data platform.

> :warning: **Note:** In your SQL files make sure to separate statements with semicolon, otherwise the parsing process 
> may parse multiple statements as one.

## Usage

Add the following step to your workflow:
```
  - name: Analyze migrations
    uses: metis-data/sql-migrations-validator@v1
    with:
      from: ${{ github.event.pull_request.base.sha }}
      to: ${{ github.event.pull_request.head.sha }}
      github_token: ${{ github.token }}
      metis_api_key: <Your Api Key>
```
For example, you can run it in a GitHub Actions workflow job.
```
    on:
      pull_request:
        types: [opened, reopened, edited, synchronize, ready_for_review]
    
    jobs:
      migrations:
        name: Analyze new migrations
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@v3
            with:
              fetch-depth: 0
          - name: Compare migrations
            uses: metis-data/sql-migrations-validator@v1
            with:
              from: ${{ github.event.pull_request.base.sha }}
              to: ${{ github.event.pull_request.head.sha }}
              github_token: ${{ github.token }}
              metis_api_key: <Your Api Key>
```
### Parameters
- `from`: Base sha to be compared
- `to`: Branch sha to be compared with
- `github_token`: Auto generated workflow GitHub token
- `metis_api_key`: Metis Api Key generated at [Metis](https://app.metisdata.io/)

## License Summary
This code is made available under the MIT license.

## Issues
If you would like to report a potential issue please use [Issues](https://github.com/metis-data/sql-migrations-validator/issues)