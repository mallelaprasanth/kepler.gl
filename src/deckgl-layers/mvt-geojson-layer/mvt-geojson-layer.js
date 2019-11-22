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

import {CompositeLayer, LayerExtension} from '@deck.gl/core';
import {TileLayer as DeckGLTileLayer} from '@deck.gl/geo-layers';
import {SolidPolygonLayer} from '@deck.gl/layers';
import {GeoJsonLayer} from '@deck.gl/layers';
import MapboxGLMap from 'react-map-gl';

import Protobuf from 'pbf';
import {VectorTile, VectorTileFeature} from '@mapbox/vector-tile';
import {worldToLngLat} from 'viewport-mercator-project';
import {DataFilterExtension} from '@deck.gl/extensions';
import {area as turfArea, union as turfUnion} from '@turf/turf';
import {decodeTile} from './mvt-geojson-utils';
const gProps = {
  getFillColor: {
    key: 'Population',
    operation: '>',
    values: {'50': [128, 128, 128], default: [0, 0, 0, 0]}
  }
};

export default class DeckGLMVTLayer extends CompositeLayer {
  initialiseState() {
    this.state = {
      features: [],
      getFillColor: {filterVals: []},
      z: 0
    };
  }

  // this layer add its subLayers to the redux store, and push sample data

  renderSubLayers(props) {
    return new GeoJsonLayer({
      ...props,
      data: props.data,
      filled: true,
      pickable: true,
      getElevation: feature => feature.properties.height || 0,
      //getPolygon: feature => feature.coordinates,
      getFillColor: [160, 160, 180]
    });
  }

  renderLayers() {
    console.log(MapboxGLMap.getMap());
    let tileLayer = new DeckGLTileLayer({
      getTileData: ({x, y, z}) => {
        const mapSource =
          `http://127.0.0.1:5009/pop_merged/` + `${z}/${x}/${y}` + `.pbf`;

        return fetch(mapSource)
          .then(response => response.arrayBuffer())
          .then(buffer => {
            let features = decodeTile(x, y, z, buffer);
            return features;
          });
      },
      visible: false,
      renderSubLayers: this.renderSubLayers.bind(this),
      updateTriggers: this.props.updateTriggers
    });

    return [tileLayer];
  }
}

function mapPropertyToValue(
  config,
  dataId,
  cScale,
  getEncodedChannelValue,
  colorField
) {
  return f => {
    if (config.length > 0) {
      for (var i = 0; i <= config.length - 1; i++) {
        if (dataId === config[i]['dataId']) {
          //const prop = f.properties[config.key];
          if (!f.hasOwnProperty('properties')) {
            return;
          }
          if (f.properties.hasOwnProperty(config[i].name)) {
            if (config[i].type == 'multiSelect') {
              for (let p = 0; p <= config[i].value.length - 1; p++) {
                if (f.properties[config[i].name] === config[i].value[p]) {
                  return [255, 255, 0];
                } else {
                  return [255, 255, 0, 0];
                }
              }
            } else if (config[i].type == 'range') {
              if (
                f.properties[config[i].name] > config[i].value[0] &&
                f.properties[config[i].name] < config[i].value[1]
              ) {
                return [0, 255, 255];
              } else {
                return [0, 255, 255, 255];
              }
            } else if (config[i].type == 'select') {
              if (f.properties[config[i].name] == config[i].value) {
                return [255, 0, 255];
              } else {
                return [255, 0, 255, 0];
              }
            }
            // else{
            //   return [128,128,128,0]
            // }
          }
        }
      }
    } else {
      return colorField
        ? getEncodedChannelValue(cScale, f.properties['Pincode'], colorField)
        : [255, 255, 0];
    }
  };
}
