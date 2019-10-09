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

import memoize from 'lodash.memoize';
import uniq from 'lodash.uniq';

import Layer, { colorMaker } from '../base-layer';
import DeckGLMVTLayer from 'deckgl-layers/mvt-geojson-layer/mvt-geojson-layer';
import { GeoJsonLayer as DeckGLGeoJsonLayer } from 'deck.gl';
import MVTLayerIcon from './mvt-geojson-layer-icon';

export const geojsonVisConfigs = {
    opacity: 'opacity',
    thickness: {
        type: 'number',
        defaultValue: 0.5,
        label: 'Stroke Width',
        isRanged: false,
        range: [0, 100],
        step: 0.1,
        group: 'stroke',
        property: 'thickness'
    },
    strokeColor: 'strokeColor',
    colorRange: 'colorRange',
    strokeColorRange: 'strokeColorRange',
    radius: 'radius',

    sizeRange: 'strokeWidthRange',
    radiusRange: 'radiusRange',
    heightRange: 'elevationRange',
    elevationScale: 'elevationScale',
    stroked: 'stroked',
    filled: 'filled',
    enable3d: 'enable3d',
    wireframe: 'wireframe',
    featData: []
};

const colorRange = {colors:['#12939A',
'#DDB27C',
'#88572C',
'#FF991F',
'#F15C17']}

// const cScale =
//       'colorField' &&
//       this.getVisChannelScale(
//         colorScale,
//         colorDomain,
//         colorRange.colors.map(hexToRgb)
//       );

export default class MVTLayer extends Layer {
    constructor(props) {
        super(props);

        this.registerVisConfig(geojsonVisConfigs);
    }

    get type() {
        return 'mvtlayer';
    }

    get layerIcon() {
        return MVTLayerIcon;
    }
    shouldRenderLayer() {
        return (
            this.type &&
            this.config.isVisible
        );
    }

    // fill color
    
    //   getHoverData(object, allData) {
    //     // index of allData is saved to feature.properties
    //     return allData[object.properties.index];
    //   }

    // static findDefaultLayerProps() {


    //     return true;
    //   }

    renderLayer({
        idx,
        objectHovered,
        datasets,
        loadEDLinkData
    }) {
        var cfg = this.config;
//{"field":"Population","operand":"BETWEEN","values":[90,630]}
        var tempLayr = new DeckGLMVTLayer({
            id: this.id,
            idx,
            url: this.config.dataId,
            filters:datasets[this.config.dataId].filters,
            loadEDLinkData
        })
        return [
            tempLayr,
            ...(this.isLayerHovered(objectHovered)
                ? [
                    new DeckGLGeoJsonLayer({

                        id: `${this.id}-hovered`,
                        data: [objectHovered.object],
                        getLineWidth: 1,
                        getRadius: 23,
                        getElevation: 45,
                        getLineColor: [255, 255, 0],
                        getFillColor: [0, 255, 255],
                        stroked: true,
                        pickable: false,
                        filled: false
                    })
                ]
                : [])
        ];
    }
}
