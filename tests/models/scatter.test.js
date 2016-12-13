/**

Tests for scatter model.
 
@author <bprinty@gmail.com>
*/

describe("scatter.js", function () {

  var base = null;
  var data = null;
  var jdata = null;
  var ldata = null;
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

      // jitterline data
      var entries = 4;
      var samples = 5;
      ldata = [];
      for(var i=0; i<(entries+1); i++) {
        for(var j=0; j<(samples + 1); j++) {
          ldata.push({
            x: 'E' + i,
            y: quorra.random() * 10,
            group: 'S' + j,
            label: 'E' + i + ', S' + j, 
          });
        }
      }

      // set up selection
      base = bind('scatter.js');

  });

  after(function() {
      reorder(base);
      if (this.currentTest.state == 'failed') {
          takeScreenshot();
      }
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
          .exportable(true)
          .crosshairs(true)
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
          .exportable(true)
          .crosshairs(true)
          .ydensity(true)
          .xlabel("Group")
          .ylabel("Y Axis Label")
          .color(['firebrick','steelblue']);

      quorra.render(jitter);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

  it("jitterline", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var jitterline = quorra.scatter()
          .bind('#' + id)
          .id(id)
          .data(ldata)
          .xjitter(15)
          .size(5)
          .opacity(0.75)
          .legend(false)
          .zoomable(true)
          .exportable(true)
          .crosshairs(true)
          .line("hover")
          .yrange([0, 10])
          .hovercolor('firebrick')
          .xlabel("X Axis Label")
          .ylabel("Y Axis Label")
          .color(['steelblue']);

      quorra.render(jitterline);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

});