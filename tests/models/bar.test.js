/**

Tests for bar model.
 
@author <bprinty@gmail.com>
*/

describe("bar.js", function () {

  var base = null;
  var data = null;
  var textdata = null;
  before(function() {
      // config
      quorra.debug = false;

      // simulate data
      function layerup(n, o) {
          function bump(a) {
              var x = 1 / (.1 + quorra.random()),
                  y = 2 * quorra.random() - .5,
                  z = 10 / (.1 + quorra.random());
              for (var i = 0; i < n; i++) {
                  var w = (i / n - y) * z;
                  a[i] += x * Math.exp(-w * w);
              }
          }
          var a = [], i;
          for (i = 0; i < n; ++i) a[i] = o + o * quorra.random();
          for (i = 0; i < 5; ++i) bump(a);
          return a.map(function(d, i) { return {
              x: i,
              y: Math.max(0, d),
          }; });
      }
      var groups = 2;
      var samples = 20;
      var stack = d3.layout.stack();
      var layerdata = stack(d3.range(groups).map(function() { return layerup(samples, 0.1); }));
      data = [];
      for (var layer in layerdata) {
          data = data.concat(_.map(layerdata[layer], function(d, i){
              return {
                  x: d.x,
                  y: d.y,
                  group: (layer == 1) ? 'Good': 'Evil',
                  label: (layer == 1) ? ('Good' + i): ('Evil' + i)
              };
          }));
      }

      // simulate text data
      var entries = 3;
      var groups = 2;
      x = _.range(entries*groups).map(function(d) { return 'Type' + (d % entries); });
      y = _.range(entries*groups).map(function(d) { return quorra.random() * 100; });
      group = _.range(entries*groups).map(function(d) {
          return ['Foo', 'Bar'][(d % groups)];
      });
      textdata = [];
      for(var i=0; i<x.length; i++){
          textdata.push({
              x: x[i],
              y: y[i],
              group: group[i]
          });
      }

      // set up selection
      base = bind('bar.js');
  });

  after(function() {
      reorder(base);
      if (this.currentTest.state == 'failed') {
          takeScreenshot();
      }
  });

  it("grouped", function () {
    
    var id = quorra.uuid();
    base.append('div').attr('id', id).attr('class', 'plotarea');

    var grouped = quorra.bar()
        .bind('#' + id)
        .id(id)
        .data(data)
        .grid(true)
        .zoomable(true)
        .exportable(true)
        .crosshairs(true)
        .opacity(0.75)
        .labelposition("end")
        .layout('grouped')
        .xlabel("X Axis Label")
        .ylabel("Y Axis Label")
        .color(['firebrick', 'steelblue']);

    quorra.render(grouped);

    checkplot(id);
    checkaxis(id);
    checkglyphs(id);
  });

  it("stacked", function () {
    
    var id = quorra.uuid();
    base.append('div').attr('id', id).attr('class', 'plotarea');

    var stacked = quorra.bar()
        .bind('#' + id)
        .id(id)
        .data(data)
        .opacity(0.75)
        .lposition("outside")
        .lshape("circle")
        .zoomable(true)
        .exportable(true)
        .crosshairs(true)
        .layout('stacked')
        .xlabel("X Axis Label")
        .ylabel("Y Axis Label")
        .color(['firebrick', 'steelblue']);


    quorra.render(stacked);

    checkplot(id);
    checkaxis(id);
    checkglyphs(id);
  });

  it("textgrouped", function () {
    
    var id = quorra.uuid();
    base.append('div').attr('id', id).attr('class', 'plotarea');

    var text = quorra.bar()
        .bind('#' + id)
        .id(id)
        .data(textdata)
        .opacity(0.75)
        .yrange([0, 100])
        .lposition("outside")
        .lshape("circle")
        .zoomable(true)
        .exportable(true)
        .crosshairs(true)
        .layout('grouped')
        .xlabel("X Axis Label")
        .ylabel("Y Axis Label")
        .color(['firebrick', 'steelblue']);

    quorra.render(text);

    checkplot(id);
    checkaxis(id);
    checkglyphs(id);
  });

  it("textstacked", function () {
    
    var id = quorra.uuid();
    base.append('div').attr('id', id).attr('class', 'plotarea');

    var text = quorra.bar()
        .bind('#' + id)
        .id(id)
        .data(textdata)
        .opacity(0.75)
        .yrange([0, 100])
        .lposition("outside")
        .lshape("circle")
        .zoomable(true)
        .exportable(true)
        .crosshairs(true)
        .layout('stacked')
        .xlabel("X Axis Label")
        .ylabel("Y Axis Label")
        .color(['firebrick', 'steelblue']);

    quorra.render(text);

    checkplot(id);
    checkaxis(id);
    checkglyphs(id);
  });

});