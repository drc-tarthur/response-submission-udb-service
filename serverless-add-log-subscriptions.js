const resources = serverless.service.provider.compiledCloudFormationTemplate.Resources;
const logSubscriptionDestinationArn = serverless.service.provider.logSubscriptionDestinationArn;
const logSubscriptionRoleArn = serverless.service.provider.logSubscriptionRoleArn;

Object.keys(resources)
  .filter(name => resources[name].Type === 'AWS::Logs::LogGroup')
  .forEach(logGroupName => resources[`${logGroupName}Subscription`] = {
      Type: "AWS::Logs::SubscriptionFilter",
      Properties: {
        DestinationArn: logSubscriptionDestinationArn,
        RoleArn: logSubscriptionRoleArn,
        FilterPattern: ".",
        LogGroupName: { "Ref": logGroupName }
      }
    }
  );