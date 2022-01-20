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

(()=>{"use strict";var e={904:(e,t)=>{var r;let n;Object.defineProperty(t,"__esModule",{value:!0}),t.setDomain=t.getDomain=t.Domain=void 0,function(e){e[e.FA=0]="FA",e[e.FORM=1]="FORM",e[e.ETS=2]="ETS"}(r||(r={})),t.Domain=r,t.setDomain=e=>{n=e},t.getDomain=()=>null!=n?n:r.ETS},784:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.errorMap=void 0,t.errorMap=new Map([["fileError","Visual file is damaged"],["versionError","Version number of visual file does not match"],["modelError","Visual model in visual file is damaged"],["codegenError","Codegen hml and css failed"]])},117:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.ASTNode=void 0,t.ASTNode=class{accept(e){return e.visit(this)}}},862:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.Cache=void 0,t.Cache=class{constructor(e,t=0){this.value="",this.indent=t,this.flag=!0,this.INDENT=e}indentOn(){this.flag=!0}indentOff(){this.flag=!1}incIndent(){this.indent++}decIndent(){this.indent--}checkIndent(){return this.indent<0}getIndents(){if(this.flag){let e="";for(let t=0;t<this.indent;t++)e+=this.INDENT;return e}return""}concat(...e){return this.value+=this.getIndents(),this.value=this.value.concat(...e),String(this.value)}toString(){return this.value}}},519:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.Tag=void 0;const n=r(117);class o extends n.ASTNode{constructor(e,t,r,n){super(),this.tagName=e,this.params=t,this.content=r,this.properties=n}setParams(e){this.params=e}}t.Tag=o},623:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.ASTNodeGenerator=void 0;const n=r(519),o=r(51);class i{constructor(e){this.cache=e}visit(e){e instanceof n.Tag&&this.genTag(e)}static getMethodGen(e){return void 0===i.instance?i.instance=new i(e):i.instance.setCache(e),i.instance}setCache(e){this.cache=e}genParams(e){if("string"==typeof e)this.cache.concat(e);else if(e.size>0){this.cache.concat(o.TokenClass.LBRA,o.TokenClass.SPACE);let t=0;e.forEach(((r,n)=>{this.cache.concat(n,o.TokenClass.COLON,o.TokenClass.SPACE,r),t++,t<e.size&&this.cache.concat(o.TokenClass.COMMA,o.TokenClass.SPACE)})),this.cache.concat(o.TokenClass.SPACE,o.TokenClass.RBRA)}}genObjectProperty(e){let t=0;this.cache.concat(o.TokenClass.LBRA,o.TokenClass.SPACE),e.forEach(((r,n)=>{this.cache.concat(n,o.TokenClass.COLON,o.TokenClass.SPACE,r),t++,t<e.size&&this.cache.concat(o.TokenClass.COMMA,o.TokenClass.SPACE)})),this.cache.concat(o.TokenClass.SPACE,o.TokenClass.RBRA,o.TokenClass.TAG_END)}genTag(e){e.tagName=e.tagName.replace(e.tagName[0],e.tagName[0].toUpperCase()),this.cache.concat(e.tagName,o.TokenClass.TAG_START),this.cache.indentOff(),this.genParams(e.params),this.cache.concat(o.TokenClass.TAG_END),null!==e.content&&(0!==e.content.length&&(this.cache.concat(o.TokenClass.SPACE,o.TokenClass.LBRA,o.TokenClass.NEW_LINE),this.cache.indentOn(),this.cache.incIndent(),e.content.forEach((e=>{e.accept(this),this.cache.indentOff(),this.cache.concat(o.TokenClass.NEW_LINE),this.cache.indentOn()})),this.cache.decIndent(),this.cache.indentOn()),this.cache.indentOn(),this.cache.concat(o.TokenClass.RBRA)),null!==e.properties&&(null!==e.content&&0!==e.content.length||this.cache.incIndent(),e.properties.forEach(((e,t)=>{this.cache.concat(o.TokenClass.NEW_LINE),this.cache.indentOn(),this.cache.concat(o.TokenClass.PROPERTY_START,t,o.TokenClass.TAG_START),this.cache.indentOff(),"string"==typeof e?this.cache.concat(e,o.TokenClass.TAG_END):this.genObjectProperty(e)})),null!==e.content&&0!==e.content.length||this.cache.decIndent())}}t.ASTNodeGenerator=i,i.instance=void 0},413:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.ETSBridge=void 0;const n=r(519),o=r(973);t.ETSBridge=class{constructor(){this.errors=0}error(e){console.error("Code generating error: "+e),this.errors+=1}getErrorCount(){return this.errors}visit(e){const t=new Map;let r=null;const i=new Map,s=new n.Tag(e.type,t,r,i);if(o.parseVisualModel(e,s),e.children.length>0){r=[];for(const t of e.children)r.push(t.accept(this))}return s.content=r,s}}},459:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.genETS=void 0;const n=r(623),o=r(862);t.genETS=function(e){const t=n.ASTNodeGenerator.getMethodGen(new o.Cache("  ",2));return e.accept(t),t.cache.toString()}},435:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.StringWriter=void 0;const n=r(459);t.StringWriter=class{genETS(e){return n.genETS(e)}}},51:(e,t)=>{var r;Object.defineProperty(t,"__esModule",{value:!0}),t.TokenClass=void 0,(r=t.TokenClass||(t.TokenClass={}))[r.IDENTIFIER=0]="IDENTIFIER",r[r.STRING_LITERAL=1]="STRING_LITERAL",r[r.NUMBER=2]="NUMBER",r[r.CHARACTER=3]="CHARACTER",r[r.EOF=4]="EOF",r[r.INVALID=5]="INVALID",r.EMPTY_DATA="empty",r.ASSIGN="=",r.INDENT="  ",r.NEW_LINE="\n",r.CARRIAGE_RETURN="\r",r.SPACE=" ",r.LQUOTE="'",r.RQUOTE="'",r.TAG_START="(",r.TAG_END=")",r.EMPTY_TAG_END="/>",r.END_TAG_START="</",r.ID_STYLE_START="#",r.PROPERTY_START=".",r.LBRA="{",r.RBRA="}",r.SEMICOLON=";",r.COLON=":",r.COMMA=","},973:(e,t)=>{function r(e){return(...t)=>t.length<e.length?r(e.bind(null,...t)):e(...t)}Object.defineProperty(t,"__esModule",{value:!0}),t.parseVisualModel=void 0;const n=r(((e,t)=>t.property.has(e))),o=r(((e,t,r)=>r.type===e&&r.property.has(t))),i=r(((e,t,r)=>{const n=t.property.get(e);void 0!==n&&r.properties.set(f(e),"'"+n+"'")}));function s(e){return void 0===e||""===e}const a=r(((e,t,r)=>{const n=t.property.get(e);s(n)||r.properties.set(f(e),n)})),c=r(((e,t,r)=>{const n=t.property.get(e);s(n)||r.properties.set(f(e),n)})),l=r(((e,t,r,n)=>{const o=r.property.get(e);s(o)||n.properties.set(f(e),y(t,o))})),p=r(((e,t,r)=>{const n=t.property.get(e);void 0!==n&&r.params instanceof Map&&r.params.set(f(e),"'"+n+"'")})),d=r(((e,t,r)=>{const n=t.property.get(e);!s(n)&&r.params instanceof Map&&r.params.set(f(e),n)})),h=r(((e,t,r,n)=>{const o=r.property.get(e);!s(o)&&n.params instanceof Map&&n.params.set(f(e),y(t,o))})),u=r(((e,t,r)=>{let n=t.property.get(e);s(n)||(n=m(n),r.properties.set(f(e),n))}));function g([e,...t]){return(null==e?void 0:e.toUpperCase())+t.join("")}function f(e){const t=e.split("-");let r=t[0];for(let e=1;e<t.length;e++)r+=g(t[e]);return r}function y(e,t){const r=t.split("-");let n="";for(const e of r)n+=g(e);return e+n}function m(e){return e.startsWith("#")||e.startsWith("rgba")?e="'"+e+"'":e.startsWith("0x")||(e="Color."+g(e)),e}function v(e,t,r){s(t)||r.set(e,"'"+t+"'")}t.parseVisualModel=function(e,t){for(const r of E)("boolean"==typeof r[0]||r[0](e))&&r[1](e,t)};const T=r(((e,t,r,n)=>{const o=r.property.get(e);if(s(o)||!(n.params instanceof Map))return;let i=y(t,o);"flex-start"===o?i=t+"Start":"flex-end"===o&&(i=t+"End"),n.params.set(f(e),i)})),E=[[n("width"),i("width")],[n("height"),i("height")],[function(e){return e.property.has("constraint-size-min-width")||e.property.has("constraint-size-max-width")||e.property.has("constraint-size-min-height")||e.property.has("constraint-size-min-height")},function(e,t){const r=new Map,n=e.property.get("constraint-size-min-width"),o=e.property.get("constraint-size-max-width"),i=e.property.get("constraint-size-min-height"),s=e.property.get("constraint-size-max-height");v("minWidth",n,r),v("maxWidth",o,r),v("minHeight",i,r),v("maxHeight",s,r),r.size>0&&t.properties.set("constraintSize",r)}],[n("align"),l("align","Alignment.")],[n("direction"),l("direction","Direction.")],[function(e){return e.property.has("left")||e.property.has("top")},function(e,t){const r=e.property.get("position"),n=e.property.get("left"),o=e.property.get("top");s(n)&&s(o)||t.properties.set("absolute"===r?"position":"offset",new Map([["x","'"+(null!=n?n:"0")+"'"],["y","'"+(null!=o?o:"0")+"'"]]))}],[n("aspect-ratio"),a("aspect-ratio")],[n("display-priority"),a("display-priority")],[n("flex-basis"),i("flex-basis")],[n("flex-grow"),a("flex-grow")],[n("flex-shrink"),a("flex-shrink")],[n("align-self"),l("align-self","ItemAlign.")],[n("border-style"),l("border-style","BorderStyle.")],[n("border-width"),i("border-width")],[n("border-color"),u("border-color")],[n("border-radius"),i("border-radius")],[n("background-color"),u("background-color")],[n("opacity"),a("opacity")],[n("visibility"),l("visibility","Visibility.")],[n("enabled"),c("enabled")],[n("font-color"),u("font-color")],[n("font-size"),i("font-size")],[n("font-style"),l("font-style","FontStyle.")],[n("font-weight"),function(e,t){const r=e.property.get("font-weight");s(r)||t.properties.set("fontWeight",["lighter","normal","regular","medium","bold","bolder"].includes(r)?y("FontWeight.",r):r)}],[n("font-family"),i("font-family")],[function(e){return e.property.has("margin")||e.property.has("margin-left")||e.property.has("margin-top")||e.property.has("margin-right")||e.property.has("margin-bottom")},function(e,t){var r,n,o,i;const s=new Map,a=e.property.get("margin"),c=null!==(r=e.property.get("margin-top"))&&void 0!==r?r:a,l=null!==(n=e.property.get("margin-bottom"))&&void 0!==n?n:a,p=null!==(o=e.property.get("margin-left"))&&void 0!==o?o:a,d=null!==(i=e.property.get("margin-right"))&&void 0!==i?i:a;v("top",c,s),v("bottom",l,s),v("left",p,s),v("right",d,s),s.size>0&&t.properties.set("margin",s)}],[function(e){return e.property.has("padding")||e.property.has("padding-left")||e.property.has("padding-top")||e.property.has("padding-right")||e.property.has("padding-bottom")},function(e,t){var r,n,o,i;const s=new Map,a=e.property.get("padding"),c=null!==(r=e.property.get("padding-top"))&&void 0!==r?r:a,l=null!==(n=e.property.get("padding-bottom"))&&void 0!==n?n:a,p=null!==(o=e.property.get("padding-left"))&&void 0!==o?o:a,d=null!==(i=e.property.get("padding-right"))&&void 0!==i?i:a;v("top",c,s),v("bottom",l,s),v("left",p,s),v("right",d,s),s.size>0&&t.properties.set("padding",s)}],[o("button","label"),function(e,t){const r=e.property.get("label");"string"==typeof r&&t.setParams("'"+r+"'")}],[o("button","type"),l("type","ButtonType.")],[o("button","state-effect"),c("state-effect")],[o("divider","vertical"),c("vertical")],[o("divider","color"),u("color")],[o("divider","stroke-width"),i("stroke-width")],[o("divider","line-cap"),l("line-cap","LineCapStyle.")],[o("image","src"),function(e,t){const r=e.property.get("src");"string"==typeof r&&t.setParams(function(e){return null===e.match(/\$(r|rawfile)\('(.*)'\)$/)?"'"+e+"'":e}(r))}],[o("image","alt"),i("alt")],[o("image","object-fit"),l("object-fit","ImageFit.")],[o("image","object-repeat"),l("object-repeat","ImageRepeat.")],[o("image","interpolation"),l("interpolation","ImageInterpolation.")],[o("image","render-mode"),l("render-mode","ImageRenderMode.")],[function(e){return e.property.has("source-size-width")||e.property.has("source-size-height")},function(e,t){let r=e.property.get("source-size-width"),n=e.property.get("source-size-height");if(s(r)&&s(n))return;r="0"===r||s(r)?"0":r.substring(0,r.length-2),n="0"===n||s(n)?"0":n.substring(0,n.length-2);const o=new Map([["width",r],["height",n]]);t.properties.set("sourceSize",o)}],[function(e){return"progress"===e.type&&(e.property.has("value")||e.property.has("total")||e.property.has("style"))},function(e,t){var r;t.params instanceof Map&&t.params.set("value",null!==(r=e.property.get("value"))&&void 0!==r?r:"0")}],[o("progress","total"),d("total")],[o("progress","style"),h("style","ProgressStyle.")],[o("progress","color"),u("color")],[o("slider","value"),d("value")],[o("slider","min"),d("min")],[o("slider","max"),d("max")],[o("slider","step"),d("step")],[o("slider","style"),h("style","SliderStyle.")],[o("slider","block-color"),u("block-color")],[o("slider","track-color"),u("track-color")],[o("slider","selected-color"),u("selected-color")],[o("slider","show-steps"),c("show-steps")],[o("slider","show-tips"),c("show-tips")],[o("text","content"),function(e,t){const r=e.property.get("content");"string"==typeof r&&t.setParams("`"+r+"`")}],[o("text","text-align"),l("text-align","TextAlign.")],[o("text","text-overflow"),function(e,t){const r=e.property.get("text-overflow");s(r)||t.properties.set("textOverflow",new Map([["overflow","TextOverflow."+g(r)]]))}],[o("text","max-lines"),a("max-lines")],[o("text","line-height"),i("line-height")],[function(e){return"text"===e.type&&(e.property.has("decoration-type")||e.property.has("decoration-color"))},function(e,t){const r=e.property.get("decoration-type"),n=e.property.get("decoration-color");if(s(r)&&s(n))return;const o=new Map([["type",s(r)?"TextDecorationType.None":"TextDecorationType."+g(r)]]);t.properties.set("decoration",o),s(n)||o.set("color",m(n))}],[o("text","baseline-offset"),i("baseline-offset")],[o("text","text-case"),l("text-case","TextCase.")],[o("column","space"),p("space")],[o("column","align-items-column"),function(e,t){const r=e.property.get("align-items-column");if(s(r))return;let n=y("HorizontalAlign.",r);"flex-start"===r?n="HorizontalAlign.Start":"flex-end"===r&&(n="HorizontalAlign.End"),t.properties.set("alignItems",n)}],[o("row","space"),p("space")],[o("row","align-items-row"),function(e,t){const r=e.property.get("align-items-row");if(s(r))return;let n=y("VerticalAlign.",r);"flex-start"===r?n="VerticalAlign.Top":"flex-end"===r&&(n="VerticalAlign.Bottom"),t.properties.set("alignItems",n)}],[o("flex","flex-direction"),function(e,t){const r=e.property.get("flex-direction");!s(r)&&t.params instanceof Map&&t.params.set("direction",y("FlexDirection.",r))}],[o("flex","wrap"),function(e,t){const r=e.property.get("wrap");if(s(r)||!(t.params instanceof Map))return;let n=y("FlexWrap.",r);"nowrap"===r&&(n="FlexWrap.NoWrap"),t.params.set("wrap",n)}],[o("flex","justify-content"),T("justify-content","FlexAlign.")],[o("flex","align-items-flex"),function(e,t){const r=e.property.get("align-items-flex");if(s(r)||!(t.params instanceof Map))return;let n=y("ItemAlign.",r);"flex-start"===r?n="ItemAlign.Start":"flex-end"===r&&(n="ItemAlign.End"),t.params.set("alignItems",n)}],[o("flex","align-content"),T("align-content","FlexAlign.")],[o("list","space"),d("space")],[o("list","initial-index"),d("initial-index")],[o("list","list-direction"),l("list-direction","Axis.")],[function(e){return"list"===e.type&&(e.property.has("divider-stroke-width")||e.property.has("divider-color")||e.property.has("divider-start-margin")||e.property.has("divider-end-margin"))},function(e,t){const r=e.property.get("divider-stroke-width"),n=new Map([["strokeWidth","'"+(null!=r?r:"0")+"'"]]),o=e.property.get("divider-color"),i=e.property.get("divider-start-margin"),a=e.property.get("divider-end-margin");s(o)||n.set("color",m(o)),s(i)||n.set("startMargin","'"+i+"'"),s(a)||n.set("endMargin","'"+a+"'"),t.properties.set("divider",n)}],[o("list","edit-mode"),c("edit-mode")],[o("list","edge-effect"),l("edge-effect","EdgeEffect.")],[o("list","chain-animation"),c("chain-animation")],[o("list-item","sticky"),l("sticky","Sticky.")],[o("list-item","editable"),c("editable")],[o("swiper","index"),a("index")],[o("swiper","auto-play"),c("auto-play")],[o("swiper","interval"),a("interval")],[o("swiper","indicator"),c("indicator")],[o("swiper","loop"),c("loop")],[o("swiper","duration"),a("duration")],[o("swiper","vertical"),c("vertical")],[o("swiper","item-space"),i("item-space")]]},945:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.FormAction=t.FormModel=void 0,t.FormModel=class{constructor(){this.data=new Map,this.actions=new Map}},t.FormAction=class{constructor(e,t,r){this.action=e,this.params=t,this.want=r}}},891:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.setInstance=t.getInstance=void 0;const n=r(933),o=r(945),i=r(904),s={document:{VisualVersion:"12",type:"ETS"},visualModel:new n.VisualModel({type:"div",id:"wrapper"}),formData:new o.FormModel};t.getInstance=function(){return s},t.setInstance=function(e){for(const t in s)Object.prototype.hasOwnProperty.call(e,t)&&(s[t]=e[t]);const t=s.document.type;i.setDomain("ETS"===t?i.Domain.ETS:"FORM"===t?i.Domain.FORM:i.Domain.FA)}},977:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.reviver=t.replacer=t.deserialize=t.serialize=void 0;const n=r(933),o=r(891);function i(e,t){if(t instanceof Map)return{dataType:"Map",value:Object.fromEntries(t.entries())};if(t instanceof Set)return{dataType:"Set",value:Array.from(t.entries())};if(t instanceof n.VisualModel){const e=new n.VisualModel({type:"none"}),r={};for(const n in e)Object.prototype.hasOwnProperty.call(t,n)&&(r[n]=t[n]);return{dataType:"VisualModel",value:r}}return t}function s(e,t){if("object"==typeof t&&null!=t){if("Map"===t.dataType)return new Map(Object.entries(t.value));if("Set"===t.dataType)return new Set(t.value);if("VisualModel"===t.dataType){const e=new n.VisualModel({type:""});Object.assign(e,t.value),t=e}}return t}t.serialize=function(e,t){return JSON.stringify(null!=t?t:o.getInstance(),i,4)},t.deserialize=function(e){const t=JSON.parse(e,s);o.setInstance(t)},t.replacer=i,t.reviver=s},933:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.VisualModel=void 0;const r="-visual";t.VisualModel=class{constructor(e){if(this.mediaProperty=void 0,this.property=void 0!==e.property?e.property:new Map,this.children=void 0!==e.children?e.children:[],"wrapper"===e.type)return this.id="wrapper",void(this.type="div");e.type.endsWith(r)&&(e.type=e.type.substring(0,e.type.length-r.length)),this.id=void 0!==e.id?e.id:"",this.type=e.type}accept(e){return e.visit(this)}}}},t={};function r(n){var o=t[n];if(void 0!==o)return o.exports;var i=t[n]={exports:{}};return e[n](i,i.exports,r),i.exports}var n={};(()=>{var e=n;Object.defineProperty(e,"__esModule",{value:!0});const t=r(784),o=r(891),i=r(977),s=r(413),a=r(435);e.genETS=function(e){const r={ets:"",errorType:"",errorMessage:""};!function(e,t){try{i.deserialize(e);const r=o.getInstance().document.VisualVersion,n=/^([1-9]+[0-9]*)$/;if(void 0===r)t.errorType="versionError";else{const e=r.match(n);(null===e||parseInt(e[1])>12)&&(t.errorType="versionError")}}catch(e){t.errorType="fileError"}}(e,r);try{const e=function(e){let t="";const r=new s.ETSBridge,n=e.accept(r),o=(new a.StringWriter).genETS(n);return t=r.getErrorCount()>0?"error":o,t}(o.getInstance().visualModel);"error"===e&&(r.errorType="codegenError"),r.ets=e}catch(e){r.errorType="modelError"}return""!==r.errorType&&(r.errorMessage=t.errorMap.get(r.errorType),r.ets=""),r}})();var o=exports;for(var i in n)o[i]=n[i];n.__esModule&&Object.defineProperty(o,"__esModule",{value:!0})})();