import * as L from 'leaflet';

export const CustomIcon = L.Icon.extend({
  options: {
    nativeElement: null,
  },
  
  createIcon: function (oldIcon) {
    const element = this.options.nativeElement;
    const div = document.createElement('div');
    this._setIconStyles(div, 'icon');
    div.appendChild(element);
    
    return div;
  },
  
  createShadow: function () {
    return null;
  }
});
