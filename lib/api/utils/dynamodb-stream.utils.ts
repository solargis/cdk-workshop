import { DynamoDBRecord, StreamRecord } from 'aws-lambda';
import { AttributeMap, Converter } from 'aws-sdk/clients/dynamodb';

export type BaseStreamRecord<K, T> = Omit<DynamoDBRecord, 'dynamodb'> & {
  dynamodb: Omit<StreamRecord, 'Keys' | 'OldImage' | 'NewImage'> & {
    Keys: K,
    OldImage?: T,
    NewImage?: T
  }
}

export type StreamRecordFilterFn<R extends BaseStreamRecord<any, any>> = (record: R) => boolean;

export function unmarshallStreamRecords<K, T, R  extends BaseStreamRecord<K, T>>(records: DynamoDBRecord[]): R[] {
  return records
    .map(record => record as BaseStreamRecord<K, T>)
    .map(({ dynamodb: { Keys, NewImage, OldImage, ...props }, ...other }) => ({
    ...other,
    dynamodb: {
      Keys: Converter.unmarshall(Keys as any as AttributeMap) as K,
      NewImage: NewImage ? (Converter.unmarshall(NewImage as any as AttributeMap) as T) : undefined,
      OldImage: OldImage ? (Converter.unmarshall(OldImage as any as AttributeMap) as T) : undefined,
      ...props
    }
  } as R));
}

