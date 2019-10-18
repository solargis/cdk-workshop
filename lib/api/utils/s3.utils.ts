import * as S3 from 'aws-sdk/clients/s3';
import { createWriteStream } from 'fs';

import { Image, SavedImage, SavedPin } from '../../shared/types/pin.types';

const imageBucket = process.env.IMAGE_BUCKET as string;

const region = process.env.AWS_REGION;
const localEndpoint = process.env.S3_ENDPOINT as any;

const s3 = new S3(localEndpoint && {
  accessKeyId: 'S3RVER',
  secretAccessKey: 'S3RVER',
  region: 'local',
  endpoint: localEndpoint
});

export async function saveImageToS3(s3key: string, unsavedImage: Image & { dataBuffer?: Buffer }): Promise<SavedImage> {
  const { dataUrl, dataBuffer, ...imageFields } = unsavedImage;
  const isPublic = s3key.startsWith('thumbnail');

  console.log(`Saving image to S3: ${s3key}`);

  await s3.putObject({
    Bucket: imageBucket,
    Key: s3key,
    ContentType: unsavedImage.type,
    Body: dataUrl
      ? dataUrlToBuffer(dataUrl as string, unsavedImage.type)
      : dataBuffer,
    ACL: isPublic ? 'public-read' : undefined
  }).promise();

  const url = isPublic ? getPublicUrl(s3key) : undefined;
  return { ...imageFields, s3key, url };
}

export async function deleteImageFromS3(pin: SavedPin) {
  if (pin.image) {
    console.log('Deleting pin image from S3: ', pin.image.s3key);
    await s3.deleteObjects({
      Bucket: imageBucket,
      Delete: { Objects: [{ Key: pin.image.s3key }] }
    }).promise();
  }
  if (pin.thumbnail) {
    console.log('Deleting pin thumbnail from S3: ', pin.thumbnail.s3key);
    await s3.deleteObjects({
      Bucket: imageBucket,
      Delete: { Objects: [{ Key: pin.thumbnail.s3key }] }
    }).promise();
  }
}

export function resolveSignedUrl(pin: SavedPin): SavedPin {
  const { image, ...pinFields } = pin;
  if (image) {
    const url = getDownloadUrl(image.s3key, image.name);
    return { ...pinFields, image: { ...image, url }};
  }
  return pin;
}

export function copyFromS3(Bucket: string, Key: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tempFileStream = createWriteStream(filePath);
    tempFileStream.on('close', () => {
      console.log('Saved to:', filePath);
      resolve();
    });
    tempFileStream.on('error', err => {
      console.log('Saving failed:', err);
      reject();
    });
    s3.getObject({ Bucket, Key }).createReadStream().pipe(tempFileStream);
  });
}

function dataUrlToBuffer(dataUrl: string, type: string): Buffer {
  const prefix = `data:${type};base64,`;
  const base64 = dataUrl.startsWith(prefix)
    ? dataUrl.substring(prefix.length)
    : dataUrl;
  return Buffer.from(base64, 'base64');
}

function getPublicUrl(s3key: string): string {
  return localEndpoint
    ? `${localEndpoint}/${imageBucket}/${s3key}`
    : `https://${imageBucket}.s3-${region}.amazonaws.com/${s3key}`;
}

function getDownloadUrl(s3key: string, name: string) {
  return localEndpoint
    ? `${localEndpoint}/${imageBucket}/${s3key}`
    : s3.getSignedUrl('getObject', {
      Bucket: imageBucket,
      Key: s3key,
      ResponseContentDisposition: `attachment; filename="${name}"`
    })
}
