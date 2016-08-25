import { quorra, QuorraPlot } from '../quorra.js';


function Pie(attributes) {
    /**
    quorra.pie()

    Pie chart. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887235
    
    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // plot-specific attributes
    QuorraPlot.call(this, extend({
        class: "quorra-pie",
        aggregate: function(x){ return(x[0]); },
        radius: "auto",
        inner: "auto",
    }, attributes));
    this.type = "pie";

    // overwrite render methods
    this.axes = function() {
        // no axes for pie chart
    }

    this.plot = function() {

        // if height/width are auto, determine them from selection
        var width = (_this.attr.width == "auto") ? parseInt(_this.selection.style("width")) : _this.attr.width;
        var height = (_this.attr.height == "auto") ? parseInt(_this.selection.style("height")) : _this.attr.height;
        width = width - _this.attr.margin.left - _this.attr.margin.right;
        height = height - _this.attr.margin.top - _this.attr.margin.bottom;

        var r = (_this.attr.radius == "auto") ? (Math.min(width, height) / 2) : _this.attr.radius;
        var ir = (_this.attr.inner == "auto") ? 0 : _this.attr.inner;

        // aggregate data
        var newdata = [];
        var gps = _this.pallette.domain();
        for (var i in gps){
            var subdat = _.filter(_this.data, function(d){ return d.group == gps[i]; });
            newdata.push({
                x: _this.attr.aggregate(_.map(subdat, function(d){ return d.x; })),
                group: gps[i],
                label: (subdat.length <= 1) ? gps[i] : subdat.length + " " + gps[i]
            });
        }

        var arc = d3.svg.arc()
            .outerRadius(r)
            .innerRadius(ir);

        var pie = d3.layout.pie()
            .sort(null)
            .value(function(d){ return d.x; });

        // plot
        var g = _this.plotregion
            .attr("transform", "translate(" + (_this.innerwidth / 2) + "," + (_this.innerheight / 2) + ")")
            .selectAll(".arc")
            .data(pie(newdata))
            .enter().append("g")
            .attr("class", function(d){
                return "arc g_" + d.data.group;
            })
            .style("visibility", function(d){
                return _.contains(_this.attr.toggled, _this.attr.group(d.data)) ? 'hidden' : 'visible';
            });

        g.append("path")
            .attr("d", arc)
            .style("fill", function(d, i) { return _this.pallette(_this.attr.group(d.data, i)); })
            .style("opacity", _this.attr.opacity)
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.html(_this.attr.label(d.data, i))
                        .style("visibility", "visible")
                        .style("left", (d3.event.clientX + 5) + "px")
                        .style("top", (d3.event.clientY - 20) + "px");
                }
            }).on("mousemove", function(d){
                if (_this.attr.tooltip){
                    _this.attr.tooltip
                        .style("left", (d3.event.clientX + 5) + "px")
                        .style("top", (d3.event.clientY - 20) + "px");
                }
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", _this.attr.opacity);
                if (_this.attr.tooltip){
                    _this.attr.tooltip.style("visibility", "hidden");
                }
            }).on("click", _this.attr.events.click);
    }

    return this.go;
};

Pie.prototype = Object.create(QuorraPlot.prototype);
Pie.prototype.constructor = Pie;
quorra.pie = function(attributes) {
    return new Pie(attributes);
};
