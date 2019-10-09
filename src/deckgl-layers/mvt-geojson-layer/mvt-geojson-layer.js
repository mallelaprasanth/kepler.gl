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

import { CompositeLayer ,LayerExtension} from '@deck.gl/core';
import { TileLayer as DeckGLTileLayer } from '@deck.gl/geo-layers';
import { GeoJsonLayer } from '@deck.gl/layers';
import Protobuf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';
import { DataFilterExtension } from '@deck.gl/extensions';

class RedFilter extends LayerExtension {
  
  
  getShaders() {
    return {
      inject: {
        // Declare custom uniform
        'fs:#decl': 'uniform bool highlightRed;uniform float redThreshold;attribute string Population',
        // Standard injection hook - see "Writing Shaders"
        'fs:DECKGL_FILTER_COLOR': `
          if (highlightRed) {
            if (Population>redThreshold) {
              // is red
              color = vec4(1.0, 0.0, 0.0, 1.0);
            } else {
              discard;
            }
          }
        `
      }
    };
  }
  
  updateState(params) {
    const {highlightRed = true,redThreshold = 400,Population="Population"} = params.props;
    for (const model of this.getModels()) {
      model.setUniforms({highlightRed, redThreshold,Population});
    }
  }
  
  getSubLayerProps() {
    let params = {props:{highlightRed : true,redThreshold : 400,Population:"Population"}}
    const {highlightRed = true,redThreshold = 400,Population="Population"} = params.props;
    return {
      highlightRed, redThreshold,Population
    };
  }
}



export default class DeckGLMVTLayer extends CompositeLayer {
  initialiseState() {
    this.state = {
      features: [],
      filterVals: [0, 630]
    }
  }


  // updateState({ props, changeFlags }) {
  //   console.log(changeFlags);
  //   console.log(props);
  //   if (!changeFlags.stateChanged) {
  //     return;
  //   }

  //   // this.setState({features: newFeatures});

  // }

  // this layer add its subLayers to the redux store, and push sample data

  renderSubLayers(props) {

    let newGLayer = new GeoJsonLayer({
      ...props,
      allData: props.data,
      featData: props.data,
      extruded: true,
      opacity: 1,
      filled: true,
      lineWidthScale: 20,
      lineWidthMinPixels: 2,
      getElevation: (feature) => feature.properties.height || 0,
      getPolygon: (feature) => { if (feature.properties.Population > 90) return feature },
      getFillColor: [255, 255, 255],
      lightSetting: {
        ambientRatio: 0.2
      },
      getPosition: d => d.position,
      pickable: true,

      onHover: info => console.log('geojson layer hovered', info.object),
      onClick: info => console.log('geojson layer clicked', info.object)
    });
    return newGLayer;
  }

  renderLayers() {

    let tileLayer = new DeckGLTileLayer({
      visible: false,
      maxCacheSize: 0,
      onViewportLoaded: (data) => {
        if (data.length > 0) {
          let finalData = []
          for (var i = 0; i < data.length - 1; i++) {
            finalData = finalData.concat(data[i]);
          }
          this.setState({ features: finalData });
          this.props.loadEDLinkData({ "type": "FeatureCollection", "features": finalData, "crs": { "type": "name", "properties": "urn:ogc:def:crs:OGC:1.3:CRS84" } }, this.props.url)
        }

      },
      getTileData: ({ x, y, z }) => {
        const mapSource = `https://api.mapbox.com/v4/tusheet.7qjwz70j/` + `${z}/${x}/${y}` + `.mvt?access_token=pk.eyJ1IjoidHVzaGVldCIsImEiOiJjamd3c2Jwdm0xZDJmMndwZGU1OHdvY2prIn0.YwS7ngyYFXDnRYodIV0J4Q`;
         //const mapSource = `https://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v7/`+`${z}/${x}/${y}` + `.vector.pbf?access_token=pk.eyJ1IjoidHVzaGVldCIsImEiOiJjamd3c2Jwdm0xZDJmMndwZGU1OHdvY2prIn0.YwS7ngyYFXDnRYodIV0J4Q`;
        return fetch(mapSource)
          .then(response => response.arrayBuffer())
          .then(buffer => {
            const tile = new VectorTile(new Protobuf(buffer));
            let features = [];
            for (const layerName in tile.layers) {
              const vectorTileLayer = tile.layers[layerName];
              for (let i = 0; i < vectorTileLayer.length; i++) {
                const vectorTileFeature = vectorTileLayer.feature(i);

                if (this.props.filters.length > 0) {
                  let filter = this.props.filters[0];
                  const feature = vectorTileFeature.toGeoJSON(x, y, z);
                  if (filter.type == 'range') {
                    if (vectorTileFeature.properties[filter.name] > filter.value[0] &&
                      vectorTileFeature.properties[filter.name] < filter.value[1]) {
                      const feature = vectorTileFeature.toGeoJSON(x, y, z);
                      features.push(feature);
                    }
                  }

                  continue;
                }
                else {
                  const feature = vectorTileFeature.toGeoJSON(x, y, z);
                  features.push(feature);
                }
                // if (this.props.filterMVT !== '') {

                //   if (vectorTileFeature.properties[this.props.filterMVT["field"]] > this.props.filterMVT['values'][0] &&
                //     vectorTileFeature.properties[this.props.filterMVT["field"]] < this.props.filterMVT['values'][1]) {
                //     const feature = vectorTileFeature.toGeoJSON(x, y, z);
                //     features.push(feature);

                //   }
                //   continue
                // }
                // else {

                // }
              }
            }
            return features;
          });
      },
      // minZoom: 10,
      // renderSubLayers: this.renderSubLayers.bind(this),
      // updateTriggers: this.props.updateTriggers
    });
    let popVal = 90;
    let newGLayer = new GeoJsonLayer({
      allData: this.state.features,
      data: this.state.features,
      parameters: { depthMask: false },
      extruded: true,
      opacity: 1,
      filled: true,
      lineWidthScale: 20,
      lineWidthMinPixels: 2,
      getElevation: (feature) => feature.properties.height || 0,
      getPolygon: (feature) => {
        if (feature.properties.Population > 90) { return feature; }
        else {
          return [];
        }
      },
      getFillColor: f => f.properties.Population > popVal ? [255, 0, 0] : [0, 0, 0, 0],
      updateTriggers: {
        getFillColor: popVal
      },
      lightSetting: {
        ambientRatio: 0.2
      },
      getPosition: d => d.position,
      pickable: true,
      autoHighlight: true,
      //getFilterValue: d => [d.properties.Population],
      onHover: info => console.log('geojson layer hovered', info.object),
      onClick: info => console.log('geojson layer clicked', info.object)
      // filterRange: this.state.filterVals,
      // filterSoftRange: [0.2, 0.8],
      // filterTransformSize: true,
      // filterTransformColor: true,
      //extensions: [new DataFilterExtension({ filterSize: 1 })]
      // highlightRed:true,
      // redThreshold:400,
      // Population:"Population",
      // extensions:[new RedFilter()]
    });
    let test = this.props.filters;
    let value = []
    if (test.length > 0) {
      if (test[0].value !== null) {
        if (test[0].value.length > 0) {
          value = test[0].value;
          this.setState({ filterVals: value });
          // newGLayer.props.filterRange = value;
          // newGLayer.props.extensions = [new DataFilterExtension({ filterSize: 1 })];
        }
      }
    }
    return [
      tileLayer, newGLayer
    ];
  }
}


