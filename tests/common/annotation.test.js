/**

Tests for quorra annotations.
 
@author <bprinty@gmail.com>
*/

describe("annotation.js", function () {

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
      base = bind('annotation.js');

  });

  after(function() {
      reorder(base);
  });

  it("withplot", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var full = quorra.line()
        .bind('#' + id)
        .id(id)
        .data(data)
        .opacity(0.75)
        .points(5)
        .xlabel("X Axis Label")
        .ylabel("Y Axis Label")
        .color(['firebrick','steelblue'])
        .annotation([
            {
                type: 'rect',
                text: 'rect',
                group: 'Evil',
                width: 5,
                height: 5,
                draggable: true,
                x: 5,
                y: 15,
            },
            {
                type: 'triangle',
                size: 20,
                rotate: 90,
                x: 25,
                y: 20
            },
            {
                type: 'circle',
                draggable: true,
                r: 10,
                x: 15,
                y: 20
            },
            {
                type: 'text',
                draggable: true,
                size: 20,
                x: 30,
                y: 20
            }
        ]);

      quorra.render(full);

      checkplot(id);
      var rect = d3.select('svg#' + id).selectAll('.annotation.rect');
      d3expect(rect.select('rect'));
      d3expect(rect.select('text'));
      var circle = d3.select('svg#' + id).selectAll('.annotation.circle');
      d3expect(circle.select('circle'));
      d3expect(circle.select('text'));
      var triangle = d3.select('svg#' + id).selectAll('.annotation.triangle');
      d3expect(triangle.select('path'));
      d3expect(triangle.select('text'));
      var text = d3.select('svg#' + id).selectAll('.annotation.text');
      d3expect(text.select('text'));
  });

  it("add", function () {
      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var line = quorra.line()
        .bind('#' + id)
        .id(id)
        .data(data)
        .opacity(0.75)
        .xlabel("X Axis Label")
        .ylabel("Y Axis Label")
        .color(['firebrick','steelblue']);

      var square = quorra.annotation()
          .bind(line)
          .type('rect')
          .text('rect').group('Evil')
          .x(10).y(15)
          .width(10).height(10)
          .draggable(true)
          .style({
              'fill': 'steelblue'
          });

      line.add(square);
      quorra.render(line);

      checkplot(id);
      var square = d3.select('svg#' + id).selectAll('.annotation.rect');
      console.log(square.select('rect'));
      d3expect(square.select('rect'));
      d3expect(square.select('text'));
  });

});