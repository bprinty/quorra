/**

Tests for multiline model.
 
@author <bprinty@gmail.com>
*/

describe("multiline.js", function () {

  var base = null;
  var data = null;
  before(function() {
      
      // config
      quorra.debug = false;

      // simulate data
      var samples = 10;
      var metrics = 4;
      data = [];
      for(var i=1; i<=metrics; i++){
          x = _.range(samples).map(function(d){ return quorra.random()*i; })
          for(var j=0; j<x.length; j++) {
              data.push({
                  x: 'Metric' + i,
                  y: x[j],
                  group: 'S' + j,
                  label: 'S' + j
              });
          }
      }

      // set up selection
      base = bind('multiline.js');

  });

  after(function() {
      reorder(base);
  });

  it("multiline", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var multiline = quorra.multiline()
        .bind('#' + id)
        .id(id)
        .data(data)
        .points(3)
        .zoomable(true)
        .exportable(true)
        .hovercolor('firebrick')
        .opacity(0.75)
        .selectable("single")
        .color(['steelblue']);

      quorra.render(multiline);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

  it("multilineranges", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var multiline = quorra.multiline()
        .bind('#' + id)
        .id(id)
        .data(data)
        .points(3)
        .zoomable(true)
        .exportable(true)
        .yranges({
          'Metric1': [0, 1],
          'Metric2': [0, 2],
          'Metric3': [0, 3]
        })
        .opacity(0.75);

      quorra.render(multiline);

      checkplot(id);
      checkaxis(id);
      checkglyphs(id);
  });

});