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
  genTemporaryPath,
  genBuildPath,
  genAbcFileName,
  mkdirsSync,
  genSourceMapFileName,
  checkNodeModulesFile,
  compareNodeVersion,
  removeDir
} from './utils';
import { projectConfig } from '../main';
import {
  ESMODULE,
  JSBUNDLE,
  NODE_MODULES,
  ENTRY_TXT,
  EXTNAME_ETS,
  EXTNAME_JS,
  EXTNAME_TS,
  EXTNAME_MJS,
  EXTNAME_CJS,
  EXTNAME_D_TS,
  EXTNAME_ABC,
  SUCCESS,
  FAIL,
  TEMPRARY
} from './pre_define';

const firstFileEXT: string = '_.js';
const genAbcScript: string = 'gen_abc.js';
const genModuleAbcScript: string = 'gen_module_abc.js';
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
let intermediateJsBundle: Array<File> = [];
let fileterIntermediateJsBundle: Array<File> = [];
let moduleInfos: Array<ModuleInfo> = [];
let filterModuleInfos: Array<ModuleInfo> = [];
let commonJsModuleInfos: Array<ModuleInfo> = [];
let ESMModuleInfos: Array<ModuleInfo> = [];
let entryInfos: Map<string, EntryInfo> = new Map<string, EntryInfo>();
let hashJsonObject = {};
let moduleHashJsonObject = {};
let buildPathInfo: string = '';

const red: string = '\u001b[31m';
const reset: string = '\u001b[39m';
const hashFile: string = 'gen_hash.json';
const ARK: string = '/ark/';

class ModuleInfo {
  filePath: string;
  tempFilePath: string;
  buildFilePath: string;
  abcFilePath: string;
  isCommonJs: boolean;

  constructor(filePath: string, tempFilePath: string, buildFilePath: string, abcFilePath: string, isCommonJs: boolean) {
    this.filePath = filePath;
    this.tempFilePath = tempFilePath;
    this.buildFilePath = buildFilePath;
    this.abcFilePath = abcFilePath;
    this.isCommonJs = isCommonJs;
  }
}

class EntryInfo {
  npmInfo: string;
  abcFileName: string;
  buildPath: string;
  entry: string;

  constructor(npmInfo: string, abcFileName: string, buildPath: string, entry: string) {
    this.npmInfo = npmInfo;
    this.abcFileName = abcFileName;
    this.buildPath = buildPath;
    this.entry = entry;
  }
}

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
          process.exitCode = FAIL;
          return;
        }
      }
    }

    if (!checkNodeModules()) {
      process.exitCode = FAIL;
      return;
    }

    compiler.hooks.compilation.tap('GenAbcPlugin', (compilation) => {
      if (projectConfig.compileMode === JSBUNDLE || projectConfig.compileMode === undefined) {
        return;
      }
      buildPathInfo = output;
      compilation.hooks.finishModules.tap('finishModules', handleFinishModules.bind(this));
    });

    compiler.hooks.compilation.tap('GenAbcPlugin', (compilation) => {
      compilation.hooks.processAssets.tap('processAssets', (assets) => {
        if (projectConfig.compileMode === JSBUNDLE || projectConfig.compileMode === undefined) {
          return;
        }
        Object.keys(compilation.assets).forEach(key => {
          if (path.extname(key) === EXTNAME_JS) {
            delete assets[key];
          }
        });
      });
    });

    compiler.hooks.emit.tap('GenAbcPlugin', (compilation) => {
      if (projectConfig.compileMode === ESMODULE) {
        return;
      }
      removeDir(output);
      Object.keys(compilation.assets).forEach(key => {
        // choose *.js
        if (output && path.extname(key) === EXTNAME_JS) {
          const newContent: string = compilation.assets[key].source();
          const keyPath: string = key.replace(/\.js$/, firstFileEXT);
          writeFileSync(newContent, path.resolve(output, keyPath), key);
        }
      });
    });

    compiler.hooks.afterEmit.tap('GenAbcPluginMultiThread', () => {
      if (projectConfig.compileMode === ESMODULE) {
        return;
      }
      buildPathInfo = output;
      invokeWorkersToGenAbc();
    });
  }
}

function clearGlobalInfo() {
  intermediateJsBundle = [];
  fileterIntermediateJsBundle = [];
  moduleInfos = [];
  filterModuleInfos = [];
  commonJsModuleInfos = [];
  ESMModuleInfos = [];
  entryInfos = new Map<string, EntryInfo>();
  hashJsonObject = {};
  moduleHashJsonObject = {};
  buildPathInfo = '';
}

function getEntryInfo(tempFilePath: string, resourceResolveData: any): void {
  if (!resourceResolveData.descriptionFilePath) {
    return;
  }
  const packageName: string = resourceResolveData.descriptionFileData['name'];
  const packageJsonPath: string = resourceResolveData.descriptionFilePath;
  let npmInfoPath: string = path.resolve(packageJsonPath, '..');
  const fakeEntryPath: string = path.resolve(npmInfoPath, 'fake.js');
  const tempFakeEntryPath: string = genTemporaryPath(fakeEntryPath, projectConfig.projectPath, process.env.cachePath);
  const buildFakeEntryPath: string = genBuildPath(fakeEntryPath, projectConfig.projectPath, projectConfig.buildPath);
  npmInfoPath = toUnixPath(path.resolve(tempFakeEntryPath, '..'));
  const buildNpmInfoPath: string = toUnixPath(path.resolve(buildFakeEntryPath, '..'));
  if (entryInfos.has(npmInfoPath)) {
    return;
  }

  let abcFileName: string = genAbcFileName(tempFilePath);
  const abcFilePaths: string[] = abcFileName.split(NODE_MODULES);
  abcFileName = [NODE_MODULES, abcFilePaths[abcFilePaths.length - 1]].join(path.sep);
  abcFileName = toUnixPath(abcFileName);

  const packagePaths: string[] = tempFilePath.split(NODE_MODULES);
  const entryPaths: string[] = packagePaths[packagePaths.length - 1].split(packageName);
  let entry: string = toUnixPath(entryPaths[entryPaths.length - 1]);
  if (entry.startsWith('/')) {
    entry = entry.slice(1, entry.length);
  }
  const entryInfo: EntryInfo = new EntryInfo(npmInfoPath, abcFileName, buildNpmInfoPath, entry);
  entryInfos.set(npmInfoPath, entryInfo);
}

function processNodeModulesFile(filePath: string, tempFilePath: string, buildFilePath: string, abcFilePath: string, nodeModulesFile: Array<string>, module: any): void {
  getEntryInfo(tempFilePath, module.resourceResolveData);
  const descriptionFileData: any = module.resourceResolveData.descriptionFileData;
  if (descriptionFileData && descriptionFileData['type'] && descriptionFileData['type'] === 'module') {
    const tempModuleInfo: ModuleInfo = new ModuleInfo(filePath, tempFilePath, buildFilePath, abcFilePath, false);
    moduleInfos.push(tempModuleInfo);
    nodeModulesFile.push(tempFilePath);
  } else if (filePath.endsWith(EXTNAME_MJS)) {
    const tempModuleInfo: ModuleInfo = new ModuleInfo(filePath, tempFilePath, buildFilePath, abcFilePath, false);
    moduleInfos.push(tempModuleInfo);
    nodeModulesFile.push(tempFilePath);
  } else {
    const tempModuleInfo: ModuleInfo = new ModuleInfo(filePath, tempFilePath, buildFilePath, abcFilePath, true);
    moduleInfos.push(tempModuleInfo);
    nodeModulesFile.push(tempFilePath);
  }

  return;
}

function processEtsModule(filePath: string, tempFilePath: string, buildFilePath: string, nodeModulesFile: Array<string>, module: any): void {
  if (projectConfig.processTs === true) {
    tempFilePath = tempFilePath.replace(/\.ets$/, EXTNAME_TS);
    buildFilePath = buildFilePath.replace(/\.ets$/, EXTNAME_TS);
  } else {
    tempFilePath = tempFilePath.replace(/\.ets$/, EXTNAME_JS);
    buildFilePath = buildFilePath.replace(/\.ets$/, EXTNAME_JS);
  }
  const abcFilePath: string = genAbcFileName(tempFilePath);
  if (checkNodeModulesFile(filePath, projectConfig.projectPath)) {
    processNodeModulesFile(filePath, tempFilePath, buildFilePath, abcFilePath, nodeModulesFile, module);
  } else {
    const tempModuleInfo: ModuleInfo = new ModuleInfo(filePath, tempFilePath, buildFilePath, abcFilePath, false);
    moduleInfos.push(tempModuleInfo);
  }
}

function processDtsModule(filePath: string, tempFilePath: string, buildFilePath: string, nodeModulesFile: Array<string>, module: any): void {
  return;
}

function processTsModule(filePath: string, tempFilePath: string, buildFilePath: string, nodeModulesFile: Array<string>, module: any): void {
  if (projectConfig.processTs === false) {
    tempFilePath = tempFilePath.replace(/\.ts$/, EXTNAME_JS);
    buildFilePath = buildFilePath.replace(/\.ts$/, EXTNAME_JS);
  }
  const abcFilePath: string = genAbcFileName(tempFilePath);
  if (checkNodeModulesFile(filePath, projectConfig.projectPath)) {
    processNodeModulesFile(filePath, tempFilePath, buildFilePath, abcFilePath, nodeModulesFile, module);
  } else {
    const tempModuleInfo: ModuleInfo = new ModuleInfo(filePath, tempFilePath, buildFilePath, abcFilePath, false);
    moduleInfos.push(tempModuleInfo);
  }
}

function processJsModule(filePath: string, tempFilePath: string, buildFilePath: string, nodeModulesFile: Array<string>, module: any): void {
  const parent: string = path.join(tempFilePath, '..');
  if (!(fs.existsSync(parent) && fs.statSync(parent).isDirectory())) {
    mkDir(parent);
  }
  if (filePath.endsWith(EXTNAME_MJS) || filePath.endsWith(EXTNAME_CJS)) {
    fs.copyFileSync(filePath, tempFilePath);
  }
  const abcFilePath: string = genAbcFileName(tempFilePath);
  if (checkNodeModulesFile(filePath, projectConfig.projectPath)) {
    processNodeModulesFile(filePath, tempFilePath, buildFilePath, abcFilePath, nodeModulesFile, module);
  } else {
    const tempModuleInfo: ModuleInfo = new ModuleInfo(filePath, tempFilePath, buildFilePath, abcFilePath, false);
    moduleInfos.push(tempModuleInfo);
  }
}

function handleFinishModules(modules, callback): any {
  const nodeModulesFile: Array<string> = [];
  modules.forEach(module => {
    if (module !== undefined && module.resourceResolveData !== undefined) {
      const filePath: string = module.resourceResolveData.path;
      let tempFilePath = genTemporaryPath(filePath, projectConfig.projectPath, process.env.cachePath);
      if (tempFilePath.length === 0) {
        return;
      }
      let buildFilePath: string = genBuildPath(filePath, projectConfig.projectPath, projectConfig.buildPath);
      tempFilePath = toUnixPath(tempFilePath);
      buildFilePath = toUnixPath(buildFilePath);
      if (filePath.endsWith(EXTNAME_ETS)) {
        processEtsModule(filePath, tempFilePath, buildFilePath, nodeModulesFile, module);
      } else if (filePath.endsWith(EXTNAME_D_TS)) {
        processDtsModule(filePath, tempFilePath, buildFilePath, nodeModulesFile, module);
      } else if (filePath.endsWith(EXTNAME_TS)) {
        processTsModule(filePath, tempFilePath, buildFilePath, nodeModulesFile, module);
      } else if (filePath.endsWith(EXTNAME_JS) || filePath.endsWith(EXTNAME_MJS) || filePath.endsWith(EXTNAME_CJS)) {
        processJsModule(filePath, tempFilePath, buildFilePath, nodeModulesFile, module);
      } else {
        logger.error(red, `ETS:ERROR Cannot find resolve this file path: ${filePath}`, reset);
        process.exitCode = FAIL;
      }
    }
  });

  invokeWorkersModuleToGenAbc(moduleInfos);
  processEntryToGenAbc(entryInfos);
}

function processEntryToGenAbc(entryInfos: Map<string, EntryInfo>): void {
  for (const value of entryInfos.values()) {
    const tempAbcFilePath: string = toUnixPath(path.resolve(value.npmInfo, ENTRY_TXT));
    const buildAbcFilePath: string = toUnixPath(path.resolve(value.buildPath, ENTRY_TXT));
    fs.writeFileSync(tempAbcFilePath, value.entry, 'utf-8');
    if (!fs.existsSync(buildAbcFilePath)) {
      const parent: string = path.join(buildAbcFilePath, '..');
      if (!(fs.existsSync(parent) && fs.statSync(parent).isDirectory())) {
        mkDir(parent);
      }
    }
    fs.copyFileSync(tempAbcFilePath, buildAbcFilePath);
  }
}

function writeFileSync(inputString: string, output: string, jsBundleFile: string): void {
  let parent: string = path.join(output, '..');
  if (!(fs.existsSync(parent) && fs.statSync(parent).isDirectory())) {
    mkDir(parent);
  }
  let buildParentPath: string = path.join(projectConfig.buildPath, '..');
  let sufStr: string = output.replace(buildParentPath, '');
  let cacheOutputPath: string = "";
  if (process.env.cachePath) {
    cacheOutputPath = path.join(process.env.cachePath, TEMPRARY, sufStr);
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
    process.exitCode = FAIL;
  }
}

function mkDir(path_: string): void {
  const parent: string = path.join(path_, '..');
  if (!(fs.existsSync(parent) && !fs.statSync(parent).isFile())) {
    mkDir(parent);
  }
  fs.mkdirSync(path_);
}

function getSmallestSizeGroup(groupSize: Map<number, number>): any {
  const groupSizeArray: any = Array.from(groupSize);
  groupSizeArray.sort(function(g1, g2) {
    return g1[1] - g2[1]; // sort by size
  });
  return groupSizeArray[0][0];
}

function splitJsBundlesBySize(bundleArray: Array<File>, groupNumber: number): any {
  const result: any = [];
  if (bundleArray.length < groupNumber) {
    for (const value of bundleArray) {
      result.push([value]);
    }
    return result;
  }

  bundleArray.sort(function(f1: File, f2: File) {
    return f2.size - f1.size;
  });
  const groupFileSize: any = new Map();
  for (let i = 0; i < groupNumber; ++i) {
    result.push([]);
    groupFileSize.set(i, 0);
  }

  let index = 0;
  while (index < bundleArray.length) {
    const smallestGroup: any = getSmallestSizeGroup(groupFileSize);
    result[smallestGroup].push(bundleArray[index]);
    const sizeUpdate: any = groupFileSize.get(smallestGroup) + bundleArray[index].size;
    groupFileSize.set(smallestGroup, sizeUpdate);
    index++;
  }
  return result;
}

function invokeWorkersModuleToGenAbc(moduleInfos: Array<ModuleInfo>): void {
  removeDir(buildPathInfo);
  removeDir(projectConfig.nodeModulesPath);
  filterIntermediateModuleByHashJson(buildPathInfo, moduleInfos);
  filterModuleInfos.forEach(moduleInfo => {
    if (moduleInfo.isCommonJs) {
      commonJsModuleInfos.push(moduleInfo);
    } else {
      ESMModuleInfos.push(moduleInfo);
    }
  });

  invokeCluterModuleToAbc();
}

function initAbcEnv() : string[] {
  let js2abc: string = path.join(arkDir, 'build', 'src', 'index.js');
  if (isWin) {
    js2abc = path.join(arkDir, 'build-win', 'src', 'index.js');
  } else if (isMac) {
    js2abc = path.join(arkDir, 'build-mac', 'src', 'index.js');
  }

  js2abc = '"' + js2abc + '"';
  const args: string[] = [
    '--expose-gc',
    js2abc
  ];
  if (isDebug) {
    args.push('--debug');
  }

  return args;
}

function invokeCluterModuleToAbc(): void {
  const abcArgs: string[] = initAbcEnv();

  const clusterNewApiVersion: number = 16;
  const useNewApi: boolean = compareNodeVersion(clusterNewApiVersion);

  if (useNewApi && cluster.isPrimary || !useNewApi && cluster.isMaster) {
    if (useNewApi) {
      cluster.setupPrimary({
        exec: path.resolve(__dirname, genModuleAbcScript)
      });
    } else {
      cluster.setupMaster({
        exec: path.resolve(__dirname, genModuleAbcScript)
      });
    }

    if (commonJsModuleInfos.length > 0) {
      const tempAbcArgs: string[] = abcArgs.slice(0);
      tempAbcArgs.push('-c');
      const commonJsCmdPrefix: any = `${nodeJs} ${tempAbcArgs.join(' ')}`;
      const chunkSize: number = 50;
      const splitedModules: any[] = splitModulesByNumber(commonJsModuleInfos, chunkSize);
      const workerNumber: number = splitedModules.length;
      for (let i = 0; i < workerNumber; i++) {
        const workerData: any = {
          'inputs': JSON.stringify(splitedModules[i]),
          'cmd': commonJsCmdPrefix
        };
        cluster.fork(workerData);
      }
    }
    if (ESMModuleInfos.length > 0) {
      const tempAbcArgs: string[] = abcArgs.slice(0);
      tempAbcArgs.push('-m');
      const ESMCmdPrefix: any = `${nodeJs} ${tempAbcArgs.join(' ')}`;
      const chunkSize: number = 50;
      const splitedModules: any[] = splitModulesByNumber(ESMModuleInfos, chunkSize);
      const workerNumber: number = splitedModules.length;
      for (let i = 0; i < workerNumber; i++) {
        const workerData: any = {
          'inputs': JSON.stringify(splitedModules[i]),
          'cmd': ESMCmdPrefix
        };
        cluster.fork(workerData);
      }
    }

    cluster.on('exit', (worker, code, signal) => {
      if (code === FAIL) {
        process.exitCode = FAIL;
      }
      logger.debug(`worker ${worker.process.pid} finished`);
    });

    process.on('exit', (code) => {
      if (process.exitCode === FAIL) {
        return;
      }
      writeModuleHashJson();
    });
  }
}

function splitModulesByNumber(moduleInfos: Array<ModuleInfo>, chunkSize: number): any[] {
  const result: any[] = [];
  for (let i = 0; i < moduleInfos.length; i += chunkSize) {
    result.push(moduleInfos.slice(i, i + chunkSize));
  }

  return result;
}

function invokeWorkersToGenAbc(): void {
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
  const maxWorkerNumber: number = 3;
  const splitedBundles: any[] = splitJsBundlesBySize(fileterIntermediateJsBundle, maxWorkerNumber);
  const workerNumber: number = maxWorkerNumber < splitedBundles.length ? maxWorkerNumber : splitedBundles.length;
  const cmdPrefix: string = `${nodeJs} --expose-gc "${js2abc}" ${param} `;

  const clusterNewApiVersion: number = 16;
  const currentNodeVersion: number = parseInt(process.version.split('.')[0]);
  const useNewApi: boolean = currentNodeVersion >= clusterNewApiVersion;

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
      const workerData: any = {
        'inputs': JSON.stringify(splitedBundles[i]),
        'cmd': cmdPrefix
      };
      cluster.fork(workerData);
    }

    let count_ = 0;
    cluster.on('exit', (worker, code, signal) => {
      if (code === FAIL) {
        process.exitCode = FAIL;
      }
      count_++;
      if (count_ === workerNumber) {
        writeHashJson();
        clearGlobalInfo();
      }
      logger.debug(`worker ${worker.process.pid} finished`);
    });
  }
}

function filterIntermediateModuleByHashJson(buildPath: string, moduleInfos: Array<ModuleInfo>): void {
  for (let i = 0; i < moduleInfos.length; ++i) {
    filterModuleInfos.push(moduleInfos[i]);
  }
  const hashFilePath: string = genHashJsonPath(buildPath);
  if (hashFilePath.length === 0) {
    return;
  }
  const updateJsonObject: any = {};
  let jsonObject: any = {};
  let jsonFile: string = '';
  if (fs.existsSync(hashFilePath)) {
    jsonFile = fs.readFileSync(hashFilePath).toString();
    jsonObject = JSON.parse(jsonFile);
    filterModuleInfos = [];
    for (let i = 0; i < moduleInfos.length; ++i) {
      const input: string = moduleInfos[i].tempFilePath;
      const abcPath: string = moduleInfos[i].abcFilePath;
      if (!fs.existsSync(input)) {
        logger.error(red, `ETS:ERROR ${input} is lost`, reset);
        process.exitCode = FAIL;
        break;
      }
      if (fs.existsSync(abcPath)) {
        const hashInputContentData: any = toHashData(input);
        const hashAbcContentData: any = toHashData(abcPath);
        if (jsonObject[input] === hashInputContentData && jsonObject[abcPath] === hashAbcContentData) {
          updateJsonObject[input] = hashInputContentData;
          updateJsonObject[abcPath] = hashAbcContentData;
          mkdirsSync(path.dirname(moduleInfos[i].buildFilePath));
          fs.copyFileSync(moduleInfos[i].tempFilePath, moduleInfos[i].buildFilePath);
          fs.copyFileSync(genAbcFileName(moduleInfos[i].tempFilePath), genAbcFileName(moduleInfos[i].buildFilePath));
          if (projectConfig.buildArkMode === 'debug' && fs.existsSync(genSourceMapFileName(moduleInfos[i].tempFilePath))) {
            fs.copyFileSync(genSourceMapFileName(moduleInfos[i].tempFilePath), genSourceMapFileName(moduleInfos[i].buildFilePath));
          }
        } else {
          filterModuleInfos.push(moduleInfos[i]);
        }
      } else {
        filterModuleInfos.push(moduleInfos[i]);
      }
    }
  }

  moduleHashJsonObject = updateJsonObject;
}

function writeModuleHashJson(): void {
  for (let i = 0; i < filterModuleInfos.length; ++i) {
    const input: string = filterModuleInfos[i].tempFilePath;
    const abcPath: string = filterModuleInfos[i].abcFilePath;
    if (!fs.existsSync(input) || !fs.existsSync(abcPath)) {
      logger.error(red, `ETS:ERROR ${input} is lost`, reset);
      process.exitCode = FAIL;
      break;
    }
    const hashInputContentData: any = toHashData(input);
    const hashAbcContentData: any = toHashData(abcPath);
    moduleHashJsonObject[input] = hashInputContentData;
    moduleHashJsonObject[abcPath] = hashAbcContentData;
    mkdirsSync(path.dirname(filterModuleInfos[i].buildFilePath));
    fs.copyFileSync(filterModuleInfos[i].tempFilePath, filterModuleInfos[i].buildFilePath);
    fs.copyFileSync(genAbcFileName(filterModuleInfos[i].tempFilePath), genAbcFileName(filterModuleInfos[i].buildFilePath));
    if (projectConfig.buildArkMode === 'debug' && fs.existsSync(genSourceMapFileName(filterModuleInfos[i].tempFilePath))) {
      fs.copyFileSync(genSourceMapFileName(filterModuleInfos[i].tempFilePath), genSourceMapFileName(filterModuleInfos[i].buildFilePath));
    }
  }
  const hashFilePath: string = genHashJsonPath(buildPathInfo);
  if (hashFilePath.length === 0) {
    return;
  }
  fs.writeFileSync(hashFilePath, JSON.stringify(moduleHashJsonObject));
}

function filterIntermediateJsBundleByHashJson(buildPath: string, inputPaths: File[]): void {
  for (let i = 0; i < inputPaths.length; ++i) {
    fileterIntermediateJsBundle.push(inputPaths[i]);
  }
  const hashFilePath: string = genHashJsonPath(buildPath);
  if (hashFilePath.length === 0) {
    return;
  }
  const updateJsonObject: any = {};
  let jsonObject: any = {};
  let jsonFile: string = '';
  if (fs.existsSync(hashFilePath)) {
    jsonFile = fs.readFileSync(hashFilePath).toString();
    jsonObject = JSON.parse(jsonFile);
    fileterIntermediateJsBundle = [];
    for (let i = 0; i < inputPaths.length; ++i) {
      const input: string = inputPaths[i].path;
      const abcPath: string = input.replace(/_.js$/, EXTNAME_ABC);
      const cacheOutputPath: string = inputPaths[i].cacheOutputPath;
      const cacheAbcFilePath: string = cacheOutputPath.replace(/\_.js$/, '.abc');
      if (!fs.existsSync(cacheOutputPath)) {
        logger.error(red, `ETS:ERROR ${cacheOutputPath} is lost`, reset);
        process.exitCode = FAIL;
        break;
      }
      if (fs.existsSync(cacheAbcFilePath)) {
        const hashInputContentData: any = toHashData(cacheOutputPath);
        const hashAbcContentData: any = toHashData(cacheAbcFilePath);
        if (jsonObject[cacheOutputPath] === hashInputContentData && jsonObject[cacheAbcFilePath] === hashAbcContentData) {
          updateJsonObject[cacheOutputPath] = hashInputContentData;
          updateJsonObject[cacheAbcFilePath] = hashAbcContentData;
          if (!fs.existsSync(abcPath)) {
            mkdirsSync(path.dirname(abcPath));
            fs.copyFileSync(cacheAbcFilePath, abcPath);
          }
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

function writeHashJson(): void {
  for (let i = 0; i < fileterIntermediateJsBundle.length; ++i) {
    const input:string = fileterIntermediateJsBundle[i].path;
    const abcPath: string = input.replace(/_.js$/, EXTNAME_ABC);
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
      process.exitCode = FAIL;
      break;
    }
    if (!fs.existsSync(abcFile)) {
      mkdirsSync(path.dirname(abcFile));
      fs.copyFileSync(cacheAbcFilePath, abcFile);
    }
    if (fs.existsSync(intermediateJsBundle[i].path)) {
      fs.unlinkSync(intermediateJsBundle[i].path);
    }
  }
  const hashFilePath: string = genHashJsonPath(buildPathInfo);
  if (hashFilePath.length === 0) {
    return;
  }
  fs.writeFileSync(hashFilePath, JSON.stringify(hashJsonObject));
}

function genHashJsonPath(buildPath: string): string {
  buildPath = toUnixPath(buildPath);
  if (process.env.cachePath) {
    if (!fs.existsSync(process.env.cachePath) || !fs.statSync(process.env.cachePath).isDirectory()) {
      logger.debug(red, `ETS:ERROR hash path does not exist`, reset);
      return '';
    }
    return path.join(process.env.cachePath, hashFile);
  } else if (buildPath.indexOf(ARK) >= 0) {
    const dataTmps: string[] = buildPath.split(ARK);
    const hashPath: string = path.join(dataTmps[0], ARK);
    if (!fs.existsSync(hashPath) || !fs.statSync(hashPath).isDirectory()) {
      logger.debug(red, `ETS:ERROR hash path does not exist`, reset);
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