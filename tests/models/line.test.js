/**

Tests for line model.
 
@author <bprinty@gmail.com>
*/

describe("line.js", function () {

  var base = null;
  var data = null;
  before(function() {
      
      // config
      quorra.debug = false;

      // simulate data
      var entries = 50;
      x = _.range(entries).map(function(d) { return d; });
      y = _.range(entries).map(function(d) { return quorra.random() * d; });
      group = _.range(entries).map(function(d) {
          return quorra.random() > 0.5 ? 'Good' : 'Evil';
      });
      label = _.range(entries).map(function(d, i) { return group[i]+i; });
      data = [];
      for(var i=0; i<x.length; i++){
          data.push({
              x: x[i],
              y: y[i],
              group: group[i],
              label: label[i]
          });
      }

      // set up selection
      base = bind('line.js');

  });

  after(function() {
      reorder(base);
  });

  it("pointline", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var line = quorra.line()
        .bind('#' + id)
        .id(id)
        .data(data)
        .opacity(0.75)
        .xrange([5, 40])
        .lposition("outside")
        .lshape("circle")
        .labelposition("end")
        .yaxis("inside")
        .xaxis("outside")
        .zoomable(true)
        .exportable(true)
        .points(5)
        .xlabel("X Axis Label")
        .ylabel("Y Axis Label")
        .color(['firebrick','steelblue']);

      quorra.render(line);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

  it("area", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var line = quorra.line()
        .bind('#' + id)
        .id(id)
        .data(data)
        .opacity(0.75)
        .xrange([5, 40])
        .layout('area')
        .xticks(10)
        .yticks(10)
        .interpolate("cardinal")
        .lposition("outside")
        .lshape("circle")
        .labelposition("end")
        .yaxis("inside")
        .xaxis("outside")
        .zoomable(true)
        .exportable(true)
        .xlabel("X Axis Label")
        .ylabel("Y Axis Label")
        .color(['firebrick','steelblue']);

      quorra.render(line);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

});