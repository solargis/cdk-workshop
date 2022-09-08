import { path as rootPath } from 'app-root-path';
import { analyzeMetafile, analyzeMetafileSync, build, Metafile } from 'esbuild';
import { readdirSync } from 'fs';
import { resolve } from 'path';

import { getLayerExternalModules } from './stack.utils';

const watch = !!process.argv.find(arg => arg === 'watch');
console.log('Watch mode: ', watch);

let buildCount = 0;

async function buildApi(apiDir: string): Promise<string> {

  const lambdaFiles = readdirSync(resolve(rootPath, apiDir))
    .filter(filename => filename.endsWith('-lambda.ts'))
    .map(filename => resolve(rootPath, 'lib/api', filename));

  const { metafile } = await build({
    entryPoints: lambdaFiles,
    outdir: resolve(rootPath, 'dist/api'),
    bundle: true,
    platform: 'node',
    target: 'node16',
    external: [
      'aws-sdk',
      ...getLayerExternalModules('layers/api-deps'),
      ...getLayerExternalModules('layers/sharp')
    ],
    metafile: true,
    watch: watch ? {
      onRebuild(error, result) {
        if (error) {
          console.error('Watch build failed:', error);
        } else {
          const out = analyzeMetafileSync(result?.metafile as Metafile);
          console.log(`Watch build succeeded (${++buildCount}):`, out);
        }
      }
    } : false
  });
  return await analyzeMetafile(metafile);
};

buildApi('lib/api').then(
  out => console.log(`Build succeeded (${++buildCount}):`, out),
  error => console.error('Build failed:', error)
);
