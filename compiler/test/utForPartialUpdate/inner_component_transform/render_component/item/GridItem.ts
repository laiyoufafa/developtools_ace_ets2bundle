/*
 * Copyright (c) 2022 Huawei Device Co., Ltd.
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

exports.source = `
@Entry
@Component
struct ParentView {
  build() {
    GridItem('true') {
      Text('xx').width(100)
    }.width(200).height(100)
  }
}
`
exports.expectResult =
`class ParentView extends View {
    constructor(parent, params) {
        super(parent);
        this.setInitiallyProvidedValue(params);
    }
    setInitiallyProvidedValue(params) {
    }
    setStateSourcePropertiesUnchanged() {
    }
    setOneWaySyncPropertiesUnchanged() {
    }
    setTwoWaySyncPropertiesUnchanged() {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
    }
    aboutToBeDeleted() {
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    render() {
        {
            const isLazyCreate = true;
            const itemCreation = (elmtId, isInitialRender) => {
                ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                GridItem.create(deepRenderFunction, isLazyCreate);
                GridItem.width(200);
                GridItem.height(100);
                if (!isInitialRender) {
                    GridItem.pop();
                }
                ViewStackProcessor.StopGetAccessRecording();
            };
            const observedShallowRender = () => {
                this.observeComponentCreation((elmtId, isInitialRender) => {
                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                    GridItem.create(deepRenderFunction, isLazyCreate);
                    if (!isInitialRender) {
                        GridItem.pop();
                    }
                    ViewStackProcessor.StopGetAccessRecording();
                });
                GridItem.pop();
            };
            const observedDeepRender = () => {
                this.observeComponentCreation(itemCreation);
                this.observeComponentCreation((elmtId, isInitialRender) => {
                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                    Text.create('xx');
                    Text.width(100);
                    if (!isInitialRender) {
                        Text.pop();
                    }
                    ViewStackProcessor.StopGetAccessRecording();
                });
                Text.pop();
                GridItem.pop();
            };
            const deepRenderFunction = (elmtId, isInitialRender) => {
                itemCreation(elmtId, isInitialRender);
                this.updateFuncByElmtId.set(elmtId, itemCreation);
                this.observeComponentCreation((elmtId, isInitialRender) => {
                    ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
                    Text.create('xx');
                    Text.width(100);
                    if (!isInitialRender) {
                        Text.pop();
                    }
                    ViewStackProcessor.StopGetAccessRecording();
                });
                Text.pop();
                GridItem.pop();
            };
            if (isLazyCreate) {
                observedShallowRender();
            }
            else {
                observedDeepRender();
            }
        }
    }
    rerender() {
        this.updateDirtyElements();
    }
}
loadDocument(new ParentView("1", undefined, {}));
`