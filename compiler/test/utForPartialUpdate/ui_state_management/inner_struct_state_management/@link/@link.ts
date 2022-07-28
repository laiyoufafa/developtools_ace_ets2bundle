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
@Component
struct LinkComponent {
  @Link counter: string
  build() {
    Text(this.counter)
  }
}

@Entry
@Component
struct ParentComponent {
  @State value: string = 'first init content';
  build() {
    Column() {
      LinkComponent({counter: this.$value})
    }
  }
}
`
exports.expectResult =
`class LinkComponent extends View {
    constructor(parent, params) {
        super(parent);
        this.__counter = new SynchedPropertySimpleTwoWay(params.counter, this, "counter");
        this.setInitiallyProvidedValue(params);
    }
    setInitiallyProvidedValue(params) {
    }
    setStateSourcePropertiesUnchanged() {
    }
    setOneWaySyncPropertiesUnchanged() {
    }
    setTwoWaySyncPropertiesUnchanged() {
        this.__counter.SetPropertyUnchanged();
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__counter.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__counter.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    get counter() {
        return this.__counter.get();
    }
    set counter(newValue) {
        this.__counter.set(newValue);
    }
    render() {
        this.observeComponentCreation((elmtId, isInitialRender) => {
            ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
            Text.create(this.counter);
            if (!isInitialRender) {
                Text.pop();
            }
            ViewStackProcessor.StopGetAccessRecording();
        });
        Text.pop();
    }
    rerender() {
        this.__counter.markDependentElementsDirty(this);
        this.updateDirtyElements();
    }
}
class ParentComponent extends View {
    constructor(parent, params) {
        super(parent);
        this.__value = new ObservedPropertySimple('first init content', this, "value");
        this.setInitiallyProvidedValue(params);
    }
    setInitiallyProvidedValue(params) {
        if (params.value !== undefined) {
            this.value = params.value;
        }
    }
    setStateSourcePropertiesUnchanged() {
        this.__value.SetPropertyUnchanged();
    }
    setOneWaySyncPropertiesUnchanged() {
    }
    setTwoWaySyncPropertiesUnchanged() {
    }
    purgeVariableDependenciesOnElmtId(rmElmtId) {
        this.__value.purgeDependencyOnElmtId(rmElmtId);
    }
    aboutToBeDeleted() {
        this.__value.aboutToBeDeleted();
        SubscriberManager.Get().delete(this.id__());
        this.aboutToBeDeletedInternal();
    }
    get value() {
        return this.__value.get();
    }
    set value(newValue) {
        this.__value.set(newValue);
    }
    render() {
        this.observeComponentCreation((elmtId, isInitialRender) => {
            ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
            Column.create();
            if (!isInitialRender) {
                Column.pop();
            }
            ViewStackProcessor.StopGetAccessRecording();
        });
        {
            const elmtId = ViewStackProcessor.AllocateNewElmetIdForNextComponent();
            ViewStackProcessor.StartGetAccessRecordingFor(elmtId);
            View.create(new LinkComponent(this, { counter: this.__value }));
            ViewStackProcessor.StopGetAccessRecording();
        }
        Column.pop();
    }
    rerender() {
        this.__value.markDependentElementsDirty(this);
        this.updateDirtyElements();
    }
}
loadDocument(new ParentComponent("1", undefined, {}));
`