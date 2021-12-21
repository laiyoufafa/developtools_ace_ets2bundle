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

class MyComponent extends View {
    constructor() {
        super();
        this.value1 = value1;
        this.value2 = value2;
        this.value3 = value3;
        console.info('into constructor');
    }
    render() { return new Column(new Text(this.value1), new Text(this.value2), new Text(this.value3)); }
}
loadDocument(new MyComponent());
