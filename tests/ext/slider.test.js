/**

Tests for quorra annotations.
 
@author <bprinty@gmail.com>
*/

describe("slider.js", function () {

  var base = null;
  var data = null;
  before(function() {
      
      // config
      quorra.debug = false;

      // jitterline data
      var entries = 4;
      var samples = 5;
      data = [];
      for(var i=0; i<(entries+1); i++) {
        for(var j=0; j<(samples + 1); j++) {
          data.push({
            x: 'E' + i,
            y: quorra.random() * 10,
            group: 'S' + j,
            label: 'E' + i + ', S' + j, 
          });
        }
      }

      // set up selection
      base = bind('slider.js');

  });

  after(function() {
      reorder(base);
  });

  it("slider", function () {

      var plot = quorra.uuid();
      base.append('div').attr('id', plot).attr('class', 'plotarea');

      var jitterline = quorra.scatter()
          .bind('#' + plot)
          .id(plot)
          .data(data)
          .xjitter(15)
          .size(5)
          .opacity(0.75)
          .legend(false)
          .zoomable(true)
          .exportable(true)
          .line("hover")
          .yrange([0, 10])
          .xrange([0.5, 2.5])
          .hovercolor('firebrick')
          .xlabel("X Axis Label")
          .ylabel("Y Axis Label")
          .color(['steelblue']);

      var slider = quorra.uuid();
      base.append('div').attr('id', slider).attr('class', 'slider');
      
      var thumbnail = quorra.line()
          .bind('#' + slider)
          .id(slider)
          .data(data)
          .yrange([0, 10])
          .opacity(0.75)
          .legend(false)
          .xaxis("hidden")
          .yaxis("hidden")
          .color(['steelblue']);

      jitterline.slider(thumbnail);

      quorra.render(jitterline);

      checkplot(plot);
      checkaxis(plot);
      checkglyphs(plot);
      checkplot(slider);
  });

});