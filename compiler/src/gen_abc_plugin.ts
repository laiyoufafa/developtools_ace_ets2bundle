/*
 * Copyright (c) 2021 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from 'fs';
import * as path from 'path';
import cluster from 'cluster';
import process from 'process';
import Compiler from 'webpack/lib/Compiler';
import { logger } from './compile_info';
import {
  toUnixPath,
  toHashData,
  compareNodeVersion,
  removeDir
} from './utils';
import { NODE_MODULES } from './pre_define';

const firstFileEXT: string = '_.js';
const genAbcScript = 'gen_abc.js';
let output: string;
let isWin: boolean = false;
let isMac: boolean = false;
let isDebug: boolean = false;
let arkDir: string;
let nodeJs: string;

interface File {
  path: string,
  size: number,
  cacheOutputPath: string
}
const intermediateJsBundle: Array<File> = [];
let fileterIntermediateJsBundle: Array<File> = [];
let hashJsonObject = {};
let buildPathInfo = '';

const red: string = '\u001b[31m';
const reset: string = '\u001b[39m';
const hashFile = 'gen_hash.json';
const ARK = '/ark/';

export class GenAbcPlugin {
  constructor(output_, arkDir_, nodeJs_, isDebug_) {
    output = output_;
    arkDir = arkDir_;
    nodeJs = nodeJs_;
    isDebug = isDebug_;
  }
  apply(compiler: Compiler) {
    if (fs.existsSync(path.resolve(arkDir, 'build-win'))) {
      isWin = true;
    } else {
      if (fs.existsSync(path.resolve(arkDir, 'build-mac'))) {
        isMac = true;
      } else {
        if (!fs.existsSync(path.resolve(arkDir, 'build'))) {
          logger.error(red, 'ETS:ERROR find build fail', reset);
          return;
        }
      }
    }

    if (!checkNodeModules()) {
      return;
    }

    removeDir(output);

    compiler.hooks.emit.tap('GenAbcPlugin', (compilation) => {
      buildPathInfo = output;
      Object.keys(compilation.assets).forEach(key => {
        // choose *.js
        if (output && path.extname(key) === '.js') {
          const newContent: string = compilation.assets[key].source();
          const keyPath: string = key.replace(/\.js$/, firstFileEXT);
          writeFileSync(newContent, path.resolve(output, keyPath), key);
        }
      });
    });

    compiler.hooks.afterEmit.tap('GenAbcPluginMultiThread', () => {
      buildPathInfo = output;
      invokeWorkersToGenAbc();
    });
  }
}

function writeFileSync(inputString: string, output: string, jsBundleFile: string): void {
  let parent: string = path.join(output, '..');
  if (!(fs.existsSync(parent) && fs.statSync(parent).isDirectory())) {
    mkDir(parent);
  }

  let buildParentPath: string = path.join(buildPathInfo, '..');
  let sufStr: string = output.replace(buildParentPath, '');
  let cacheOutputPath: string = "";
  if (process.env.cachePath) {
    cacheOutputPath = path.join(process.env.cachePath, "temporary", sufStr);
  } else {
    cacheOutputPath = output;
  }
  parent = path.join(cacheOutputPath, '..');
  if (!(fs.existsSync(parent) && fs.statSync(parent).isDirectory())) {
    mkDir(parent);
  }
  fs.writeFileSync(cacheOutputPath, inputString);
  if (fs.existsSync(cacheOutputPath)) {
    const fileSize: any = fs.statSync(cacheOutputPath).size;
    intermediateJsBundle.push({path: output, size: fileSize, cacheOutputPath: cacheOutputPath});
  } else {
    logger.error(red, `ETS:ERROR Failed to convert file ${jsBundleFile} to bin. ${output} is lost`, reset);
  }
}

function mkDir(path_: string): void {
  const parent: string = path.join(path_, '..');
  if (!(fs.existsSync(parent) && !fs.statSync(parent).isFile())) {
    mkDir(parent);
  }
  fs.mkdirSync(path_);
}

function getSmallestSizeGroup(groupSize: Map<number, number>) {
  const groupSizeArray = Array.from(groupSize);
  groupSizeArray.sort(function(g1, g2) {
    return g1[1] - g2[1]; // sort by size
  });
  return groupSizeArray[0][0];
}

function splitJsBundlesBySize(bundleArray: Array<File>, groupNumber: number) {
  const result = [];
  if (bundleArray.length < groupNumber) {
    result.push(bundleArray);
    return result;
  }

  bundleArray.sort(function(f1: File, f2: File) {
    return f2.size - f1.size;
  });
  const groupFileSize = new Map();
  for (let i = 0; i < groupNumber; ++i) {
    result.push([]);
    groupFileSize.set(i, 0);
  }

  let index = 0;
  while (index < bundleArray.length) {
    const smallestGroup = getSmallestSizeGroup(groupFileSize);
    result[smallestGroup].push(bundleArray[index]);
    const sizeUpdate = groupFileSize.get(smallestGroup) + bundleArray[index].size;
    groupFileSize.set(smallestGroup, sizeUpdate);
    index++;
  }
  return result;
}

function invokeWorkersToGenAbc() {
  let param: string = '';
  if (isDebug) {
    param += ' --debug';
  }

  let js2abc: string = path.join(arkDir, 'build', 'src', 'index.js');
  if (isWin) {
    js2abc = path.join(arkDir, 'build-win', 'src', 'index.js');
  } else if (isMac) {
    js2abc = path.join(arkDir, 'build-mac', 'src', 'index.js');
  }

  filterIntermediateJsBundleByHashJson(buildPathInfo, intermediateJsBundle);
  const maxWorkerNumber = 3;
  const splitedBundles = splitJsBundlesBySize(fileterIntermediateJsBundle, maxWorkerNumber);
  const workerNumber = maxWorkerNumber < splitedBundles.length ? maxWorkerNumber : splitedBundles.length;
  const cmdPrefix: string = `${nodeJs} --expose-gc "${js2abc}" ${param} `;

  const clusterNewApiVersion = 16;
  const useNewApi = compareNodeVersion(clusterNewApiVersion);

  if (useNewApi && cluster.isPrimary || !useNewApi && cluster.isMaster) {
    if (useNewApi) {
      cluster.setupPrimary({
        exec: path.resolve(__dirname, genAbcScript)
      });
    } else {
      cluster.setupMaster({
        exec: path.resolve(__dirname, genAbcScript)
      });
    }

    for (let i = 0; i < workerNumber; ++i) {
      const workerData = {
        'inputs': JSON.stringify(splitedBundles[i]),
        'cmd': cmdPrefix
      };
      cluster.fork(workerData);
    }

    cluster.on('exit', (worker, code, signal) => {
      logger.debug(`worker ${worker.process.pid} finished`);
    });

    process.on('exit', (code) => {
      writeHashJson();
    });
  }
}

function filterIntermediateJsBundleByHashJson(buildPath: string, inputPaths: File[]) {
  for (let i = 0; i < inputPaths.length; ++i) {
    fileterIntermediateJsBundle.push(inputPaths[i]);
  }
  const hashFilePath = genHashJsonPath(buildPath);
  if (hashFilePath.length === 0) {
    return;
  }
  const updateJsonObject = {};
  let jsonObject = {};
  let jsonFile = '';
  if (fs.existsSync(hashFilePath)) {
    jsonFile = fs.readFileSync(hashFilePath).toString();
    jsonObject = JSON.parse(jsonFile);
    fileterIntermediateJsBundle = [];
    for (let i = 0; i < inputPaths.length; ++i) {
      const input = inputPaths[i].path;
      const abcPath = input.replace(/_.js$/, '.abc');
      const cacheOutputPath: string = inputPaths[i].cacheOutputPath;
      const cacheAbcFilePath: string = cacheOutputPath.replace(/\_.js$/, '.abc');
      if (!fs.existsSync(cacheOutputPath)) {
        logger.error(red, `ETS:ERROR ${cacheOutputPath} is lost`, reset);
        continue;
      }
      if (fs.existsSync(cacheAbcFilePath)) {
        const hashInputContentData: any = toHashData(cacheOutputPath);
        const hashAbcContentData: any = toHashData(cacheAbcFilePath);
        if (jsonObject[cacheOutputPath] === hashInputContentData && jsonObject[cacheAbcFilePath] === hashAbcContentData) {
          updateJsonObject[cacheOutputPath] = hashInputContentData;
          updateJsonObject[cacheAbcFilePath] = hashAbcContentData;
          let parent: string = path.join(abcPath, '..');
          if (!(fs.existsSync(parent) && fs.statSync(parent).isDirectory())) {
            mkDir(parent);
          }
          fs.copyFileSync(cacheAbcFilePath, abcPath);
        } else {
          fileterIntermediateJsBundle.push(inputPaths[i]);
        }
      } else {
        fileterIntermediateJsBundle.push(inputPaths[i]);
      }
    }
  }

  hashJsonObject = updateJsonObject;
}

function writeHashJson() {
  for (let i = 0; i < fileterIntermediateJsBundle.length; ++i) {
    const input = fileterIntermediateJsBundle[i].path;
    const abcPath = input.replace(/_.js$/, '.abc');
    const cacheOutputPath: string = fileterIntermediateJsBundle[i].cacheOutputPath;
    const cacheAbcFilePath: string = cacheOutputPath.replace(/\_.js$/, '.abc');
    if (!fs.existsSync(cacheOutputPath) || !fs.existsSync(cacheAbcFilePath)) {
      logger.error(red, `ETS:ERROR ${cacheOutputPath} is lost`, reset);
      continue;
    }
    const hashInputContentData: any = toHashData(cacheOutputPath);
    const hashAbcContentData: any = toHashData(cacheAbcFilePath);
    hashJsonObject[cacheOutputPath] = hashInputContentData;
    hashJsonObject[cacheAbcFilePath] = hashAbcContentData;
  }
  for (let i = 0; i < intermediateJsBundle.length; ++i) {
    const abcFile: string = intermediateJsBundle[i].path.replace(/\_.js$/, ".abc");
    const cacheAbcFilePath: string = intermediateJsBundle[i].cacheOutputPath.replace(/\_.js$/, ".abc");
    if (!fs.existsSync(cacheAbcFilePath)) {
      logger.error(red, `ETS:ERROR ${cacheAbcFilePath} is lost`, reset);
      break;
    }
    let parent: string = path.join(abcFile, '..');
    if (!(fs.existsSync(parent) && fs.statSync(parent).isDirectory())) {
      mkDir(parent);
    }
    fs.copyFileSync(cacheAbcFilePath, abcFile);
  }
  const hashFilePath = genHashJsonPath(buildPathInfo);
  if (hashFilePath.length === 0) {
    return;
  }
  fs.writeFileSync(hashFilePath, JSON.stringify(hashJsonObject));
}

function genHashJsonPath(buildPath: string) {
  buildPath = toUnixPath(buildPath);
  if (process.env.cachePath) {
    if (!fs.existsSync(process.env.cachePath) || !fs.statSync(process.env.cachePath).isDirectory()) {
      logger.error(red, `ETS:ERROR hash path does not exist`, reset);
      return '';
    }
    return path.join(process.env.cachePath, hashFile);
  } else if (buildPath.indexOf(ARK) >= 0) {
    const dataTmps = buildPath.split(ARK);
    const hashPath = path.join(dataTmps[0], ARK);
    if (!fs.existsSync(hashPath) || !fs.statSync(hashPath).isDirectory()) {
      logger.error(red, `ETS:ERROR hash path does not exist`, reset);
      return '';
    }
    return path.join(hashPath, hashFile);
  } else {
    logger.debug(red, `ETS:ERROR not cache exist`, reset);
    return '';
  }
}

function checkNodeModules() {
  let arkEntryPath: string = path.join(arkDir, 'build');
  if (isWin) {
    arkEntryPath = path.join(arkDir, 'build-win');
  } else if (isMac) {
    arkEntryPath = path.join(arkDir, 'build-mac');
  }
  let nodeModulesPath: string = path.join(arkEntryPath, NODE_MODULES);
  if (!(fs.existsSync(nodeModulesPath) && fs.statSync(nodeModulesPath).isDirectory())) {
    logger.error(red, `ERROR: node_modules for ark compiler not found.
      Please make sure switch to non-root user before runing "npm install" for safity requirements and try re-run "npm install" under ${arkEntryPath}`, reset);
    return false;
  }

  return true;
}
