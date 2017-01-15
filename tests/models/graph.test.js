/**

Tests for graph model.
 
@author <bprinty@gmail.com>
*/

describe("graph.js", function () {

  var base = null;
  var data = null;
  before(function() {
      
      // config
      quorra.debug = false;

      // simulate data
      var groups = ['foo', 'bar', 'baz'];
      data = {
        nodes: [],
        links: []
      };
      data.nodes = _.range(20).map(function(d){
        return {
          id: 'N_' + d,
          weight: quorra.random() * 10,
          group: _.sample(groups)
        };
      });
      data.links = _.range(20).map(function(d){
        return {
          source: _.sample(data.nodes).id,
          target: _.sample(data.nodes).id,
        };
      });

      // set up selection
      base = bind('graph.js');

  });

  after(function() {
      reorder(base);
      if (this.currentTest.state == 'failed') {
          takeScreenshot();
      }
  });

  it("graph", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var graph = quorra.graph()
          .bind('#' + id).id(id)
          .links(data.links)
          .nodes(data.nodes);
          // .zoomable(true);

      quorra.render(graph);

      checkplot(id);
  });

  it("graphlinks", function () {

      var id = quorra.uuid();
      base.append('div').attr('id', id).attr('class', 'plotarea');

      var graphlinks = quorra.graph()
          .bind('#' + id).id(id)
          .links(data.links);
          // .zoomable(true);

      quorra.render(graphlinks);

      checkplot(id);
  });

});