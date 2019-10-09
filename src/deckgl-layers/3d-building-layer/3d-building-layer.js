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

import { CompositeLayer } from '@deck.gl/core';
import { TileLayer as DeckGLTileLayer } from '@deck.gl/geo-layers';
import { getTileData } from './3d-building-utils';
import { GeoJsonLayer } from '@deck.gl/layers';
import Protobuf from 'pbf';
import {VectorTile, VectorTileFeature} from '@mapbox/vector-tile';
import {worldToLngLat} from 'viewport-mercator-project';

export default class ThreeDBuildingLayer extends CompositeLayer {
  // this layer add its subLayers to the redux store, and push sample data

  renderSubLayers(props) {
    return new GeoJsonLayer({
      ...props,

      extruded: true,
      opacity: 1,
      filled: true,
      lineWidthScale: 20,
      lineWidthMinPixels: 2,
      getElevation: (feature) => feature.properties.height || 0,
      // getPolygon: (feature) => feature.coordinates,
      getFillColor: this.props.threeDBuildingColor,
      lightSetting: {
        ambientRatio: 0.2
      }
    });
  }
  
  renderLayers() {
    return [
      new DeckGLTileLayer({
        getTileData: ({x, y, z}) => {
          const mapSource = `https://api.mapbox.com/v4/tusheet.7qjwz70j/${z}/${x}/${y}.mvt?access_token=${this.props.mapboxApiAccessToken}`;
          return fetch(mapSource)
            .then(response => response.arrayBuffer())
            .then(buffer => {
              const tile = new VectorTile(new Protobuf(buffer));
              const features = [];
              for (const layerName in tile.layers) {
                const vectorTileLayer = tile.layers[layerName];
                for (let i = 0; i < vectorTileLayer.length; i++) {
                  const vectorTileFeature = vectorTileLayer.feature(i);
                  const feature = vectorTileFeature.toGeoJSON(x, y, z);
                  features.push(feature);
                }
              }
              return features;
            });
        },
        minZoom: 13,
        renderSubLayers: this.renderSubLayers.bind(this),
        updateTriggers: this.props.updateTriggers
      })
    ];
  }
}
