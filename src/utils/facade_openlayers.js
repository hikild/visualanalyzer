//import 'ol/ol.css';
import 'ol-popup/src/ol-popup.css';
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
//import OSM from 'ol/source/XYZ'
import TileImage from 'ol/source/TileImage'
import ImageLayer from 'ol/layer/Image'
import ImageWMS from 'ol/source/ImageWMS'
import Vector from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import VectorLayer from 'ol/layer/Vector'
import  Style from 'ol/style/Style'
import  Icon from 'ol/style/Icon'
import Overlay from 'ol/Overlay';
import WMSCapabilities from 'ol/format/WMSCapabilities'
//import {transformExtent} from 'ol/proj'
import Stroke from 'ol/style/Stroke'
import Graticule from 'ol/Graticule'
import axios from 'axios';
import { WMSCapabilityLayer} from './LayerResource'
import {toStringHDMS} from 'ol/coordinate';
import Popup from 'ol-popup';
import { transform } from 'ol/proj';
import {request} from './requests';
export class FacadeOL {
    constructor(id_map='map', coordinates_center=[-4331024.58685793, -1976355.8033415168], a_zoom_value = 4, a_baseLayer_name='OSM' ) {
      this.map = new Map({ target: id_map});
      this.view = new View({ center: coordinates_center, zoom: a_zoom_value});
      this.map.setView(this.view);
      this.currentBaseLayer = this.osmBaseLayer();
      this.currentBaseLayerName = 'OSM';
      this.map.addLayer(this.currentBaseLayer);
      //this.popup =  new Overlay({element: document.getElementById('popup')});
      this.popup = new Popup();
      this.map.addOverlay(this.popup);
      this.onClickMap()
      
    }
    // Begins - These operations are related to the baselayer
    //return a null base layer
    nullBaseLayer() {
      return null
    }
    //returns a OSM TileLayer as baselayer
    osmBaseLayer() {
        return new TileLayer({ source: new XYZ({url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'}), zIndex: 0 })
    }
    //returns a google TileLayer as baselayer
    googleBaseLayer() {
      return new TileLayer({source: new XYZ({url: 'http://mt{0-3}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'}), zIndex: 0})
    }
    //returns a google satelite TileLayer as baselayer
    sateliteBaseLayer() {
      return new TileLayer({source: new TileImage({ url: 'http://mt1.google.com/vt/lyrs=s&hl=pl&&x={x}&y={y}&z={z}'}), zIndex: 0})
    }
    //returns a water TileLayer as baselayer
    watercolorBaseLayer() {
      return new TileLayer({source: new XYZ({url: 'http://{a-c}.tile.stamen.com/watercolor/{z}/{x}/{y}.png'}), zIndex: 0})
    }
    //returns wikimedia TileLayer as baselayer
    wikimediaBaseLayer() {
      return new TileLayer({source: new XYZ({url: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png'}), zIndex: 0})
    }
    //returns a TileLayer based on name(a_baseLayer_name) or null
    baseLayer(a_baseLayer_name) {
      // name: 'Wikimedia', value: 'wikimedia'}, {name: 'Nenhum', value: null}]
      const layers = {
          'OSM': this.osmBaseLayer(),
          'google': this.googleBaseLayer() ,
          'satelite': this.sateliteBaseLayer(),
          'watercolor': this.watercolorBaseLayer(),
          'wikimedia': this.wikimediaBaseLayer(),
          null: this.nullBaseLayer(),
          '': this.nullBaseLayer(),
          
        }
      return layers[a_baseLayer_name]
    }
    setBaseLayer(a_baseLayer_name) {
      this.map.removeLayer(this.currentBaseLayer)
      if (!a_baseLayer_name)
        return
      this.currentBaseLayer = this.baseLayer(a_baseLayer_name)
      this.currentBaseLayerName = a_baseLayer_name 
      this.map.addLayer(this.currentBaseLayer)
      this.currentBaseLayer.setZIndex(0);
    }
    // Ends - These operations above are related to the baselayer
    // Begins - These operations are related to the WMS
    getWMSCapabilitiesAsJSON(resquestedXml) {
      let  parser = new WMSCapabilities()
      return parser.read(resquestedXml)
    }
    getWMSCapabilityLayers(requestedXml) {
      let capability_json = this.getWMSCapabilitiesAsJSON(requestedXml)
      let layers = capability_json.Capability.Layer.Layer
      
      return layers.map((a_layer) => new WMSCapabilityLayer(a_layer, capability_json.version, capability_json.Service.OnlineResource))
    }
    getWMSMap(wmsLayer) {
      let wmsSource = new ImageWMS({url: wmsLayer.entryPoint +'/wms', params: {'LAYERS': wmsLayer.name}})
      return new ImageLayer({extent: wmsLayer.bbox, source: wmsSource})
    }
    addWMSLayer(wmsLayer) {
      let image_layer = this.getWMSMap(wmsLayer)
      this.map.addLayer(image_layer)
      wmsLayer.layer = image_layer
      return wmsLayer
    }
    removeWMSLayer(wmsLayer) {
      this.map.removeLayer(wmsLayer.olLayer)
      wmsLayer.olLayer = null
    }
    // End - These operations above are related to the WMS
    // Begin - some affordance of OL
    showGraticule(color='rgba(255,120,0,0.9)', width=2, lineDash=[0.5, 4], showLabels=true) {
      let strokeStyle = new Stroke({ color: color, width: width, lineDash: lineDash })
      let graticule = new Graticule({ strokeStyle: strokeStyle, showLabels: showLabels})
      graticule.setMap(this.map)
    }
    
     //End -Affordances
    // Begin - events
    displayFeatureInfo(evt, feature, layer) {
        let prettyCoord = toStringHDMS(transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326'), 2);
                
        if (feature) {
          let str = ''
          const entries = Object.entries(feature.values_)  
          entries.forEach(entry => {
            let key = entry[0];
            let value = entry[1];
            console.log(typeof value)

          })
          entries.forEach(entry => {
            let key = entry[0];
            let value = entry[1];
            if ((typeof key) != 'geometry' && (typeof value != 'object'))
              str += '<p>' + key + ': ' + value + '</p>'    
          })
          
          this.popup.show(evt.coordinate, '<div><h2>Coordinates</h2><p>' + prettyCoord + '</p>' + str+ '</div>')
        } else
          this.popup.show(evt.coordinate, '<div><h2>Coordinates</h2><p>' + prettyCoord + '</p></div>')

    }

    onClickMap() {
      this.map.on('singleclick', (evt)=> {
        let layer = null
        let feature = this.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) { return feature})  
        this.displayFeatureInfo(evt, feature, layer)
        
      })
    }
    // End - events

    // Begin  -  HyperResource related operations
    //createHyperResourceLayer(name, iri) {
    //  return new HyperResourceLayer(name, iri);
    //}
    async addVectorLayerFromGeoJSON(geoJson, style_iri) {
      let style = null
      
       try { 
          if (style_iri) {
            let response = await request(style_iri)
            style = await new Style({ image: new Icon({src: response.data})});
          }
            
        } catch (e) {
       
          console.log("Houve algum erro durante a requisição. ");
          console.log(style_iri);
          console.log(e);
      } finally {
          const gjson_format = new GeoJSON().readFeatures(geoJson, {featureProjection: this.map.getView().getProjection()})
          const vector_source = new Vector({features: gjson_format})
          const vector_layer = new VectorLayer({ renderMode: 'image', source: vector_source })
          if (style)
            vector_layer.setStyle(style)
          this.map.addLayer(vector_layer)
          return vector_layer
      }
    }
    async addHyperResourceLayer(a_HyperResourceLayer) {
      let resp_get
      try {
         resp_get = await axios.get(a_HyperResourceLayer.iri)
      }
      catch(err) {
        console.log('Houve algum erro na requisição. ', err)
      }
      const gjson_format = new GeoJSON().readFeatures(resp_get.data, {featureProjection: this.map.getView().getProjection()})
      const vector_source = new Vector({features: gjson_format})
      const vector_layer = new VectorLayer({ source: vector_source })
      this.map.addLayer(vector_layer)

    }
    removeHyperResourceLayer(a_HyperResourceLayer) {}
    // End  - These operations are related to the HyperResource
}
