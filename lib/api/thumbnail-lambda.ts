import { Callback, Context, S3CreateEvent } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import * as del from 'del';
import { join, parse } from 'path';
import * as sharp from 'sharp';
import { v4 } from 'uuid';

import { copyFromS3, saveImageToS3 } from './utils/s3.utils';
import { SavedImage } from '../shared/types/pin.types';

const pinTable = process.env.PIN_TABLE as string;
const tempDir = '/tmp';

const dynamo = new DynamoDB.DocumentClient({
  endpoint: process.env.DYNAMODB_ENDPOINT
});

export function handler(event: S3CreateEvent, context: Context, callback: Callback) {

  Promise.all(
    event.Records.map(async record => {
      const { bucket: { name: Bucket }, object: { key, size } } = record.s3;
      const Key = decodeURIComponent(key);

      console.log('New pin image in S3 to resize:', { Bucket, Key, size });

      const { name, ext } = parse(Key);
      const pointUrl = name.split('_')[0];

      const tempImage = join(tempDir, v4()) + ext;
      const s3key = `thumbnail/${name}.png`;

      try {
        console.log(`Copy ${Key} to ${tempImage}`);
        await copyFromS3(Bucket, Key, tempImage);

        // resize with Jimp and copy to thumbnail S3
        console.log('Resizing image...');

        const dataBuffer = await sharp(tempImage, { failOnError: false })
          .resize(60, 60)
          .png()
          .toBuffer();

        const unsavedThumbnail = {
          dataBuffer,
          lastModified: Date.now(),
          type: 'image/png',
          name: `${name}.thumbnail.png`,
          size: dataBuffer.byteLength
        };

        const thumbnail = await saveImageToS3(s3key, unsavedThumbnail);

        await del(tempImage, { force: true });
        console.log('Deleted temp image:', tempImage);

        await updatePinThumbnail(pointUrl, thumbnail);
        console.log('Pin thumbnail updated', thumbnail);

      } catch (err) {
        console.error('Error resizing image', Key, err);
        await updatePinThumbnail(pointUrl, { error: err } as any);
        throw err;
      }
    })
  ).then(
    () => callback && callback(null, 'done'),
    err => callback && callback(err)
  );
}

async function updatePinThumbnail(pointUrl: string, thumbnail: SavedImage) {
  console.log('Updating thumbnail image:', pointUrl, thumbnail);
  await dynamo.update({
    TableName: pinTable,
    Key: { pointUrl },
    UpdateExpression: 'SET #thumbnail = :thumbnail',
    ExpressionAttributeNames: { '#thumbnail': 'thumbnail' },
    ExpressionAttributeValues: { ':thumbnail': thumbnail }
  }).promise();

}
