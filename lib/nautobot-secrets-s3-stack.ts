import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as dotenv from 'dotenv';


export class NautobotSecretsS3Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Path to .env file
    const objectKey = '.env';
    const envFilePath = path.join(__dirname, '..', 'lib/secrets/', objectKey);

    // Ensure .env file exists
    if (fs.existsSync(envFilePath)) {
      // Load and parse .env file
      const envConfig = dotenv.parse(fs.readFileSync(envFilePath));

      // Iterate over each environment variable
      for (const key in envConfig) {
        // Get the value
        const value = envConfig[key];

        // Check that the value exists and isn't undefined
        if (value && value !== 'undefined') {
          // Create a new secret in Secrets Manager for this environment variable
          new secretsmanager.Secret(this, key, {
            secretName: key,
            generateSecretString: {
              secretStringTemplate: JSON.stringify({ key: value }),
              generateStringKey: 'password',
            },
          });
        }
      }
    } else {
      console.log('.env file does not exist');
    }
  }
}
