import { Environment } from '@aws-cdk/core'

const toolsAccountEnv: Environment = {account: '<ToolsAccountId>', region: '<ToolsAccountRegion>'}; 
const preprodEnv: Environment = {account: '<TargetAccountId-Preprod>', region: '<TargetAccountRegion-Preprod>'};
const prodEnv: Environment = {account: '<TargetAccountId-Production>', region: '<TargetAccountRegion-Production>'};

const target = '<TargetAccountIdentifier>';
const appName = 'WAF';

const defaultAllowedIPs = [
    'a.a.a.a/32', 'b.b.b.b/32',     // Offices
    'c.c.c.c/32', 'd.d.d.d/32',     // Payment Gateways
]

const connectionArn = '<ArnOfToolsAccountCodeStarConnection>'
const repoOwner = '<RepositoryOwnerId>'
const RepoName = '<RepositoryName>'

export const preproduction_config = {
    envname: target + '-' + appName + '-preprod',
    // BitBucket repository info start
    owner: repoOwner,
    repo: RepoName,
    branch: 'preproduction',    // Update this line as necessary
    // BitBucket repository info end
    connectionArn: connectionArn,
    env: toolsAccountEnv,
    manualApprovals: true,  // Switch to "false" if you want to disable CFN Manual Approval step
    stageConfig: {
        ResourceProps: {
            envname: target + '-' + appName + '-preprod',
            WafProps: {
                activate: true,  // Update this line with either true or false, defining Block mode or Count-only mode, respectively.  
                allowedIPs: defaultAllowedIPs.concat([
                    'y.y.y.y/32' // AWS NAT GW of preprod vpc
                    // environment-specific comma-separated allow-list comes here
                ]),
                allowedUserAgents: [],  // Allowed User-Agent list that would have been blocked by AWS BadBot rule. Case-sensitive. Optional.
                excludedAwsRules: [],   // The rule to exclude (override) from AWS-managed RuleSet. Optional.
                associatedLoadBalancerArn: '<ArnOfPreproductionFrontendALB>'
            },
            env: preprodEnv,
        },
        envname: target + '-' + appName + '-preprod',
    }
}

export const production_config = {
    envname: target + '-' + appName + '-prod',
    // BitBucket repository info start
    owner: repoOwner,
    repo: RepoName,
    branch: 'production',    // Update this line as necessary
    // BitBucket repository info end
    connectionArn: connectionArn,
    env: toolsAccountEnv,
    manualApprovals: true,  // For safety, leave this as "true" for production 
    stageConfig: {
        ResourceProps: {
            envname: target + '-' + appName + '-prod',
            WafProps: {
                activate: false,
                allowedIPs: defaultAllowedIPs.concat([
                    'z.z.z.z/32' // AWS NAT GW of prod vpc
                    // environment-specific comma-separated allow-list comes here
                ]),
                allowedUserAgents: [],  // Allowed User-Agent list that would have been blocked by AWS BadBot rule. Case-sensitive. Optional.
                excludedAwsRules: [],   // The rule to exclude (override) from AWS-managed RuleSet. Optional.
                associatedLoadBalancerArn: '<ArnOfProductionFrontendALB>'
            },
            env: prodEnv,
        },
        envname: target + '-' + appName + '-prod',
    }
}
