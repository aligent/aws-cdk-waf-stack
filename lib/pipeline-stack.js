"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineStack = void 0;
const codepipeline = require("@aws-cdk/aws-codepipeline");
const codepipeline_actions = require("@aws-cdk/aws-codepipeline-actions");
const core_1 = require("@aws-cdk/core");
const pipelines_1 = require("@aws-cdk/pipelines");
const waf_stack_1 = require("./waf-stack");
class PipelineStage extends core_1.Stage {
    constructor(scope, id, props) {
        super(scope, id, props);
        new waf_stack_1.WAFStack(this, 'stack', props.ResourceProps);
    }
}
// The stack that defines the application pipeline
class PipelineStack extends core_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();
        const pipeline = new pipelines_1.CdkPipeline(this, props.envname + '-pipeline', {
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
            synthAction: pipelines_1.SimpleSynthAction.standardNpmSynth({
                sourceArtifact,
                cloudAssemblyArtifact,
                synthCommand: 'npx cdk synth ' + id
            }),
        });
        pipeline.addApplicationStage(new PipelineStage(this, id, props.stageConfig), { manualApprovals: props.manualApprovals });
    }
}
exports.PipelineStack = PipelineStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZWxpbmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwaXBlbGluZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBMEQ7QUFDMUQsMEVBQTBFO0FBQzFFLHdDQUFpRjtBQUNqRixrREFBb0U7QUFDcEUsMkNBQXFEO0FBaUJyRCxNQUFNLGFBQWMsU0FBUSxZQUFLO0lBQzdCLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBeUI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxvQkFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ2pELENBQUM7Q0FDSjtBQUVELGtEQUFrRDtBQUNsRCxNQUFhLGFBQWMsU0FBUSxZQUFLO0lBQ3BDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBcUI7UUFDL0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDbkQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUUxRCxNQUFNLFFBQVEsR0FBRyxJQUFJLHVCQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxPQUFPLEdBQUcsV0FBVyxFQUFFO1lBQ2hFLFlBQVksRUFBRSxFQUFFO1lBQ2hCLHFCQUFxQjtZQUNyQixZQUFZLEVBQUUsSUFBSSxvQkFBb0IsQ0FBQyxxQkFBcUIsQ0FBQztnQkFDekQsVUFBVSxFQUFFLFdBQVc7Z0JBQ3ZCLE1BQU0sRUFBRSxjQUFjO2dCQUN0QixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7Z0JBQ2xCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtnQkFDaEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO2dCQUNwQixhQUFhLEVBQUUsS0FBSyxDQUFDLGFBQWE7Z0JBQ2xDLG9CQUFvQixFQUFFLElBQUk7YUFDN0IsQ0FBQztZQUNGLFdBQVcsRUFBRSw2QkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDNUMsY0FBYztnQkFDZCxxQkFBcUI7Z0JBQ3JCLFlBQVksRUFBRSxnQkFBZ0IsR0FBRyxFQUFFO2FBQ3RDLENBQUM7U0FDTCxDQUFDLENBQUM7UUFDSCxRQUFRLENBQUMsbUJBQW1CLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLGVBQWUsRUFBQyxDQUFDLENBQUE7SUFDdEgsQ0FBQztDQUNKO0FBM0JELHNDQTJCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvZGVwaXBlbGluZSBmcm9tICdAYXdzLWNkay9hd3MtY29kZXBpcGVsaW5lJztcbmltcG9ydCAqIGFzIGNvZGVwaXBlbGluZV9hY3Rpb25zIGZyb20gJ0Bhd3MtY2RrL2F3cy1jb2RlcGlwZWxpbmUtYWN0aW9ucyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QsIFN0YWNrLCBTdGFja1Byb3BzLCBTdGFnZVByb3BzLCBTdGFnZSwgfSBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCB7IENka1BpcGVsaW5lLCBTaW1wbGVTeW50aEFjdGlvbiB9IGZyb20gXCJAYXdzLWNkay9waXBlbGluZXNcIjtcbmltcG9ydCB7IFJlc291cmNlUHJvcHMsIFdBRlN0YWNrIH0gZnJvbSBcIi4vd2FmLXN0YWNrXCJcblxuaW50ZXJmYWNlIFBpcGVsaW5lU3RhZ2VQcm9wcyBleHRlbmRzIFN0YWdlUHJvcHMge1xuICAgIGVudm5hbWU6IHN0cmluZyxcbiAgICBSZXNvdXJjZVByb3BzOiBSZXNvdXJjZVByb3BzLFxufVxuXG5pbnRlcmZhY2UgUGlwZXBsaW5lUHJvcHMgZXh0ZW5kcyBTdGFja1Byb3BzIHtcbiAgICBlbnZuYW1lOiBzdHJpbmc7XG4gICAgb3duZXI6IHN0cmluZztcbiAgICByZXBvOiBzdHJpbmc7XG4gICAgYnJhbmNoOiBzdHJpbmc7XG4gICAgY29ubmVjdGlvbkFybjogc3RyaW5nO1xuICAgIHN0YWdlQ29uZmlnOiBQaXBlbGluZVN0YWdlUHJvcHM7XG4gICAgbWFudWFsQXBwcm92YWxzOiBib29sZWFuO1xufVxuXG5jbGFzcyBQaXBlbGluZVN0YWdlIGV4dGVuZHMgU3RhZ2V7XG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFBpcGVsaW5lU3RhZ2VQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgbmV3IFdBRlN0YWNrKHRoaXMsICdzdGFjaycsIHByb3BzLlJlc291cmNlUHJvcHMpO1xuICAgIH1cbn1cblxuLy8gVGhlIHN0YWNrIHRoYXQgZGVmaW5lcyB0aGUgYXBwbGljYXRpb24gcGlwZWxpbmVcbmV4cG9ydCBjbGFzcyBQaXBlbGluZVN0YWNrIGV4dGVuZHMgU3RhY2sge1xuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBQaXBlcGxpbmVQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3Qgc291cmNlQXJ0aWZhY3QgPSBuZXcgY29kZXBpcGVsaW5lLkFydGlmYWN0KCk7XG4gICAgY29uc3QgY2xvdWRBc3NlbWJseUFydGlmYWN0ID0gbmV3IGNvZGVwaXBlbGluZS5BcnRpZmFjdCgpO1xuXG4gICAgY29uc3QgcGlwZWxpbmUgPSBuZXcgQ2RrUGlwZWxpbmUodGhpcywgcHJvcHMuZW52bmFtZSArICctcGlwZWxpbmUnLCB7XG4gICAgICAgIHBpcGVsaW5lTmFtZTogaWQsXG4gICAgICAgIGNsb3VkQXNzZW1ibHlBcnRpZmFjdCxcbiAgICAgICAgc291cmNlQWN0aW9uOiBuZXcgY29kZXBpcGVsaW5lX2FjdGlvbnMuQml0QnVja2V0U291cmNlQWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvbk5hbWU6ICdCaXRCdWNrZXQnLFxuICAgICAgICAgICAgb3V0cHV0OiBzb3VyY2VBcnRpZmFjdCxcbiAgICAgICAgICAgIG93bmVyOiBwcm9wcy5vd25lcixcbiAgICAgICAgICAgIHJlcG86IHByb3BzLnJlcG8sXG4gICAgICAgICAgICBicmFuY2g6IHByb3BzLmJyYW5jaCxcbiAgICAgICAgICAgIGNvbm5lY3Rpb25Bcm46IHByb3BzLmNvbm5lY3Rpb25Bcm4sXG4gICAgICAgICAgICBjb2RlQnVpbGRDbG9uZU91dHB1dDogdHJ1ZVxuICAgICAgICB9KSxcbiAgICAgICAgc3ludGhBY3Rpb246IFNpbXBsZVN5bnRoQWN0aW9uLnN0YW5kYXJkTnBtU3ludGgoe1xuICAgICAgICAgICAgc291cmNlQXJ0aWZhY3QsXG4gICAgICAgICAgICBjbG91ZEFzc2VtYmx5QXJ0aWZhY3QsXG4gICAgICAgICAgICBzeW50aENvbW1hbmQ6ICducHggY2RrIHN5bnRoICcgKyBpZFxuICAgICAgICB9KSwgXG4gICAgfSk7XG4gICAgcGlwZWxpbmUuYWRkQXBwbGljYXRpb25TdGFnZShuZXcgUGlwZWxpbmVTdGFnZSh0aGlzLCBpZCwgcHJvcHMuc3RhZ2VDb25maWcpLCB7bWFudWFsQXBwcm92YWxzOiBwcm9wcy5tYW51YWxBcHByb3ZhbHN9KVxuICAgIH1cbn0iXX0=