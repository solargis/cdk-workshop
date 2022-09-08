import { path as rootPath } from 'app-root-path';
import IAM from 'aws-sdk/clients/iam';
import { resolve } from 'path';
import readJsonSync from 'read-json-sync';

export async function getAwsUserName(): Promise<string> {
  const { User } = await new IAM().getUser().promise();
  return User.UserName;
}

export async function getAwsStackName(alreadyFetchedUserName?: string): Promise<string> {
  const userName = alreadyFetchedUserName ?? await getAwsUserName();
  return `cdk-workshop-${userName}`;
}

// TODO make util/extend LayerVersion
export function getLayerExternalModules(path: string): string[] {
  const layerPackage = readJsonSync(resolve(rootPath, `${path}/nodejs/package.json`), { encoding: 'utf8' });
  return Object.keys(layerPackage.dependencies);
}
