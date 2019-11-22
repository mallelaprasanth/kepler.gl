// Copyright (c) 2019 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import {SCALE_TYPES} from 'constants/default-settings'
import {
    getQuantileDomain,
    getOrdinalDomain,
    getLinearDomain
  } from 'utils/data-scale-utils';

export const calculateLayerDomain(data) {
    const {allData, filteredIndexForDomain} = dataset;
    const defaultDomain = [0, 1];
    const {scale} = visualChannel;
    const scaleType = 'quantile';

    const field = {format:"",id:"Pincode",name:"Pincode",tableFieldIndex:1,type:"integer"};
    if (!field) {
      // if colorField or sizeField were set back to null
      return defaultDomain;
    }

    if (!SCALE_TYPES[scaleType]) {
      Console.error(`scale type ${scaleType} not supported`);
      return defaultDomain;
    }

    // TODO: refactor to add valueAccessor to field
    //const fieldIdx = field.tableFieldIndex - 1;
    //const isTime = field.type === ALL_FIELD_TYPES.timestamp;
    //const valueAccessor = maybeToDate.bind(
    //   null,
    //   isTime,
    //   fieldIdx,
    //   field.format
    // );
    const indexValueAccessor = i => valueAccessor(allData[i]);

    const sortFunction = getSortingFunction(field.type);

    switch (scaleType) {
      case SCALE_TYPES.ordinal:
      case SCALE_TYPES.point:
        // do not recalculate ordinal domain based on filtered data
        // don't need to update ordinal domain every time
        return getOrdinalDomain(allData, valueAccessor);

      case SCALE_TYPES.quantile:
        return getQuantileDomain(filteredIndexForDomain, indexValueAccessor, sortFunction);

      case SCALE_TYPES.quantize:
      case SCALE_TYPES.linear:
      case SCALE_TYPES.sqrt:
      default:
        return getLinearDomain(filteredIndexForDomain, indexValueAccessor);
    }
  }