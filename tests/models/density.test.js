/**

Tests for density model.
 
@author <bprinty@gmail.com>
*/

describe("density.js", function () {

  var base = null;
  var data = null;
  before(function() {
      
      // config
      quorra.debug = false;

      // simulate data
      var entries = 200;
      x = _.range(entries).map(function(d) { return quorra.random(); });
      group = _.range(entries).map(function(d) {
          return quorra.random() > 0.5 ? 'Good' : 'Evil';
      });
      label = _.range(entries).map(function(d, i) { return group[i]+i; });
      data = [];
      for(var i=0; i<x.length; i++){
          data.push({
              x: x[i],
              group: group[i],
              label: label[i]
          });
      }

      // set up selection
      base = bind('density.js');

  });

  after(function() {
      reorder(base);
  });

  it("density", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var density = quorra.density()
          .bind('#' + id)
          .id(id)
          .data(data)
          .grid(true)
          .opacity(0.75)
          .zoomable(true)
          .exportable(true)
          .margin({'left': 60})
          .yticks(10).xticks(10)
          .yformat(d3.format('0.5f'))
          .labelpadding({y: -20})
          .resolution(20)
          .xlabel("X Axis Label")
          .ylabel("Density")
          .color(['firebrick','steelblue']);

      quorra.render(density);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

  it("lowdensity", function () {
      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      // regular scatter
      var lowdensity = quorra.density()
          .bind('#' + id)
          .id(id)
          .data(data)
          .opacity(0.75)
          .lposition("outside")
          .lshape("circle")
          .zoomable(true)
          .exportable(true)
          .yformat(d3.format('0.5f'))
          .margin({'left': 70})
          .labelpadding({y: -30})
          .resolution(5)
          .points(5)
          .xlabel("X Axis Label")
          .ylabel("Density")
          .color(['firebrick','steelblue']);

      quorra.render(lowdensity);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

});