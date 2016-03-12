/**

Tests for pie model.
 
@author <bprinty@gmail.com>
*/

describe("pie.js", function () {

  var base = null;
  var data = null;
  before(function() {
      
      // config
      quorra.debug = false;

      // simulate data
      var entries = 200;
      x = _.range(entries).map(function(d) { return quorra.random() * d; });
      group = _.range(entries).map(function(d) {
          return quorra.random() > 0.5 ? 'Good' : ( quorra.random() > 0.5 ? 'Evil' : 'Okay' );
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
      base = bind('pie.js');

  });

  after(function() {
      reorder(base);
  });

  it("pie", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var pie = quorra.pie()
          .bind('#' + id)
          .id(id)
          .data(data)
          .radius(125)
          .opacity(0.75)
          .lshape("circle")
          .tooltip(false)
          .color(['firebrick','forestgreen','steelblue'])
          .aggregate(function(x){ return(x.length); });

      quorra.render(pie);

      validate(id);
  });

  it("hollowpie", function () {
      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var hollowpie = quorra.pie()
          .bind('#' + id)
          .id(id)
          .data([
              {x: 50, group: "Good", label: "Good"},
              {x: 150, group: "Evil", label: "Evil"},
              {x: 20, group: "Okay", label: "Okay"}
          ]).legend(false)
          .radius(125)
          .opacity(0.75)
          .inner(50)
          .color(['firebrick','forestgreen','steelblue']);

      quorra.render(hollowpie);

      validate(id);
  });

});