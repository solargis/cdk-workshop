import * as S3 from 'aws-sdk/clients/s3';
import { createWriteStream } from 'fs';

import { Image, SavedImage, SavedPin } from '../../shared/types/pin.types';

const imageBucket = process.env.IMAGE_BUCKET as string;

const s3 = new S3();

export async function saveImageToS3(s3key: string, unsavedImage: Image & { dataBuffer?: Buffer }): Promise<SavedImage> {
  const { dataUrl, dataBuffer, ...imageFields } = unsavedImage;

  console.log(`Saving image to S3: ${s3key}`);

  await s3.putObject({
    Bucket: imageBucket,
    Key: s3key,
    ContentType: unsavedImage.type,
    Body: dataUrl
      ? dataUrlToBuffer(dataUrl as string, unsavedImage.type)
      : dataBuffer
  }).promise();

  return { ...imageFields, s3key };
}

export async function deleteImageFromS3(pin: SavedPin) {
  if (pin.image) {
    console.log('Deleting pin image from S3: ', pin.image.s3key);
    await s3.deleteObjects({
      Bucket: imageBucket,
      Delete: { Objects: [{ Key: pin.image.s3key }] }
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

function getDownloadUrl(s3key: string, name: string) {
  return s3.getSignedUrl('getObject', {
      Bucket: imageBucket,
      Key: s3key,
      ResponseContentDisposition: `attachment; filename="${name}"`
    });
}
