import { Construct } from '@aws-cdk/core';
import * as wafv2 from '@aws-cdk/aws-wafv2';

export interface WebApplicationFirewallProps {
  activate?: boolean;
  allowedIPs: string[];
  allowedPaths?: string[];
  rateLimit: number;
  allowedUserAgents?: string[];
  excludedAwsRules?: string[];
  associatedLoadBalancerArn: string;
  wafName: string;
}

export class WebApplicationFirewall extends Construct {
  constructor(scope: Construct, id: string, props: WebApplicationFirewallProps) {
    super(scope, id);

    const finalRules: wafv2.CfnWebACL.RuleProperty[] = [];

    // IP Allowlist
    const allowed_ips = new wafv2.CfnIPSet(this, 'IPSet', {
      addresses: props.allowedIPs,
      ipAddressVersion: 'IPV4',
      scope: 'REGIONAL'
    })

    if (props.allowedPaths) {
         // Path Allowlist
         const allowed_paths = new wafv2.CfnRegexPatternSet(this, 'PathSet', {
           regularExpressionList: props.allowedPaths,
           scope: 'REGIONAL'
         })

         const allow_path_rule = {
           name: 'allow_path_rule',
           priority: 0,
           statement: {
             regexPatternSetReferenceStatement: {
               arn: allowed_paths.attrArn,
               fieldToMatch: {
                    uriPath: {}
               },
               textTransformations: [{
                    priority: 0,
                    type: 'NONE'
               }]
             }
           },
           action: { allow: {} },
           visibilityConfig: {
               cloudWatchMetricsEnabled: true,
               metricName: 'AllowPathRule',
               sampledRequestsEnabled: true
           }
         }
         finalRules.push(allow_path_rule)
    }


    const allow_xff_ip_rule = {
      name: 'allow_xff_ip_rule',
      priority: 1,
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
          metricName: 'AllowXFFIPRule',
          sampledRequestsEnabled: true
      }
    }

    finalRules.push(allow_xff_ip_rule)

    const allow_src_ip_rule = {
      name: 'allow_src_ip_rule',
      priority: 2,
      statement: {
        ipSetReferenceStatement: {
          arn: allowed_ips.attrArn
        }
      },
      action: { allow: {} },
      visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'allow_src_ip_rule',
          sampledRequestsEnabled: true
      }
    }

    finalRules.push(allow_src_ip_rule)

    // UserAgent Allowlist - only when the parameter is present
    if (props.allowedUserAgents){
      const allowed_user_agent = new wafv2.CfnRegexPatternSet(this, 'UserAgent', {
        regularExpressionList: props.allowedUserAgents,
        scope: 'REGIONAL'
      })

      const allow_user_agent_rule = {
        name: 'allow_user_agent_rule',
        priority: 3,
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
            metricName: 'allow_user_agent_rule',
            sampledRequestsEnabled: true
      }}

      finalRules.push(allow_user_agent_rule)
    }

    // Activate the rules or not
    let overrideAction: object = { count: {} }
    let action: object = { count: {} }
    if ( props.activate == true ) {
      overrideAction = { none: {} }
      action = { block: {} }
    }

    // Exclude specific rules from AWS Core Rule Group - only when the parameter is present
    const excludedAwsRules: wafv2.CfnWebACL.ExcludedRuleProperty[] = [];
    if (props.excludedAwsRules){
      props.excludedAwsRules.forEach( ruleName => {
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
          metricName: 'common_rule_set',
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
          metricName: 'php_rule_set',
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
            limit: props.rateLimit
          }
      },
      action: action,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'rate_limit_rule',
        sampledRequestsEnabled: true
      }
    }
    finalRules.push(rate_limit_rule)

    const web_acl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: props.wafName,
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'WebAcl',
        sampledRequestsEnabled: true,
      },
      rules: finalRules
    })

    new wafv2.CfnWebACLAssociation(this, 'ALBAssociation', {
      // If the application stack has had the ALB ARN exported, importValue could be used as below:
      // resourceArn: cdk.Fn.importValue("WAFTestALB"),
      resourceArn: props.associatedLoadBalancerArn,
      webAclArn: web_acl.attrArn
    })
  }
}
