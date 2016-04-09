/**

Tests for common quorra functionality.
 
@author <bprinty@gmail.com>
*/

describe("histogram.js", function () {

  var base = null;
  var data = null;
  before(function() {
      
      // config
      quorra.debug = false;

      // simulate data
      var values = d3.range(1000).map(d3.random.bates(10));
      data = _.map(values, function(d, i){
          var grp = (quorra.random() > 0.5) ? "Good" : "Evil";
          return {
              x: d,
              y: i,
              group: grp,
              label: grp + i
          };
      });

      // set up selection
      base = bind('histogram.js');

  });

  after(function() {
      reorder(base);
  });

  it("grouped", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var grouped = quorra.histogram()
          .bind('#' + id)
          .id(id)
          .data(data)
          .opacity(0.75)
          .grid(true)
          .zoomable(true)
          .exportable(true)
          .bins(5)
          .layout("grouped")
          .display("counts")
          .xlabel("X Axis Label")
          .ylabel("Counts")
          .color(['firebrick','steelblue']);

      quorra.render(grouped);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

  it("lowdensity", function () {
      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var stacked = quorra.histogram()
          .bind('#' + id)
          .id(id)
          .data(data)
          .layout("stacked")
          .bins(10)
          .opacity(0.75)
          .zoomable(true)
          .exportable(true)
          .margin({'left': 50})
          .lposition("outside")
          .lshape("circle")
          .display("percent")
          .xlabel("X Axis Label")
          .ylabel("Percent")
          .yformat(d3.format("%"))
          .labelpadding({y: -10})
          .color(['firebrick','steelblue']);

      quorra.render(stacked);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

});