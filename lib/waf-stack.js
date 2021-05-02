"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WAFStack = void 0;
const core_1 = require("@aws-cdk/core");
const wafv2 = require("@aws-cdk/aws-wafv2");
class WAFStack extends core_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const finalRules = [];
        // IP Allowlist
        const allowed_ips = new wafv2.CfnIPSet(this, 'IPSet', {
            addresses: props.WafProps.allowedIPs,
            ipAddressVersion: 'IPV4',
            scope: 'REGIONAL',
            description: 'IPAllowlist' + this.stackName
        });
        const allow_xff_ip_rule = {
            name: 'allow_xff_ip_rule',
            priority: 0,
            statement: {
                ipSetReferenceStatement: {
                    arn: allowed_ips.attrArn,
                    ipSetForwardedIpConfig: {
                        fallbackBehavior: 'NO_MATCH',
                        headerName: 'X-Forwarded-For',
                        position: 'ANY'
                    }
                }
            },
            action: { allow: {} },
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: this.stackName + 'AllowXFFIPRule',
                sampledRequestsEnabled: true
            }
        };
        finalRules.push(allow_xff_ip_rule);
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
                metricName: this.stackName + '_allow_src_ip_rule',
                sampledRequestsEnabled: true
            }
        };
        finalRules.push(allow_src_ip_rule);
        // UserAgent Allowlist - only when the parameter is present
        if (props.WafProps.allowedUserAgents) {
            const allowed_user_agent = new wafv2.CfnRegexPatternSet(this, 'UserAgent', {
                regularExpressionList: props.WafProps.allowedUserAgents,
                scope: 'REGIONAL',
                description: 'UserAgentAllowlist' + this.stackName
            });
            const allow_user_agent_rule = {
                name: 'allow_user_agent_rule',
                priority: 2,
                statement: {
                    regexPatternSetReferenceStatement: {
                        arn: allowed_user_agent.attrArn,
                        fieldToMatch: { singleHeader: { name: 'User-Agent' } },
                        textTransformations: [{
                                priority: 0,
                                type: 'NONE'
                            }]
                    }
                },
                action: { allow: {} },
                visibilityConfig: {
                    cloudWatchMetricsEnabled: true,
                    metricName: this.stackName + '_allow_user_agent_rule',
                    sampledRequestsEnabled: true
                }
            };
            finalRules.push(allow_user_agent_rule);
        }
        // Activate the rules or not
        let overrideAction = { count: {} };
        let action = { count: {} };
        if (props.WafProps.activate == true) {
            overrideAction = { none: {} };
            action = { block: {} };
        }
        // Exclude specific rules from AWS Core Rule Group - only when the parameter is present
        const excludedAwsRules = [];
        if (props.WafProps.excludedAwsRules) {
            props.WafProps.excludedAwsRules.forEach(ruleName => {
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
                metricName: this.stackName + '_common_rule_set',
                sampledRequestsEnabled: true
            }
        };
        finalRules.push(common_rule_set);
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
                metricName: this.stackName + '_php_rule_set',
                sampledRequestsEnabled: true
            }
        };
        finalRules.push(php_rule_set);
        // Implement rate-based limit
        const rate_limit_rule = {
            name: 'rate_limit_rule',
            priority: 20,
            statement: {
                rateBasedStatement: {
                    aggregateKeyType: 'FORWARDED_IP',
                    forwardedIpConfig: {
                        fallbackBehavior: 'MATCH',
                        headerName: 'X-Forwarded-For'
                    },
                    limit: 5 * 60 * 1 // Rate-based rule inspects 5-minute time span. Therefore, 5*60*1 means one requsts per second on average.
                }
            },
            action: action,
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: this.stackName + '_rate_limit_rule',
                sampledRequestsEnabled: true
            }
        };
        finalRules.push(rate_limit_rule);
        const web_acl = new wafv2.CfnWebACL(this, 'WebAcl', {
            name: this.stackName,
            defaultAction: { allow: {} },
            scope: 'REGIONAL',
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: this.stackName + 'WebAcl',
                sampledRequestsEnabled: true,
            },
            rules: finalRules
        });
        new wafv2.CfnWebACLAssociation(this, 'ALBAssociation', {
            // If the application stack has had the ALB ARN exported, importValue could be used as below:
            // resourceArn: cdk.Fn.importValue("WAFTestALB"),
            resourceArn: props.WafProps.associatedLoadBalancerArn,
            webAclArn: web_acl.attrArn
        });
    }
}
exports.WAFStack = WAFStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2FmLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2FmLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdDQUFpRjtBQUNqRiw0Q0FBNEM7QUFlNUMsTUFBYSxRQUFTLFNBQVEsWUFBSztJQUNqQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW9CO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sVUFBVSxHQUFtQyxFQUFFLENBQUM7UUFFdEQsZUFBZTtRQUNmLE1BQU0sV0FBVyxHQUFHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQ3BELFNBQVMsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVU7WUFDcEMsZ0JBQWdCLEVBQUUsTUFBTTtZQUN4QixLQUFLLEVBQUUsVUFBVTtZQUNqQixXQUFXLEVBQUUsYUFBYSxHQUFDLElBQUksQ0FBQyxTQUFTO1NBQzFDLENBQUMsQ0FBQTtRQUVGLE1BQU0saUJBQWlCLEdBQUc7WUFDeEIsSUFBSSxFQUFFLG1CQUFtQjtZQUN6QixRQUFRLEVBQUUsQ0FBQztZQUNYLFNBQVMsRUFBRTtnQkFDVCx1QkFBdUIsRUFBRTtvQkFDdkIsR0FBRyxFQUFFLFdBQVcsQ0FBQyxPQUFPO29CQUN4QixzQkFBc0IsRUFBRTt3QkFDdEIsZ0JBQWdCLEVBQUcsVUFBVTt3QkFDN0IsVUFBVSxFQUFHLGlCQUFpQjt3QkFDOUIsUUFBUSxFQUFHLEtBQUs7cUJBQ2pCO2lCQUNGO2FBQ0Y7WUFDRCxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQ3JCLGdCQUFnQixFQUFFO2dCQUNkLHdCQUF3QixFQUFFLElBQUk7Z0JBQzlCLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLGdCQUFnQjtnQkFDM0Msc0JBQXNCLEVBQUUsSUFBSTthQUMvQjtTQUNGLENBQUE7UUFF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d0JBQXdCLEVBQUUsSUFBSTtnQkFDOUIsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLEdBQUMsa0JBQWtCO2dCQUM3QyxzQkFBc0IsRUFBRSxJQUFJO2FBQzdCO1NBQ0YsQ0FBQTtRQUNELFVBQVUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFaEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDbEQsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3BCLGFBQWEsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDNUIsS0FBSyxFQUFFLFVBQVU7WUFDakIsZ0JBQWdCLEVBQUU7Z0JBQ2hCLHdCQUF3QixFQUFFLElBQUk7Z0JBQzlCLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxHQUFDLFFBQVE7Z0JBQ25DLHNCQUFzQixFQUFFLElBQUk7YUFDN0I7WUFDRCxLQUFLLEVBQUUsVUFBVTtTQUNsQixDQUFDLENBQUE7UUFFRixJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDckQsNkZBQTZGO1lBQzdGLGlEQUFpRDtZQUNqRCxXQUFXLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUI7WUFDckQsU0FBUyxFQUFFLE9BQU8sQ0FBQyxPQUFPO1NBQzNCLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRjtBQTFMRCw0QkEwTEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25zdHJ1Y3QsIFN0YWNrLCBTdGFja1Byb3BzLCBTdGFnZVByb3BzLCBTdGFnZSwgfSBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCAqIGFzIHdhZnYyIGZyb20gJ0Bhd3MtY2RrL2F3cy13YWZ2Mic7XG5cbmludGVyZmFjZSBXYWZQcm9wcyBleHRlbmRzIFN0YWNrUHJvcHMge1xuICBhY3RpdmF0ZT86IGJvb2xlYW47XG4gIGFsbG93ZWRJUHM6IHN0cmluZ1tdO1xuICBhbGxvd2VkVXNlckFnZW50cz86IHN0cmluZ1tdO1xuICBleGNsdWRlZEF3c1J1bGVzPzogc3RyaW5nW107XG4gIGFzc29jaWF0ZWRMb2FkQmFsYW5jZXJBcm46IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXNvdXJjZVByb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gIGVudm5hbWU6IHN0cmluZztcbiAgV2FmUHJvcHM6IFdhZlByb3BzXG59XG5cbmV4cG9ydCBjbGFzcyBXQUZTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFJlc291cmNlUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGZpbmFsUnVsZXM6IHdhZnYyLkNmbldlYkFDTC5SdWxlUHJvcGVydHlbXSA9IFtdO1xuXG4gICAgLy8gSVAgQWxsb3dsaXN0XG4gICAgY29uc3QgYWxsb3dlZF9pcHMgPSBuZXcgd2FmdjIuQ2ZuSVBTZXQodGhpcywgJ0lQU2V0Jywge1xuICAgICAgYWRkcmVzc2VzOiBwcm9wcy5XYWZQcm9wcy5hbGxvd2VkSVBzLFxuICAgICAgaXBBZGRyZXNzVmVyc2lvbjogJ0lQVjQnLFxuICAgICAgc2NvcGU6ICdSRUdJT05BTCcsXG4gICAgICBkZXNjcmlwdGlvbjogJ0lQQWxsb3dsaXN0Jyt0aGlzLnN0YWNrTmFtZVxuICAgIH0pXG5cbiAgICBjb25zdCBhbGxvd194ZmZfaXBfcnVsZSA9IHtcbiAgICAgIG5hbWU6ICdhbGxvd194ZmZfaXBfcnVsZScsXG4gICAgICBwcmlvcml0eTogMCxcbiAgICAgIHN0YXRlbWVudDoge1xuICAgICAgICBpcFNldFJlZmVyZW5jZVN0YXRlbWVudDoge1xuICAgICAgICAgIGFybjogYWxsb3dlZF9pcHMuYXR0ckFybixcbiAgICAgICAgICBpcFNldEZvcndhcmRlZElwQ29uZmlnOiB7XG4gICAgICAgICAgICBmYWxsYmFja0JlaGF2aW9yIDogJ05PX01BVENIJyxcbiAgICAgICAgICAgIGhlYWRlck5hbWUgOiAnWC1Gb3J3YXJkZWQtRm9yJyxcbiAgICAgICAgICAgIHBvc2l0aW9uIDogJ0FOWSdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBhY3Rpb246IHsgYWxsb3c6IHt9IH0sXG4gICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgIG1ldHJpY05hbWU6IHRoaXMuc3RhY2tOYW1lKydBbGxvd1hGRklQUnVsZScsXG4gICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZVxuICAgICAgfVxuICAgIH1cblxuICAgIGZpbmFsUnVsZXMucHVzaChhbGxvd194ZmZfaXBfcnVsZSlcblxuICAgIGNvbnN0IGFsbG93X3NyY19pcF9ydWxlID0ge1xuICAgICAgbmFtZTogJ2FsbG93X3NyY19pcF9ydWxlJyxcbiAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgc3RhdGVtZW50OiB7XG4gICAgICAgIGlwU2V0UmVmZXJlbmNlU3RhdGVtZW50OiB7XG4gICAgICAgICAgYXJuOiBhbGxvd2VkX2lwcy5hdHRyQXJuXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBhY3Rpb246IHsgYWxsb3c6IHt9IH0sXG4gICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgIG1ldHJpY05hbWU6IHRoaXMuc3RhY2tOYW1lKydfYWxsb3dfc3JjX2lwX3J1bGUnLFxuICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWVcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmaW5hbFJ1bGVzLnB1c2goYWxsb3dfc3JjX2lwX3J1bGUpXG5cbiAgICAvLyBVc2VyQWdlbnQgQWxsb3dsaXN0IC0gb25seSB3aGVuIHRoZSBwYXJhbWV0ZXIgaXMgcHJlc2VudFxuICAgIGlmIChwcm9wcy5XYWZQcm9wcy5hbGxvd2VkVXNlckFnZW50cyl7XG4gICAgICBjb25zdCBhbGxvd2VkX3VzZXJfYWdlbnQgPSBuZXcgd2FmdjIuQ2ZuUmVnZXhQYXR0ZXJuU2V0KHRoaXMsICdVc2VyQWdlbnQnLCB7XG4gICAgICAgIHJlZ3VsYXJFeHByZXNzaW9uTGlzdDogcHJvcHMuV2FmUHJvcHMuYWxsb3dlZFVzZXJBZ2VudHMsXG4gICAgICAgIHNjb3BlOiAnUkVHSU9OQUwnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1VzZXJBZ2VudEFsbG93bGlzdCcrdGhpcy5zdGFja05hbWVcbiAgICAgIH0pXG5cbiAgICAgIGNvbnN0IGFsbG93X3VzZXJfYWdlbnRfcnVsZSA9IHtcbiAgICAgICAgbmFtZTogJ2FsbG93X3VzZXJfYWdlbnRfcnVsZScsXG4gICAgICAgIHByaW9yaXR5OiAyLFxuICAgICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgICByZWdleFBhdHRlcm5TZXRSZWZlcmVuY2VTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgIGFybjogYWxsb3dlZF91c2VyX2FnZW50LmF0dHJBcm4sXG4gICAgICAgICAgICBmaWVsZFRvTWF0Y2g6IHsgc2luZ2xlSGVhZGVyOiB7IG5hbWU6ICdVc2VyLUFnZW50JyB9fSxcbiAgICAgICAgICAgIHRleHRUcmFuc2Zvcm1hdGlvbnM6IFsge1xuICAgICAgICAgICAgICBwcmlvcml0eTogMCxcbiAgICAgICAgICAgICAgdHlwZTogJ05PTkUnXG4gICAgICAgICAgICB9IF1cbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGFjdGlvbjogeyBhbGxvdzoge30gfSxcbiAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogdGhpcy5zdGFja05hbWUrJ19hbGxvd191c2VyX2FnZW50X3J1bGUnLFxuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZVxuICAgICAgfX1cblxuICAgICAgZmluYWxSdWxlcy5wdXNoKGFsbG93X3VzZXJfYWdlbnRfcnVsZSlcbiAgICB9XG5cbiAgICAvLyBBY3RpdmF0ZSB0aGUgcnVsZXMgb3Igbm90XG4gICAgbGV0IG92ZXJyaWRlQWN0aW9uOiBvYmplY3QgPSB7IGNvdW50OiB7fSB9XG4gICAgbGV0IGFjdGlvbjogb2JqZWN0ID0geyBjb3VudDoge30gfVxuICAgIGlmICggcHJvcHMuV2FmUHJvcHMuYWN0aXZhdGUgPT0gdHJ1ZSApIHtcbiAgICAgIG92ZXJyaWRlQWN0aW9uID0geyBub25lOiB7fSB9XG4gICAgICBhY3Rpb24gPSB7IGJsb2NrOiB7fSB9XG4gICAgfVxuXG4gICAgLy8gRXhjbHVkZSBzcGVjaWZpYyBydWxlcyBmcm9tIEFXUyBDb3JlIFJ1bGUgR3JvdXAgLSBvbmx5IHdoZW4gdGhlIHBhcmFtZXRlciBpcyBwcmVzZW50XG4gICAgY29uc3QgZXhjbHVkZWRBd3NSdWxlczogd2FmdjIuQ2ZuV2ViQUNMLkV4Y2x1ZGVkUnVsZVByb3BlcnR5W10gPSBbXTtcbiAgICBpZiAocHJvcHMuV2FmUHJvcHMuZXhjbHVkZWRBd3NSdWxlcyl7XG4gICAgICBwcm9wcy5XYWZQcm9wcy5leGNsdWRlZEF3c1J1bGVzLmZvckVhY2goIHJ1bGVOYW1lID0+IHtcbiAgICAgICAgZXhjbHVkZWRBd3NSdWxlcy5wdXNoKHtcbiAgICAgICAgICBuYW1lOiBydWxlTmFtZVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEltcGxlbWVudCBBV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0XG4gICAgY29uc3QgY29tbW9uX3J1bGVfc2V0ID0ge1xuICAgICAgbmFtZTogJ2NvbW1vbl9ydWxlX3NldCcsXG4gICAgICBwcmlvcml0eTogMTAsXG4gICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgICBtYW5hZ2VkUnVsZUdyb3VwU3RhdGVtZW50OiB7XG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0JyxcbiAgICAgICAgICAgICAgdmVuZG9yTmFtZTogJ0FXUycsXG4gICAgICAgICAgICAgIGV4Y2x1ZGVkUnVsZXM6IGV4Y2x1ZGVkQXdzUnVsZXNcbiAgICAgICAgICB9XG4gICAgICB9LFxuICAgICAgb3ZlcnJpZGVBY3Rpb246IG92ZXJyaWRlQWN0aW9uLFxuICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICBtZXRyaWNOYW1lOiB0aGlzLnN0YWNrTmFtZSsnX2NvbW1vbl9ydWxlX3NldCcsXG4gICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZVxuICAgICAgfVxuICAgIH1cblxuICAgIGZpbmFsUnVsZXMucHVzaChjb21tb25fcnVsZV9zZXQpXG5cblxuICAgIC8vIEltcGxlbWVudCBBV1NNYW5hZ2VkUnVsZXNQSFBSdWxlU2V0XG4gICAgY29uc3QgcGhwX3J1bGVfc2V0ID0ge1xuICAgICAgbmFtZTogJ3BocF9ydWxlX3NldCcsXG4gICAgICBwcmlvcml0eTogMTEsXG4gICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgICBtYW5hZ2VkUnVsZUdyb3VwU3RhdGVtZW50OiB7XG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNQSFBSdWxlU2V0JyxcbiAgICAgICAgICAgICAgdmVuZG9yTmFtZTogJ0FXUydcbiAgICAgICAgICB9XG4gICAgICB9LFxuICAgICAgb3ZlcnJpZGVBY3Rpb246IG92ZXJyaWRlQWN0aW9uLFxuICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICBtZXRyaWNOYW1lOiB0aGlzLnN0YWNrTmFtZSsnX3BocF9ydWxlX3NldCcsXG4gICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgICBmaW5hbFJ1bGVzLnB1c2gocGhwX3J1bGVfc2V0KVxuXG4gICAgLy8gSW1wbGVtZW50IHJhdGUtYmFzZWQgbGltaXRcbiAgICBjb25zdCByYXRlX2xpbWl0X3J1bGUgPSB7XG4gICAgICBuYW1lOiAncmF0ZV9saW1pdF9ydWxlJyxcbiAgICAgIHByaW9yaXR5OiAyMCxcbiAgICAgIHN0YXRlbWVudDoge1xuICAgICAgICByYXRlQmFzZWRTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICBhZ2dyZWdhdGVLZXlUeXBlOiAnRk9SV0FSREVEX0lQJyxcbiAgICAgICAgICBmb3J3YXJkZWRJcENvbmZpZzoge1xuICAgICAgICAgICAgZmFsbGJhY2tCZWhhdmlvciA6ICdNQVRDSCcsXG4gICAgICAgICAgICBoZWFkZXJOYW1lIDogJ1gtRm9yd2FyZGVkLUZvcid9LFxuICAgICAgICAgIGxpbWl0OiA1KjYwKjEgLy8gUmF0ZS1iYXNlZCBydWxlIGluc3BlY3RzIDUtbWludXRlIHRpbWUgc3Bhbi4gVGhlcmVmb3JlLCA1KjYwKjEgbWVhbnMgb25lIHJlcXVzdHMgcGVyIHNlY29uZCBvbiBhdmVyYWdlLlxuICAgICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBhY3Rpb246IGFjdGlvbixcbiAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICBtZXRyaWNOYW1lOiB0aGlzLnN0YWNrTmFtZSsnX3JhdGVfbGltaXRfcnVsZScsXG4gICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWVcbiAgICAgIH1cbiAgICB9XG4gICAgZmluYWxSdWxlcy5wdXNoKHJhdGVfbGltaXRfcnVsZSlcblxuICAgIGNvbnN0IHdlYl9hY2wgPSBuZXcgd2FmdjIuQ2ZuV2ViQUNMKHRoaXMsICdXZWJBY2wnLCB7XG4gICAgICBuYW1lOiB0aGlzLnN0YWNrTmFtZSxcbiAgICAgIGRlZmF1bHRBY3Rpb246IHsgYWxsb3c6IHt9IH0sXG4gICAgICBzY29wZTogJ1JFR0lPTkFMJyxcbiAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICBtZXRyaWNOYW1lOiB0aGlzLnN0YWNrTmFtZSsnV2ViQWNsJyxcbiAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBydWxlczogZmluYWxSdWxlc1xuICAgIH0pXG5cbiAgICBuZXcgd2FmdjIuQ2ZuV2ViQUNMQXNzb2NpYXRpb24odGhpcywgJ0FMQkFzc29jaWF0aW9uJywge1xuICAgICAgLy8gSWYgdGhlIGFwcGxpY2F0aW9uIHN0YWNrIGhhcyBoYWQgdGhlIEFMQiBBUk4gZXhwb3J0ZWQsIGltcG9ydFZhbHVlIGNvdWxkIGJlIHVzZWQgYXMgYmVsb3c6XG4gICAgICAvLyByZXNvdXJjZUFybjogY2RrLkZuLmltcG9ydFZhbHVlKFwiV0FGVGVzdEFMQlwiKSxcbiAgICAgIHJlc291cmNlQXJuOiBwcm9wcy5XYWZQcm9wcy5hc3NvY2lhdGVkTG9hZEJhbGFuY2VyQXJuLFxuICAgICAgd2ViQWNsQXJuOiB3ZWJfYWNsLmF0dHJBcm5cbiAgICB9KVxuICB9XG59XG4iXX0=