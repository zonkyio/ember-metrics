/* jshint node: true */
'use strict';

var Funnel = require('broccoli-funnel');
var path = require('path');

function normalize(name) {
  if (typeof name === 'string') {
    name = path.basename(name, '.js');

    return name.replace(/([a-z](?=[A-Z]))/g, '$1-').toLowerCase();
  }
}

function uniqueStrings(arr) {
  var out = [];
  var dict = {};

  for (var i=0;i<arr.length;i++) {
    var obj = arr[i];

    if (typeof obj === 'string' && !dict[obj]) {
      out.push(obj);
      dict[obj] = true;
    }
  }

  return out;
}

function getEach(arr, propName) {
  var out = [];

  for (var i=0;i<arr.length;i++) {
    var obj = arr[i];

    if (typeof obj === 'object' && obj[propName]) {
      out.push(obj[propName]);
    }
  }

  return out;
}

module.exports = {
  name: 'ember-metrics',

  included: function(app) {
    this._super.included.apply(this, arguments);

    var config = this.app.project.config(app.env) || {};
    var addonConfig = config[this.name] || {};
    var discovered = ['base'];

    if (addonConfig.includeAdapters) {
      discovered = discovered.concat(addonConfig.includeAdapters);
    }

    if (config.metricsAdapters) {
      discovered = discovered.concat(getEach(config.metricsAdapters, 'name'));
    }

    this.whitelisted = uniqueStrings(discovered.map(normalize));
  },

  treeForAddon: function() {
    // see: https://github.com/ember-cli/ember-cli/issues/4463
    var tree = this._super.treeForAddon.apply(this, arguments);

    return this.filterAdapters(tree, new RegExp('^modules\/' + this.name + '\/metrics\-adapters\/', 'i'));
  },

  filterAdapters: function(tree, regex) {
    var whitelisted = this.whitelisted;

    return new Funnel(tree, {
      exclude: [function(name) {
        return regex.test(name) && whitelisted.indexOf(path.basename(name, '.js')) === -1;
      }]
    });
  },

  contentFor: function(type, config) {
    var adapters = config.metricsAdapters || [];
    var gtm = config.metricsAdapters.filter(item => item.name === 'GoogleTagManager')[0];

    if (!gtm) {
      return;
    }

    if (type === 'head') {
      return `
        <!-- Google Tag Manager -->
        <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtm.config.id}');</script>
        <!-- End Google Tag Manager -->
      `;
    }

    if (type === 'body') {
      return `
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtm.config.id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
      `;
    }
  }
};
