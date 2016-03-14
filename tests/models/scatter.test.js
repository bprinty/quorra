/**

Tests for scatter model.
 
@author <bprinty@gmail.com>
*/

describe("scatter.js", function () {

  var base = null;
  var data = null;
  before(function() {
      
      // config
      quorra.debug = false;

      // simulate data
      var entries = 200;
      x = _.range(entries).map(function(d) { return quorra.random() * d; });
      y = _.range(entries).map(function(d) { return quorra.random() * d; });
      group = _.range(entries).map(function(d) {
          return quorra.random() > 0.5 ? 'Good' : 'Evil';
      });
      label = _.range(entries).map(function(d, i) { return group[i]+i; });
      data = [];
      jdata = [];
      for(var i=0; i<x.length; i++){
          data.push({
              x: x[i],
              y: y[i],
              group: group[i],
              label: label[i]
          });
          jdata.push({
              x: group[i],
              y: y[i],
              group: group[i],
              label: label[i]
          });
      }

      // set up selection
      base = bind('scatter.js');

  });

  after(function() {
      reorder(base);
  });

  it("scatter", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var scatter = quorra.scatter()
          .bind('#' + id)
          .id(id)
          .data(data)
          .grid(true)
          .opacity(0.75)
          .lshape("circle")
          .zoomable(true)
          .yticks(10)
          .xticks(10)
          .xlabel("X Axis Label")
          .ylabel("Y Axis Label")
          .color(['firebrick','steelblue']);

      quorra.render(scatter);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

  it("jitter", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var jitter = quorra.scatter()
          .bind('#' + id)
          .id(id)
          .data(jdata)
          .xjitter(100)
          .opacity(0.75)
          .lposition("outside")
          .lshape("circle")
          .zoomable(true)
          .ydensity(true)
          .xlabel("Group")
          .ylabel("Y Axis Label")
          .color(['firebrick','steelblue']);

      quorra.render(jitter);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

});