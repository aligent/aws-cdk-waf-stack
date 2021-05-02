import { Construct, Stack, StackProps, StageProps, Stage, } from '@aws-cdk/core';
import * as wafv2 from '@aws-cdk/aws-wafv2';

interface WafProps extends StackProps {
  activate?: boolean;
  allowedIPs: string[];
  allowedUserAgents?: string[];
  excludedAwsRules?: string[];
  associatedLoadBalancerArn: string;
}

export interface ResourceProps extends StackProps {
  envname: string;
  WafProps: WafProps
}

export class WAFStack extends Stack {
  constructor(scope: Construct, id: string, props: ResourceProps) {
    super(scope, id, props);

    const finalRules: wafv2.CfnWebACL.RuleProperty[] = [];

    // IP Allowlist
    const allowed_ips = new wafv2.CfnIPSet(this, 'IPSet', {
      addresses: props.WafProps.allowedIPs,
      ipAddressVersion: 'IPV4',
      scope: 'REGIONAL',
      description: 'IPAllowlist'+this.stackName
    })

    const allow_xff_ip_rule = {
      name: 'allow_xff_ip_rule',
      priority: 0,
      statement: {
        ipSetReferenceStatement: {
          arn: allowed_ips.attrArn,
          ipSetForwardedIpConfig: {
            fallbackBehavior : 'NO_MATCH',
            headerName : 'X-Forwarded-For',
            position : 'ANY'
          }
        }
      },
      action: { allow: {} },
      visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: this.stackName+'AllowXFFIPRule',
          sampledRequestsEnabled: true
      }
    }

    finalRules.push(allow_xff_ip_rule)

    const allow_src_ip_rule = {
      name: 'allow_src_ip_rule',
      priority: 1,
      statement: {
        ipSetReferenceStatement: {
          arn: allowed_ips.attrArn
        }
      },
      action: { allow: {} },
      visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: this.stackName+'_allow_src_ip_rule',
          sampledRequestsEnabled: true
      }
    }

    finalRules.push(allow_src_ip_rule)

    // UserAgent Allowlist - only when the parameter is present
    if (props.WafProps.allowedUserAgents){
      const allowed_user_agent = new wafv2.CfnRegexPatternSet(this, 'UserAgent', {
        regularExpressionList: props.WafProps.allowedUserAgents,
        scope: 'REGIONAL',
        description: 'UserAgentAllowlist'+this.stackName
      })

      const allow_user_agent_rule = {
        name: 'allow_user_agent_rule',
        priority: 2,
        statement: {
          regexPatternSetReferenceStatement: {
            arn: allowed_user_agent.attrArn,
            fieldToMatch: { singleHeader: { name: 'User-Agent' }},
            textTransformations: [ {
              priority: 0,
              type: 'NONE'
            } ]
          }
        },
        action: { allow: {} },
        visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: this.stackName+'_allow_user_agent_rule',
            sampledRequestsEnabled: true
      }}

      finalRules.push(allow_user_agent_rule)
    }

    // Activate the rules or not
    let overrideAction: object = { count: {} }
    let action: object = { count: {} }
    if ( props.WafProps.activate == true ) {
      overrideAction = { none: {} }
      action = { block: {} }
    }

    // Exclude specific rules from AWS Core Rule Group - only when the parameter is present
    const excludedAwsRules: wafv2.CfnWebACL.ExcludedRuleProperty[] = [];
    if (props.WafProps.excludedAwsRules){
      props.WafProps.excludedAwsRules.forEach( ruleName => {
        excludedAwsRules.push({
          name: ruleName
        });
      });
    }

    // Implement AWSManagedRulesCommonRuleSet
    const common_rule_set = {
      name: 'common_rule_set',
      priority: 10,
      statement: {
          managedRuleGroupStatement: {
              name: 'AWSManagedRulesCommonRuleSet',
              vendorName: 'AWS',
              excludedRules: excludedAwsRules
          }
      },
      overrideAction: overrideAction,
      visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: this.stackName+'_common_rule_set',
          sampledRequestsEnabled: true
      }
    }

    finalRules.push(common_rule_set)


    // Implement AWSManagedRulesPHPRuleSet
    const php_rule_set = {
      name: 'php_rule_set',
      priority: 11,
      statement: {
          managedRuleGroupStatement: {
              name: 'AWSManagedRulesPHPRuleSet',
              vendorName: 'AWS'
          }
      },
      overrideAction: overrideAction,
      visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: this.stackName+'_php_rule_set',
          sampledRequestsEnabled: true
      }
    }
    finalRules.push(php_rule_set)

    // Implement rate-based limit
    const rate_limit_rule = {
      name: 'rate_limit_rule',
      priority: 20,
      statement: {
        rateBasedStatement: {
          aggregateKeyType: 'FORWARDED_IP',
          forwardedIpConfig: {
            fallbackBehavior : 'MATCH',
            headerName : 'X-Forwarded-For'},
          limit: 5*60*1 // Rate-based rule inspects 5-minute time span. Therefore, 5*60*1 means one requsts per second on average.
          }
      },
      action: action,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: this.stackName+'_rate_limit_rule',
        sampledRequestsEnabled: true
      }
    }
    finalRules.push(rate_limit_rule)

    const web_acl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: this.stackName,
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: this.stackName+'WebAcl',
        sampledRequestsEnabled: true,
      },
      rules: finalRules
    })

    new wafv2.CfnWebACLAssociation(this, 'ALBAssociation', {
      // If the application stack has had the ALB ARN exported, importValue could be used as below:
      // resourceArn: cdk.Fn.importValue("WAFTestALB"),
      resourceArn: props.WafProps.associatedLoadBalancerArn,
      webAclArn: web_acl.attrArn
    })
  }
}
