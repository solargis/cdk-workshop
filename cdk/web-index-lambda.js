const AWS = require('aws-sdk');
const response = require('cfn-response');

const s3 = new AWS.S3();

module.exports.handler = (event, context, callback) => {
  const { WebBucketName, ApiBaseUrl } = event.ResourceProperties;

  switch (event.RequestType) {
    case "Create":
    case "Update":
      patchIndexHtml().then(
        () => send('SUCCESS', { Message: `Resource ${event.RequestType} successful!` }),
        err => send('FAILED', { Error: '' + err })
      );
      break;
    case "Delete":
      send('SUCCESS', { Message: 'Resource Delete successful!' });
  }

  async function patchIndexHtml() {
    const data = await s3.getObject({ Bucket: WebBucketName, Key: 'index.html' }).promise();
    const html = data.Body && data.Body.toString('utf-8');

    if (!html) {
      throw Error('missing index.html');

    } else {
      const apiBaseUrlMeta = `<meta name="x-api-base" content="${ApiBaseUrl}">`;
      const replacedHtml = html.replace(/<meta name="x-api-base" content=".*">/, apiBaseUrlMeta);

      console.log('Updated index.html:', replacedHtml);

      return s3.putObject({
        Bucket: WebBucketName,
        Key: 'index.html',
        Body: replacedHtml,
        ContentType: 'text/html; charset=UTF-8'
      }).promise();
    }
  }

  function send(responseStatus, responseData) {
    console.log(`Sending response ${responseStatus}`);
    response.send(event, context, responseStatus, responseData);
  }
};
