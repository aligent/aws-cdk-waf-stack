# Aligent AWS WAF stack
This repository defines two AWS CDK stacks which can be included into an environment as required via Node.

## WAFStack
This stack defines a WAF configuration used to protect environments using an AWS WAF application.

## WAFPipelineStack
This stack configures an AWS CodePipeline application which will deploy an instance of the WAFStack based on changes to the configured repository.

## Install the node module within the client specific repository
Run `npm install git+ssh://git@bitbucket.org:aligent/aws-cdk-waf-stack`

## Local development
[NPM link](https://docs.npmjs.com/cli/v7/commands/npm-link) can be used to develop the module locally.
1. Pull this repository locally
2. `cd` into this repository
3. run `npm link`
4. `cd` into the downstream repo (client project, etc) and run `npm link 'aws-waf-stack'`
The downstream repository should now include a symlink to this module. Allowing local changes to be tested before pushing.

## Update variable
Copy and rename `environments.ts.template` to `environments.ts` into the local and update with client and environment-specific variables.
* Add client office and AWS NAT GW IP addresses to be allowed anytime
* Add User-Agent string to bypass the AWS default BadBot rule
* Add ARN of FE Application Load Balancers this WAF rule is to be associated with

Import either the `WAFStack` or `WAFPipelineStack` based on your use case.

## Monitor and activate
By default, WebACL this stack creates will work in COUNT mode to begin with.After a certain period of monitoring under real traffic and load, apply necessary changes, e.g. IP allow_list or rate limit, to avoid service interruptions before switching to BLOCK mode.
