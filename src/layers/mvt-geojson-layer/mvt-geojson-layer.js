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

import Layer, {colorMaker} from '../base-layer';
import DeckGLMVTLayer from 'deckgl-layers/mvt-geojson-layer/mvt-geojson-layer';
import {GeoJsonLayer as DeckGLGeoJsonLayer} from 'deck.gl';
import MVTLayerIcon from './mvt-geojson-layer-icon';
import {
  GEOJSON_FIELDS,
  HIGHLIGH_COLOR_3D,
  CHANNEL_SCALES
} from 'constants/default-settings';
import {hexToRgb} from 'utils/color-utils';

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

const colorRange = {
  colors: [
    '#12939A',
    '#DDB27C',
    '#88572C',
    '#FF991F',
    '#F15C17',
    '#12939A',
    '#DDB27C',
    '#88572C',
    '#FF991F',
    '#F15C17'
  ]
};

export default class MVTLayer extends Layer {
  constructor(props) {
    super(props);

    this.registerVisConfig(geojsonVisConfigs);
  }

  get visualChannels() {
    return {
      ...super.visualChannels,
      strokeColor: {
        property: 'strokeColor',
        field: 'strokeColorField',
        scale: 'strokeColorScale',
        domain: 'strokeColorDomain',
        range: 'strokeColorRange',
        key: 'strokeColor',
        channelScaleType: CHANNEL_SCALES.color,
        condition: config => config.visConfig.stroked
      },
      size: {
        ...super.visualChannels.size,
        property: 'stroke',
        condition: config => config.visConfig.stroked
      },
      height: {
        property: 'height',
        field: 'heightField',
        scale: 'heightScale',
        domain: 'heightDomain',
        range: 'heightRange',
        key: 'height',
        channelScaleType: 'size',
        condition: config => config.visConfig.enable3d
      },
      radius: {
        property: 'radius',
        field: 'radiusField',
        scale: 'radiusScale',
        domain: 'radiusDomain',
        range: 'radiusRange',
        key: 'radius',
        channelScaleType: 'radius'
      }
    };
  }

  // cScale =
  // this.config.colorField &&
  // this.getVisChannelScale(
  //   'quantile',
  //   this.updateLayerDomain(this),
  //   colorRange.colors.map(hexToRgb)
  // );

  get type() {
    return 'mvtlayer';
  }

  get layerIcon() {
    return MVTLayerIcon;
  }
  shouldRenderLayer() {
    return this.type && this.config.isVisible;
  }

  renderLayer({idx, objectHovered, datasets, loadEDLinkData}) {
    var cfg = this.config;
    //{"field":"Population","operand":"BETWEEN","values":[90,630]}

    this.updateLayerConfig({
      colorField: {
        format: '',
        id: 'population',
        name: 'Population',
        tableFieldIndex: 2,
        type: 'integer'
      }
    });
    this.updateLayerDomain(datasets[this.config.dataId]);
    const colorField = {
      format: '',
      id: 'population',
      name: 'Population',
      tableFieldIndex: 1,
      type: 'integer'
    };
    const cScale =
      colorField &&
      this.getVisChannelScale(
        'quantize',
        this.config.colorDomain,
        colorRange.colors.map(hexToRgb)
      );
    // const getFillColor = d => {
    //   console.log('d', d);
    //   cScale
    //     ? this.getEncodedChannelValue(cScale, d.properties[0], colorField)
    //     : [128, 128, 128];
    // };
    var tempLayr = new DeckGLMVTLayer({
      id: this.id,
      idx,
      url: this.config.dataId,
      filters: datasets[this.config.dataId].filters,
      cScale: cScale,
      colorField: colorField,
      getEncodedChannelValue: (cScale, props, colorField) =>
        this.getEncodedChannelValue(cScale, props, colorField),
      loadEDLinkData
    });

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
