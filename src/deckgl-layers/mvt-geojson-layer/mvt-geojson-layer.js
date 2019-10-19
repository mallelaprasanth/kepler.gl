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
import {GeoJsonLayer} from '@deck.gl/layers';
import Protobuf from 'pbf';
import {VectorTile} from '@mapbox/vector-tile';
import {DataFilterExtension} from '@deck.gl/extensions';

const gProps = {
  getFillColor: {
    key: 'Population',
    operation: '>',
    values: {'50': [128, 128, 128], default: [0, 0, 0, 0]}
  }
};

class RedFilter extends LayerExtension {
  getShaders() {
    return {
      inject: {
        // Declare custom uniform
        'fs:#decl':
          'uniform bool highlightRed;uniform float redThreshold;attribute string Population',
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
    const {
      highlightRed = true,
      redThreshold = 400,
      Population = 'Population'
    } = params.props;
    for (const model of this.getModels()) {
      model.setUniforms({highlightRed, redThreshold, Population});
    }
  }

  getSubLayerProps() {
    let params = {
      props: {highlightRed: true, redThreshold: 400, Population: 'Population'}
    };
    const {
      highlightRed = true,
      redThreshold = 400,
      Population = 'Population'
    } = params.props;
    return {
      highlightRed,
      redThreshold,
      Population
    };
  }
}

const colorRange = {
  colors: ['#12939A', '#DDB27C', '#88572C', '#FF991F', '#F15C17']
};

export default class DeckGLMVTLayer extends CompositeLayer {
  initialiseState() {
    this.state = {
      features: [],
      getFillColor: {filterVals: [0, 630]}
    };
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
  renderLayers() {
    let tileLayer = new DeckGLTileLayer({
      visible: false,
      maxCacheSize: 0,
      onViewportLoaded: data => {
        if (data.length > 0) {
          let finalData = [];
          for (var i = 0; i < data.length - 1; i++) {
            finalData = finalData.concat(data[i]);
          }
          this.setState({features: finalData});
          if (finalData.length > 0) {
            this.props.loadEDLinkData(
              {
                type: 'FeatureCollection',
                features: finalData,
                crs: {type: 'name', properties: 'urn:ogc:def:crs:OGC:1.3:CRS84'}
              },
              this.props.url
            );
          }
        }
      },
      getTileData: ({x, y, z}) => {
        // const mapSource =
        // `https://vectortiledata.s3.ap-south-1.amazonaws.com/` +
        // `${z}/${x}/${y}` +
        // `.pbf`;
        const mapSource =
          `http://127.0.0.1:5009/tiles25/` + `${z}/${x}/${y}` + `.pbf`;
        // const mapSource =
        //   `https://api.mapbox.com/v4/tusheet.7qjwz70j/` +
        //   `${z}/${x}/${y}` +
        //   `.mvt?access_token=pk.eyJ1IjoidHVzaGVldCIsImEiOiJjamd3c2Jwdm0xZDJmMndwZGU1OHdvY2prIn0.YwS7ngyYFXDnRYodIV0J4Q`;
        //const mapSource = `https://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v7/`+`${z}/${x}/${y}` + `.vector.pbf?access_token=pk.eyJ1IjoidHVzaGVldCIsImEiOiJjamd3c2Jwdm0xZDJmMndwZGU1OHdvY2prIn0.YwS7ngyYFXDnRYodIV0J4Q`;
        return fetch(mapSource)
          .then(response => response.arrayBuffer())
          .then(buffer => {
            const tile = new VectorTile(new Protobuf(buffer));
            let features = [];
            for (const layerName in tile.layers) {
              const vectorTileLayer = tile.layers[layerName];
              for (let k = 0; k < vectorTileLayer.length; k++) {
                const vectorTileFeature = vectorTileLayer.feature(k);
                const feature = vectorTileFeature.toGeoJSON(x, y, z);

                let config = this.props.filters;
                if (config.length === 0) {
                  features.push(feature);
                  continue;
                }
                for (var i = 0; i <= config.length - 1; i++) {
                  if (this.props.url === config[i]['dataId']) {
                    //const prop = f.properties[config.key];
                    // if (!f.hasOwnProperty('properties')) {
                    //   return
                    // }
                    if (f.propertiesl.hasOwnProperty(config[i].name)) {
                      if (config[i].type == 'multiSelect') {
                        for (let p = 0; p <= config[i].value.length - 1; p++) {
                          if (
                            f.properties[config[i].name] === config[i].value[p]
                          ) {
                            features.push(feature);
                          }
                        }
                      } else if (config[i].type == 'range') {
                        if (
                          f.properties[config[i].name] > config[i].value[0] &&
                          f.properties[config[i].name] < config[i].value[1]
                        ) {
                          features.push(feature);
                        }
                      } else if (config[i].type == 'select') {
                        if (f.properties[config[i].name] == config[i].value) {
                          features.push(feature);
                        }
                      }
                      // else{
                      //   return [128,128,128,0]
                      // }
                    }
                  }
                }
              }
            }
            return features;
          });
      }
      // minZoom: 10,
      // renderSubLayers: this.renderSubLayers.bind(this),
      // updateTriggers: this.props.updateTriggers
    });
    let popVal = 90;
    let newGLayer = new GeoJsonLayer({
      allData: this.state.features,
      data: this.state.features,
      parameters: {depthMask: false},
      extruded: true,
      opacity: 1,
      filled: true,
      lineWidthScale: 1,
      lineWidthMinPixels: 2,
      getElevation: feature => feature.properties.height || 0,
      // getFillColor: [160, 160, 180, 200],
      // getLineColor: [255, 128, 75],
      // getRadius: 40,
      getFillColor: mapPropertyToValue(
        this.props.filters,
        this.props.url,
        this.props.cScale,
        this.props.getEncodedChannelValue,
        this.props.colorField
      ),
      updateTriggers: {
        getFillColor: this.state.getFillColor
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
      //extensions:[new RedFilter()]
    });
    let test = this.props.filters;
    let value = [];
    if (test.length > 0) {
      if (test[0].value !== null) {
        if (test[0].value.length > 0) {
          value = test[0].value;
          this.setState({getFillColor: {filterVals: value}});
          // newGLayer.props.filterRange = value;
          // newGLayer.props.extensions = [new DataFilterExtension({ filterSize: 1 })];
        }
      }
    }
    return [tileLayer, newGLayer];
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
