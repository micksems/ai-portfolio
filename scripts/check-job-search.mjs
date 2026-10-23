import { readFileSync } from 'node:fs';
import { validatePipeline } from '../src/lib/job-search-model.mjs';
const text = readFileSync(new URL('../src/data/jobSearchData.js',import.meta.url),'utf8');
const data = JSON.parse(text.replace(/^export const jobSearchData = /,'').replace(/;\s*$/,''));
const errors = validatePipeline(data);
if (errors.length) {console.error(errors.join('\n'));process.exit(1);}
console.log('Pipeline consistency checks passed');
