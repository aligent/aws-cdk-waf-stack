import { Construct, Stack, StackProps } from '@aws-cdk/core';
interface WafProps extends StackProps {
    activate?: boolean;
    allowedIPs: string[];
    allowedUserAgents?: string[];
    excludedAwsRules?: string[];
    associatedLoadBalancerArn: string;
}
export interface ResourceProps extends StackProps {
    envname: string;
    WafProps: WafProps;
}
export declare class WAFStack extends Stack {
    constructor(scope: Construct, id: string, props: ResourceProps);
}
export {};
