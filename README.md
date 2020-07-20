# BigImage

## General information

A [leaflet](http://www.leafletjs.com) plugin that allows users to receive a map as an Big image and donwload it.
* Opportunities:
  - Compatible with Leaflet v1+.
  - The ability to increase the area of the map without increasing.
  - Simple layers will show on image.
  - Tiles ssupport: OSM, MapBox, etc.
  
## Demo
[Leaflet.BigImage](https://pasichnykvasyl.github.io/Leaflet.BigImage/)

## Usage

**Step 1.** Include the required js and css files in your document.

```html
  <link rel="stylesheet" href="dist/Leaflet.BigImage.css">
  <script src="dist/Leaflet.BigImage.js"></script>
```

**Step 2.** Add the following line of code to your map script

``` js
	L.control.BigImage().addTo(mymap);
```

**Step 3.**
You can pass a number of options to the plugin to control various settings.
| Option              | Type         | Default      | Description   |
| --------------------|--------------|--------------|---------------|
| position            | String       | 'topright'   | Position the print button |
| title               | String       | 'Get image'  | Sets the text which appears as the tooltip of the control button |
| printControlLabel   | String       | '&#128438;'  | Sets icon to the control button |
| printControlClasses | Array        | []           | Sets classes to the control button |
| maxScale            | Int          | 10           | Max image scale |
| minScale            | Int          | 1            | Min image scale |
| inputTitle          | String       | 'Choose scale:'  | Title before scale input |
| downloadTitle       | String       | 'Download'  | Text on the download button |
