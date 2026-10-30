import {readFileSync, writeFileSync, renameSync, existsSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export const fileDigest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
export function writeJson(path, value) {
  mkdirSync(dirname(path), {recursive:true});
  const temp = path + '.' + randomUUID() + '.tmp';
  writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', {mode:0o600});
  renameSync(temp, path);
}
export function readManifest(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) :
    {version:2, startedAt:new Date().toISOString(), stages:{}};
}
export function outputProof(paths) {
  return paths.map(path => ({path:resolve(path), sha256:fileDigest(path)}));
}
export function outputsValid(stage) {
  return stage?.outputs?.length > 0 && stage.outputs.every(o =>
    existsSync(o.path) && fileDigest(o.path) === o.sha256);
}
export async function runStage(manifestPath, name, inputs, action, {reuse=true}={}) {
  const manifest = readManifest(manifestPath);
  const inputDigest = digest(inputs);
  const previous = manifest.stages[name];
  if (reuse && previous?.status === 'complete' && previous.inputDigest === inputDigest && outputsValid(previous))
    return {reused:true, ...previous};
  const started = performance.now();
  manifest.stages[name] = {status:'running', inputDigest, startedAt:new Date().toISOString()};
  writeJson(manifestPath, manifest);
  try {
    const paths = await action();
    const result = {...manifest.stages[name], status:'complete', finishedAt:new Date().toISOString(),
      durationMs:Math.round(performance.now()-started), outputs:outputProof(paths)};
    const current=readManifest(manifestPath);
    current.stages[name] = result;
    writeJson(manifestPath, current);
    return {reused:false, ...result};
  } catch (error) {
    const current=readManifest(manifestPath);
    current.stages[name] = {...current.stages[name], status:'failed',
      finishedAt:new Date().toISOString(), durationMs:Math.round(performance.now()-started), error:String(error.message)};
    writeJson(manifestPath, current);
    throw error;
  }
}

// Legacy manual interface remains available; unproved outputs never authorize reuse.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [file, action, stage, inputDigest, outputRef] = process.argv.slice(2);
  if (!file || !['start','finish','fail','status'].includes(action)) throw new Error('Use file start|finish|fail|status stage digest [output-file]');
  const m = readManifest(file);
  if (action === 'status') console.log(JSON.stringify(m));
  else {
    if (!stage || !inputDigest) throw new Error('Stage and input digest required');
    const prior = m.stages[stage];
    if (action === 'start' && prior?.status === 'complete' && prior.inputDigest === inputDigest && outputsValid(prior)) {
      console.log(JSON.stringify({reuse:true, stage, outputs:prior.outputs}));
    } else {
      if (action === 'start') m.stages[stage] = {status:'running', inputDigest, startedAt:new Date().toISOString()};
      else {
        if (prior?.status !== 'running' || prior.inputDigest !== inputDigest) throw new Error('No matching running stage');
        m.stages[stage] = {...prior, status:action === 'finish' ? 'complete' : 'failed', finishedAt:new Date().toISOString(),
          durationMs:Date.now()-Date.parse(prior.startedAt), outputs:outputRef && existsSync(outputRef) ? outputProof([outputRef]) : []};
      }
      writeJson(file,m); console.log(JSON.stringify(m.stages[stage]));
    }
  }
}
