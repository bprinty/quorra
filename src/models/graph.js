function Graph(attributes) {
    /**
    quorra.graph()

    Undirected force grpah. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887235
    
    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // plot-specific attributes
    QuorraPlot.call(this, extend({
        class: "quorra-graph",
        nodes: [],
        links: [],
        charge: -100,
        distance: 60,
        nwformat: function(d){ return d.size + 5; },
        ewformat: function(d){ return d.weight + 1; },
        edgecolor: "auto"
    }, attributes));
    this.type = "graph";

    this.axes = function() {
        // no axes for graph
    }

    this.drawlegend = function() {
        // no legend for plot yet
    }

    this.plot = function() {

        // if height/width are auto, determine them from selection
        var width = (_this.attr.width == "auto") ? parseInt(_this.selection.style("width")) : _this.attr.width;
        var height = (_this.attr.height == "auto") ? parseInt(_this.selection.style("height")) : _this.attr.height;
        width = width - _this.attr.margin.left - _this.attr.margin.right;
        height = height - _this.attr.margin.top - _this.attr.margin.bottom;

        // consolidate data
        _this.plotdata = {nodes: [], links: []};
        if (_this.attr.nodes.length == 0) {
            var nodes = {};
            _this.attr.links.forEach(function(link) {
              nodes[link.source] = {id: link.source};
              nodes[link.target] = {id: link.target};
            });
            _this.plotdata.nodes = d3.values(nodes);
        } else {
            _this.plotdata.nodes = _.map(_this.attr.nodes, function(d) {
                var nd = _.clone(d);
                nd.size = nd.weight;
                return nd;
            });
        }
        var groups = [];
        var edgegroups = [];
        var idxmap = {};
        _this.plotdata.nodes = _.map(_this.plotdata.nodes, function(d, i){
            idxmap[d.id] = i;
            if (d.group === undefined) {
                d.group = "node";
            }
            if (d.size === undefined) {
                d.size = 1;
            }
            if (groups.indexOf(d.group) === -1) {
                groups.push(d.group);
            }
            return d;
        });
        _this.plotdata.links = _.map(_this.attr.links, function(d){
            var nd = _.clone(d);
            nd.source = idxmap[d.source];
            nd.target = idxmap[d.target];
            if (nd.group === undefined) {
                nd.group = "edge";
            }
            if (nd.weight === undefined) {
                nd.weight = 1;
            }
            if (edgegroups.indexOf(nd.edgegroups) === -1) {
                edgegroups.push(nd.edgegroups);
            }
            return nd;
        });

        // configure pallete
        _this.pallette = (_this.attr.color === "auto") ? d3.scale.category10() : d3.scale.ordinal().range(_this.attr.color);
        _this.pallette = _this.pallette.domain(groups);
        _this.edgepallette = (_this.attr.edgecolor === "auto") ? d3.scale.category10() : d3.scale.ordinal().range(_this.attr.edgecolor);
        _this.edgepallette = _this.edgepallette.domain(edgegroups);

        // generate force layout
        var force = d3.layout.force()
            .nodes(_this.plotdata.nodes)
            .links(_this.plotdata.links)
            .size([width, height])
            .linkDistance(_this.attr.distance)
            .charge(_this.attr.charge)
            .on("tick", function() {
              link
                  .attr("x1", function(d) { return d.source.x; })
                  .attr("y1", function(d) { return d.source.y; })
                  .attr("x2", function(d) { return d.target.x; })
                  .attr("y2", function(d) { return d.target.y; });

              node
                  .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
            }).start();

        force.drag().on("dragstart", function(d) {
            d3.event.sourceEvent.stopPropagation();
        });

        // add links
        var link = _this.plotregion
            .selectAll(".link")
            .data(force.links())
            .enter().append("line")
                .attr("stroke", function(d){
                    if (d.group === "edge") {
                        return '#ddd';
                    } else {
                        return _this.edgepallette(d.group);
                    }
                })
                .attr("stroke-width", _this.attr.ewformat)
                .attr("class", "link");

        // add nodes
        var node = _this.plotregion.selectAll(".node")
            .data(force.nodes())
            .enter().append("g")
                .attr("class", "node")
                .attr("fill", function(d) { return _this.pallette(d.group); })
                .on("mouseover", function(d){
                    d3.select(this).select("circle").transition()
                            .duration(250)
                            .attr("r", _this.attr.nwformat(d) + 5);
                    if (_this.attr.tooltip){
                        _this.attr.tooltip.html(d.id)
                            .style("visibility", "visible")
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                })
                .on("mousemove", function(d){
                    if (_this.attr.tooltip) {
                        _this.attr.tooltip
                            .style("left", (d3.event.clientX + 5) + "px")
                            .style("top", (d3.event.clientY - 20) + "px");
                    }
                })
                .on("mouseout", function(d){
                    d3.select(this).select("circle").transition()
                            .duration(250)
                            .attr("r", _this.attr.nwformat(d));
                    if (_this.attr.tooltip) {
                        _this.attr.tooltip.style("visibility", "hidden");
                    }
                }).call(force.drag);

        node.append("circle")
            .attr("r", _this.attr.nwformat);
    }

    this.enablezoom = function() {
        _this.attr.svg.call(d3.behavior.zoom().on("zoom", function(){        
            _this.plotregion.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
        }));
    };

    this.drawglyphs = function() {

    };

    this.enablecrosshairs = function() {
        quorra.log('crosshairs not supported on pie chart');
    };

    return this.go;
};

Graph.prototype = Object.create(QuorraPlot.prototype);
Graph.prototype.constructor = Graph;
quorra.graph = function(attributes) {
    return new Graph(attributes);
};
