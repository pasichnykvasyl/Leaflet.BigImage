/*
 Leaflet.BigImage (Leaflet 2.0+ compatible).
 (c) 2020 Vasyl Pasichnyk, updated 2025 for Leaflet v2.0

 Fully compatible with Leaflet 2.0:
 - Uses constructors instead of factory methods
 - Explicit imports (no global L object)
 - Native browser methods instead of Util methods
 - Modern ES6+ features and best practices
*/

import {
    Control,
    DomEvent,
    Marker,
    TileLayer,
    Circle,
    Path,
    Point,
    Bounds
} from 'leaflet';

export class BigImageControl extends Control {
    constructor(options = {}) {
        super(options);

        this.options = {
            position: 'topright',
            title: 'Get image',
            printControlLabel: '⤵️',
            printControlClasses: [],
            printControlTitle: 'Get image',
            _unicodeClass: 'bigimage-unicode-icon',
            maxScale: 10,
            minScale: 1,
            inputTitle: 'Choose scale:',
            downloadTitle: 'Download',
            exportFormat: 'png',
            fileName: 'mapExport',
            hideControlOnPrint: true,
            crossOrigin: 'anonymous',
            ...options
        };

        this.isProcessing = false;
        this.tilesImgs = {};
        this.markers = {};
        this.paths = {};
        this.circles = {};
    }

    onAdd(map) {
        this._map = map;
        return this._createControl();
    }

    onRemove() {
        this._cleanup();
    }

    _createControl() {
        const { printControlTitle, printControlLabel, printControlClasses, _unicodeClass } = this.options;

        let classes = [...printControlClasses];
        if (printControlLabel.includes('&') && !classes.includes(_unicodeClass)) {
            classes.push(_unicodeClass);
        }

        return this._buildControlStructure(printControlLabel, printControlTitle, classes);
    }

    _buildControlStructure(label, title, classesToAdd) {
        this._container = this._createElement('div', {
            id: 'print-container',
            className: 'leaflet-bar'
        });

        this._containerParams = this._createElement('div', {
            id: 'print-params',
            style: 'display: none;'
        });

        this._buildParametersPanel();
        this._buildControlButton(label, title, classesToAdd);
        this._buildLoader();

        this._container.appendChild(this._containerParams);

        DomEvent.disableScrollPropagation(this._container);
        DomEvent.disableClickPropagation(this._container);

        return this._container;
    }

    _buildParametersPanel() {
        const closeBtn = this._createElement('div', {
            className: 'close',
            innerHTML: '&times;'
        });

        closeBtn.addEventListener('click', () => this._hidePanel());
        this._containerParams.appendChild(closeBtn);

        const title = this._createElement('h6', {
            innerHTML: this.options.inputTitle
        });
        this._containerParams.appendChild(title);

        this._scaleInput = this._createElement('input', {
            type: 'number',
            value: this.options.minScale,
            min: this.options.minScale,
            max: this.options.maxScale,
            id: 'scale'
        });
        this._containerParams.appendChild(this._scaleInput);

        if (this.options.showFormatSelector !== false) {
            const formatLabel = this._createElement('label', {
                innerHTML: 'Format:'
            });

            const formatSelect = this._createElement('select', {
                id: 'format'
            });

            const formats = ['png', 'jpeg', 'webp'];
            formats.forEach(format => {
                const option = this._createElement('option', {
                    value: format,
                    innerHTML: format.toUpperCase(),
                    selected: format === this.options.exportFormat
                });
                formatSelect.appendChild(option);
            });

            this._formatSelect = formatSelect;
            this._containerParams.appendChild(formatLabel);
            this._containerParams.appendChild(formatSelect);
        }

        this._downloadBtn = this._createElement('div', {
            className: 'download-button',
            innerHTML: this.options.downloadTitle
        });

        this._downloadBtn.addEventListener('click', () => this._handleDownload());
        this._containerParams.appendChild(this._downloadBtn);
    }

    _buildControlButton(label, title, classesToAdd) {
        const controlPanel = this._createElement('a', {
            innerHTML: label,
            id: 'print-btn',
            title: title,
            href: '#',
        });

        classesToAdd.forEach(className => controlPanel.classList.add(className));

        DomEvent.on(controlPanel, 'click', this._showPanel, this);
        this._container.appendChild(controlPanel);
        this._controlPanel = controlPanel;
    }

    _buildLoader() {
        this._loader = this._createElement('div', {
            id: 'print-loading'
        });
        this._container.appendChild(this._loader);
    }

    _createElement(tag, attributes = {}) {
        const element = document.createElement(tag);

        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        return element;
    }

    _showPanel(e) {
        e.preventDefault();
        this._container.classList.add('leaflet-control-layers-expanded');
        this._containerParams.style.display = '';
        this._controlPanel.classList.add('bigimage-unicode-icon-disable');
    }

    _hidePanel() {
        this._container.classList.remove('leaflet-control-layers-expanded');
        this._containerParams.style.display = 'none';
        this._controlPanel.classList.remove('bigimage-unicode-icon-disable');
    }

    async _handleDownload() {
        if (this.isProcessing) return;

        const scaleValue = Number(this._scaleInput.value);
        if (!this._validateScale(scaleValue)) {
            this._scaleInput.value = this.options.minScale;
            return;
        }

        this.isProcessing = true;
        this._showProgress(true);

        try {
            await this._generateAndDownloadImage(scaleValue);
        } catch (error) {
            console.error('Error generating image:', error);
            alert('Error generating image. Please try again.');
        } finally {
            this.isProcessing = false;
            this._showProgress(false);
        }
    }

    _validateScale(scale) {
        return scale && scale >= this.options.minScale && scale <= this.options.maxScale;
    }

    _showProgress(show) {
        if (show) {
            this._containerParams.classList.add('print-disabled');
            this._loader.classList.add('show');
        } else {
            this._containerParams.classList.remove('print-disabled');
            this._loader.classList.remove('show');
        }
    }

    async _generateAndDownloadImage(scale) {

        this.tilesImgs = {};
        this.markers = {};
        this.paths = {};
        this.circles = {};

        const dimensions = this._map.getSize();
        this.zoom = this._map.getZoom();
        this.bounds = this._map.getPixelBounds();

        this.canvas = document.createElement('canvas');
        this.canvas.width = dimensions.x;
        this.canvas.height = dimensions.y;
        this.ctx = this.canvas.getContext('2d');

        this._applyScale(scale);

        await this._processLayers();
        await this._renderToCanvas();

        this._downloadCanvas();
    }

    _applyScale(scale) {
        if (!scale || scale <= 1) return;

        const addX = (this.bounds.max.x - this.bounds.min.x) / 2 * (scale - 1);
        const addY = (this.bounds.max.y - this.bounds.min.y) / 2 * (scale - 1);

        this.bounds.min.x -= addX;
        this.bounds.min.y -= addY;
        this.bounds.max.x += addX;
        this.bounds.max.y += addY;

        this.canvas.width *= scale;
        this.canvas.height *= scale;
    }

    async _processLayers() {
        const layerPromises = [];

        this._map.eachLayer(layer => {
            if (layer instanceof TileLayer) {
                layerPromises.push(this._processTileLayer(layer));
            } else if (layer instanceof Marker) {
                layerPromises.push(this._processMarker(layer));
            } else if (layer instanceof Circle) {
                this._processCircle(layer);
            } else if (layer instanceof Path) {
                this._processPath(layer);
            }
        });

        await Promise.allSettled(layerPromises);
    }

    async _processTileLayer(layer) {
        this.tilesImgs[layer._leaflet_id] = {};
        const tileSize = layer.options.tileSize || 256;

        const tileBounds = new Bounds(
          this.bounds.min.divideBy(tileSize)._floor(),
          this.bounds.max.divideBy(tileSize)._floor()
        );

        const tilePromises = [];

        for (let j = tileBounds.min.y; j <= tileBounds.max.y; j++) {
            for (let i = tileBounds.min.x; i <= tileBounds.max.x; i++) {
                if (j < 0) continue;

                const tilePoint = new Point(i, j);
                const originalTilePoint = tilePoint.clone();

                if (layer._adjustTilePoint) {
                    layer._adjustTilePoint(tilePoint);
                }

                const tilePos = originalTilePoint
                  .scaleBy(new Point(tileSize, tileSize))
                  .subtract(this.bounds.min);

                tilePromises.push(this._loadTile(tilePoint, tilePos, layer, tileSize));
            }
        }

        await Promise.allSettled(tilePromises);
    }

    async _loadTile(tilePoint, tilePos, layer, tileSize) {
        return new Promise((resolve) => {
            const imgIndex = `${tilePoint.x}:${tilePoint.y}:${this.zoom}`;
            const image = new Image();

            image.crossOrigin = this.options.crossOrigin;

            const timeout = setTimeout(() => {
                resolve();
            }, 10000);

            image.onload = () => {
                clearTimeout(timeout);
                this.tilesImgs[layer._leaflet_id][imgIndex] = {
                    img: image,
                    x: tilePos.x,
                    y: tilePos.y,
                    opacity: layer.options.opacity ?? 1,
                    tileSize
                };
                resolve();
            };

            image.onerror = () => {
                clearTimeout(timeout);
                resolve();
            };

            try {
                image.src = layer.getTileUrl(tilePoint);
            } catch (error) {
                clearTimeout(timeout);
                resolve();
            }
        });
    }

    async _processMarker(layer) {
        if (this.markers[layer._leaflet_id]) return;

        let pixelPoint = this._map.project(layer._latlng);
        pixelPoint = pixelPoint.subtract(new Point(this.bounds.min.x, this.bounds.min.y));

        const icon = layer.options.icon;
        if (icon?.options?.iconAnchor) {
            pixelPoint.x -= icon.options.iconAnchor[0];
            pixelPoint.y -= icon.options.iconAnchor[1];
        }

        if (this._isPointVisible(pixelPoint)) {
            if (layer._icon?.src) {
                await this._loadMarkerImage(layer, pixelPoint);
            } else if (layer._icon?.innerHTML && !layer._icon.src) {
                this.markers[layer._leaflet_id] = {
                    html: layer._icon.innerHTML,
                    x: pixelPoint.x,
                    y: pixelPoint.y
                };
            }
        }
    }

    async _loadMarkerImage(layer, pixelPoint) {
        return new Promise((resolve) => {
            const image = new Image();
            image.crossOrigin = this.options.crossOrigin;

            const timeout = setTimeout(resolve, 5000);

            image.onload = () => {
                clearTimeout(timeout);
                this.markers[layer._leaflet_id] = {
                    img: image,
                    x: pixelPoint.x,
                    y: pixelPoint.y
                };
                resolve();
            };

            image.onerror = () => {
                clearTimeout(timeout);
                resolve();
            };

            image.src = layer._icon.src;
        });
    }

    _processCircle(layer) {
        if (!this.circles[layer._leaflet_id]) {
            this.circles[layer._leaflet_id] = layer;
        }
    }

    _processPath(layer) {
        if (layer._mRadius || !layer._latlngs) return;

        const parts = [];
        let hasVisiblePoints = false;

        let latlngs = layer.options.fill ? layer._latlngs[0] : layer._latlngs;

        if (Array.isArray(latlngs[0])) {
            latlngs = latlngs.flat();
        }

        latlngs.forEach(latLng => {
            let pixelPoint = this._map.project(latLng);
            pixelPoint = pixelPoint.subtract(new Point(this.bounds.min.x, this.bounds.min.y));
            parts.push(pixelPoint);

            if (this._isPointVisible(pixelPoint)) {
                hasVisiblePoints = true;
            }
        });

        if (hasVisiblePoints) {
            this.paths[layer._leaflet_id] = {
                parts,
                closed: layer.options.fill,
                options: layer.options
            };
        }
    }

    _isPointVisible(point) {
        return point.x >= 0 && point.y >= 0 &&
          point.x <= this.canvas.width &&
          point.y <= this.canvas.height;
    }

    async _renderToCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this._renderTiles();

        this._renderPaths();

        this._renderMarkers();

        this._renderCircles();
    }

    _renderTiles() {
        Object.values(this.tilesImgs).forEach(layerTiles => {
            Object.values(layerTiles).forEach(tile => {
                this.ctx.globalAlpha = tile.opacity;
                this.ctx.drawImage(tile.img, tile.x, tile.y, tile.tileSize, tile.tileSize);
            });
        });
        this.ctx.globalAlpha = 1;
    }

    _renderPaths() {
        Object.values(this.paths).forEach(path => {
            this._drawPath(path);
        });
    }

    _renderMarkers() {
        Object.values(this.markers).forEach(marker => {
            if (marker.html) {
                this._drawText(marker);
            } else if (marker.img) {
                this.ctx.drawImage(marker.img, marker.x, marker.y);
            }
        });
    }

    _renderCircles() {
        Object.values(this.circles).forEach(circle => {
            this._drawCircle(circle);
        });
    }

    _drawPath(pathData) {
        const { parts, closed, options } = pathData;

        this.ctx.beginPath();
        parts.forEach((point, index) => {
            this.ctx[index === 0 ? 'moveTo' : 'lineTo'](point.x, point.y);
        });

        if (closed) this.ctx.closePath();
        this._applyPathStyle(options);
    }

    _drawText(marker) {
        const previousFillStyle = this.ctx.fillStyle;
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'black';
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;

        this.ctx.strokeText(marker.html, marker.x, marker.y);
        this.ctx.fillText(marker.html, marker.x, marker.y);

        this.ctx.fillStyle = previousFillStyle;
    }

    _drawCircle(layer) {
        if (layer._empty && layer._empty()) return;

        let point = this._map.project(layer._latlng);
        point = point.subtract(new Point(this.bounds.min.x, this.bounds.min.y));

        const r = Math.max(Math.round(layer._radius), 1);
        const s = (Math.max(Math.round(layer._radiusY), 1) || r) / r;

        if (s !== 1) {
            this.ctx.save();
            this.ctx.scale(1, s);
        }

        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y / s, r, 0, Math.PI * 2, false);

        if (s !== 1) this.ctx.restore();

        this._applyPathStyle(layer.options);
    }

    _applyPathStyle(options) {
        if (options.fill) {
            this.ctx.globalAlpha = options.fillOpacity ?? 0.2;
            this.ctx.fillStyle = options.fillColor || options.color || '#3388ff';
            this.ctx.fill(options.fillRule || 'evenodd');
        }

        if (options.stroke !== false && (options.weight ?? 3) !== 0) {
            if (this.ctx.setLineDash) {
                this.ctx.setLineDash(options.dashArray || []);
            }
            this.ctx.globalAlpha = options.opacity ?? 1;
            this.ctx.lineWidth = options.weight ?? 3;
            this.ctx.strokeStyle = options.color || '#3388ff';
            this.ctx.lineCap = options.lineCap || 'round';
            this.ctx.lineJoin = options.lineJoin || 'round';
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1;
    }

    _downloadCanvas() {
        const format = this._formatSelect ? this._formatSelect.value : this.options.exportFormat;
        const mimeType = `image/${format}`;
        const quality = format === 'jpeg' ? 0.92 : undefined;

        this.canvas.toBlob(blob => {
            if (!blob) {
                alert('Failed to generate image');
                return;
            }

            const link = document.createElement('a');
            link.download = `${this.options.fileName}.${format}`;
            link.href = URL.createObjectURL(blob);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(link.href);
        }, mimeType, quality);
    }

    _cleanup() {
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
    }
}