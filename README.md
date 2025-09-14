# BigImage

## General information

A [Leaflet](http://www.leafletjs.com) plugin that allows users to download an image with a scaled-up version of the visible map.

### Features:
- Compatible with Leaflet v2+.
- Ability to export a larger area of the map without zooming in.
- Basic layers (markers, circles, polygons) are included in the exported image.
- Supports tile layers: OSM, MapBox, etc.

## Changelog

**14.12.2021**
- Added support for multilayer export.

**14.09.2025**
- Added support for Leaflet 2.0.

[//]: # (## Demo)

[//]: # ([Leaflet.BigImage]&#40;https://pasichnykvasyl.github.io/Leaflet.BigImage/&#41;)

## Downloads
**NPM**
```bash
npm install --save leaflet.bigimage
````

**CDN / Local (Leaflet 1.x)**
```html
<link rel="stylesheet" href="dist/Leaflet.BigImage.min.css">
<script src="dist/Leaflet.BigImage.min.js"></script>
```


## Usage

**Leaflet 2.x (ES Modules)**

``` js
    import { Map, TileLayer, Marker, Circle, Polygon } from 'leaflet';
    import { BigImageControl } from 'leaflet.bigimage';
    
    mymap.addControl(new BigImageControl({ position: 'topright' }));
```

**Options**
You can pass a number of options to the plugin to control various settings.
| Option              | Type   | Default         | Description                        |
| ------------------- | ------ | --------------- | ---------------------------------- |
| position            | String | 'topright'      | Position of the print button       |
| title               | String | 'Get image'     | Tooltip text of the control button |
| printControlLabel   | String | '⤵️'            | Icon of the control button         |
| printControlClasses | Array  | \[]             | CSS classes for the control button |
| maxScale            | Number | 10              | Maximum export image scale         |
| minScale            | Number | 1               | Minimum export image scale         |
| inputTitle          | String | 'Choose scale:' | Title above the scale input        |
| downloadTitle       | String | 'Download'      | Text on the download button        |
