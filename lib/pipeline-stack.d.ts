import { Construct, Stack, StackProps, StageProps } from '@aws-cdk/core';
import { ResourceProps } from "./waf-stack";
interface PipelineStageProps extends StageProps {
    envname: string;
    ResourceProps: ResourceProps;
}
interface PipeplineProps extends StackProps {
    envname: string;
    owner: string;
    repo: string;
    branch: string;
    connectionArn: string;
    stageConfig: PipelineStageProps;
    manualApprovals: boolean;
}
export declare class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, props: PipeplineProps);
}
export {};
