/**

Tests for bar model.
 
@author <bprinty@gmail.com>
*/

describe("bar.js", function () {

  var base = null;
  var data = null;
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

      // set up selection
      base = bind('bar.js');
  });

  after(function() {
      reorder(base);
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
        .layout('stacked')
        .xlabel("X Axis Label")
        .ylabel("Y Axis Label")
        .color(['firebrick', 'steelblue']);


    quorra.render(stacked);

    checkplot(id);
    checkaxis(id);
    checkglyphs(id);
  });

});