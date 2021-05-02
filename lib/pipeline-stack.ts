import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import { Construct, Stack, StackProps, StageProps, Stage, } from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";
import { ResourceProps, WAFStack } from "./waf-stack"

interface PipelineStageProps extends StageProps {
    envname: string,
    ResourceProps: ResourceProps,
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

class PipelineStage extends Stage{
    constructor(scope: Construct, id: string, props: PipelineStageProps) {
    super(scope, id, props);

    new WAFStack(this, 'stack', props.ResourceProps);
    }
}

// The stack that defines the application pipeline
export class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, props: PipeplineProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    const pipeline = new CdkPipeline(this, props.envname + '-pipeline', {
        pipelineName: id,
        cloudAssemblyArtifact,
        sourceAction: new codepipeline_actions.BitBucketSourceAction({
            actionName: 'BitBucket',
            output: sourceArtifact,
            owner: props.owner,
            repo: props.repo,
            branch: props.branch,
            connectionArn: props.connectionArn,
            codeBuildCloneOutput: true
        }),
        synthAction: SimpleSynthAction.standardNpmSynth({
            sourceArtifact,
            cloudAssemblyArtifact,
            synthCommand: 'npx cdk synth ' + id
        }), 
    });
    pipeline.addApplicationStage(new PipelineStage(this, id, props.stageConfig), {manualApprovals: props.manualApprovals})
    }
}