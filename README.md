## NOTE: AWS profile
All cdk and npm commands have to be run in context of AWS account with actual deploy rights, e.g. using "sandbox" profile.
The name of AWS profile comes from `~/.aws/credentials`

e.g.
```
AWS_PROFILE=sandbox cdk_or_npm_command
```

Default profile may be omitted.

## Useful `npm` and `cdk` commands

 * `npm run local:dev`   local developer mode: build (once) and run API with serverless offline and UI with `ng serve`
 * `npm run cdk:dev`     cloud developer mode: build (once) UI and deploy to AWS with CDK in watch mode (lambda changes are hotswapped)
 * `npm run cdk:deploy`  prod deploy: build API and UI, then deploy to AWS
 * `cdk deploy`          deploy this CloudFormation stack to your AWS account/region
 * `cdk diff`            compare deployed stack with current state
 * `cdk synth`           emits the synthesized CloudFormation template (includes build of lambda code)
 * `cdk destroy`         delete CloudFormation stack and its resources (S3 buckets and DynamoDB tables have to be deleted manually)

## Hybrid development: local FE + cloud BE

1. Run CDK deploy in watch mode: 
   ```
   AWS_PROFILE=sandbox cdk deploy --watch
   ```
1. Resolve API endpoint URL from stack outputs, e.g:
   ```
   Outputs:
   cdk-workshop-miso.CdkWorkshopAPImisoEndpoint8CAA0E69 = https://g58le5ihq9.execute-api.eu-central-1.amazonaws.com/prod/
   cdk-workshop-miso.WebBucketUrl = http://cdk-workshop-miso-webbucket12880f5b-1l99rajh5g21q.s3-website.eu-central-1.amazonaws.com
   cdk-workshop-miso.WebDistributionDomainName = d297khtg91aw7a.cloudfront.net
   ```
   API endpoint URL is: https://g58le5ihq9.execute-api.eu-central-1.amazonaws.com/prod/
   <br/><br/>
1. Replace content of the `x-api-base` meta-tag in the ***index.html*** file with the API endpoint URL, e.g.:
   ```html
   <meta name="x-api-base" content="http://localhost:4000/local/">
   ```
   as:
   ```html
   <meta name="x-api-base" content="https://g58le5ihq9.execute-api.eu-central-1.amazonaws.com/prod/">
   ```

   _Note_: API url doesn't change between multiple cdk deploys in the same AWS account/region, so this needs to be done only once (!) TODO: AUTOMATIZE
   <br/><br/>
1. Run FE in watch mode (in other bash tab/window):
   ```
   npm run web:serve
   ```
1. Now changes in the Lambda code are watched and hotswapped into cloud deployment while changes in Angular code are rebuilt and browser is reloaded locally. 
