import IAM from 'aws-sdk/clients/iam';

export async function getAwsUserName(): Promise<string> {
  const { User } = await new IAM().getUser().promise();
  return User.UserName;
}

export async function getAwsStackName(alreadyFetchedUserName?: string): Promise<string> {
  const userName = alreadyFetchedUserName ?? await getAwsUserName();
  return `cdk-workshop-${userName}`;
}
