import { DynamoDB } from 'aws-sdk';
import { CreateTableInput } from 'aws-sdk/clients/dynamodb';

const LOG_PREFIX = '[dynamoDB]';

/**
 * Ensure tables - create table in dynamo if they do not exists
 * @param {DynamoDB} dynamoDB
 * @param {DynamoDB.CreateTableInput} requiredSchemas
 * @returns {Promise<void>}
 */
export function ensureTables(dynamoDB: DynamoDB, ...requiredSchemas: CreateTableInput[]): Promise<void> {
  const logger = console.log.bind(console);
  logger(`${LOG_PREFIX} DynamoDB ensure tables ...`);
  return dynamoDB.listTables({}).promise()
    .catch(err => console.error(err))
    .then(result => (result && result.TableNames) || [])
    .then(tableNames => requiredSchemas.filter(s => {
      logger(`${LOG_PREFIX} ... DynamoDB ensure table '${s.TableName}'`);
      return tableNames.indexOf(s.TableName) < 0;
    }))
    .then(missingSchemas => Promise.all(
      missingSchemas
        .map(schema => dynamoDB.createTable(schema)
          .promise()
          .catch(err => {
            if (err.code === 'ValidationException' && err.message === 'No provisioned throughput specified for the table') {
              // ProvisionedThroughput is defined only when BillingMode is PROVISIONED, otherwise it may be undefined
              // so maybe better "fix" is to set proper billingMode than guessing ProvisionedThroughput,
              // however, default values for both ReadCapacityUnits and WriteCapacityUnits is 5
              logger(`${LOG_PREFIX} ... auto fixing ${err.code}: ${err.message}`);
              return dynamoDB.createTable({ ...schema, ProvisionedThroughput: {
                  ReadCapacityUnits: 1,
                  WriteCapacityUnits: 1,
                }}).promise();
            }
            throw err;
          })
          .then(result => {
            logger(`${LOG_PREFIX} ... DynamoDB table created '${schema.TableName}'`);
            return result;
          })
          .catch(err => console.error(err))
        )
    ))
    .then(() => logger(`${LOG_PREFIX} ... DynamoDB all tables ensured`));
}
