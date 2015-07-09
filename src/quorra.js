/*
 * Reusable visualization library.
 *
 * @author Blake Printy <bprinty@gmail.com>
 * ----------------------------------------------- */


(function() {
    "use strict";

    function quorra() {
        /**
        quorra()

        Base class for all visualization components, as to not pollute the 
        global namespace.

        This is where it all begins ... Fight for the Users!
        */
    }

    // random number generation with seeding
    var seed = Math.round(Math.random()*100000);
    quorra.seed = function(value){
        if (!arguments.length) return seed;
        seed = value;
    }
    quorra.random = function() {
        if (typeof seed == "undefined") seed = 42;
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    // scatter plot
    quorra.scatter = function() {
        /**
        quorra.scatter()

        Scatter plot. Code for generating this type of plot was inspired from:
        http://bl.ocks.org/mbostock/3887118
        */

        // attributes
        var width = "auto";
        var height = "auto";
        var margin = {"top": 20, "bottom": 20, "left": 30, "right": 20};
        var color = d3.scale.category10();
        var x = function(d, i) { return d.x; };
        var y = function(d, i) { return d.y; };
        var group = function(d, i){ return (typeof d.group == "undefined") ? 0 : d.group; };
        var label = function(d, i){ return (typeof d.label == "undefined") ? i : d.label; };
        var size = function(d, i){ return (typeof d.size == "undefined") ? 5 : d.size; };
        var shape = function(d, i){ return (typeof d.shape == "undefined") ? "circle" : d.shape; };
        var lm = false; // options are "smooth", "poly-x" (x is order), and "linear"
        var xlabel = "x";
        var ylabel = "y";
        var legend = true;
        var xjitter = 0;
        var yjitter = 0;
        var tooltip = d3.select("body").append("div")
                .attr("id", "scatter-tooltip")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("opacity", 0);

        // generator
        function go(selection){
            // format selection
            if (typeof selection == "string") selection = d3.select(selection);

            // if height/width are auto, determine them from selection
            var w = (width == "auto") ? (parseInt(selection.style("width")) - margin.left - margin.right) : width;
            var h = (height == "auto") ? (parseInt(selection.style("height")) - margin.top - margin.bottom) : height;
            
            // configure axes
            if (typeof selection.data()[0][0].x == 'string') {
                var xGroups = _.unique(_.map(selection.data()[0], function(d){ return d.x; }));
                var xScale = d3.scale.ordinal().range([w/(xGroups.length+2), w - w/(xGroups.length+2)]);
                xScale.domain(xGroups);
            }else{
                var xScale = d3.scale.linear().range([0, w]);
                xScale.domain(d3.extent(data, x)).nice();
            }
            if (typeof selection.data()[0][0].y == 'string') {
                var yGroups = _.unique(_.map(selection.data()[0], function(d){ return d.y; }));
                var yScale = d3.scale.ordinal().range([h - h/(yGroups.length+2), h/(yGroups.length+2)]);
                yScale.domain(yGroups);
            }else{
                var yScale = d3.scale.linear().range([h, 0]);
                yScale.domain(d3.extent(data, y)).nice();
            }
            var xAxis = d3.svg.axis().scale(xScale).orient("bottom");
            var yAxis = d3.svg.axis().scale(yScale).orient("left");

            // initialize canvas
            var svg = selection.append("svg")
                .attr("class", "quorra-scatter")
                .attr("width", w + margin.left + margin.right)
                .attr("height", h + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // axes
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + h + ")")
                .call(xAxis)
            .append("text")
                .attr("class", "label")
                .attr("x", w)
                .attr("y", -6)
                .style("text-anchor", "end")
                .text(xlabel);

            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
            .append("text")
                .attr("class", "label")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text(ylabel)

            // plotting points
            svg.selectAll(".dot")
                .data(svg.data()[0])
                .enter().append("circle")
                .attr("class", "dot")
                .attr("r", size)
                .attr("cx", function(d, i) { return (Math.random()-0.5)*xjitter + xScale(x(d, i)); })
                .attr("cy", function(d, i) { return (Math.random()-0.5)*yjitter + yScale(y(d, i)); })
                .style("fill", function(d, i) { return color(group(d, i)); })
                .style("opacity", 0.75)
                .on("mouseover", function(d, i){
                    d3.select(this).style("opacity", 0.25);
                    tooltip.html(label(d, i))
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }).on("mousemove", function(d){
                    tooltip
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }).on("mouseout", function(d){
                    d3.select(this).style("opacity", 0.75);
                    tooltip.style("opacity", 0);
                });

            // generating regression line with smoothing curve (if specified)
            if (lm != false){
                console.log("Not yet implemented!");
            }

            // legend (if specified)
            if (legend) {
                var leg = svg.selectAll(".legend")
                    .data(color.domain())
                    .enter().append("g")
                    .attr("class", "legend")
                    .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

                leg.append("rect")
                    .attr("x", width - 18)
                    .attr("width", 18)
                    .attr("height", 18)
                    .style("fill", color);

                leg.append("text")
                    .attr("x", width - 24)
                    .attr("y", 9)
                    .attr("dy", ".35em")
                    .style("text-anchor", "end")
                    .text(function(d) { return d; });
            }
        }

        // getters/setters
        go.width = function(value) {
            if (!arguments.length) return width;
            width = value;
            return go;
        };
        go.height = function(value) {
            if (!arguments.length) return height;
            height = value;
            return go;
        };
        go.margin = function(value) {
            if (!arguments.length) return margin;
            margin = value;
            return go;
        };
        go.color = function(value) {
            if (!arguments.length) return color;
            color = value;
            return go
        }
        go.x = function(value) {
            if (!arguments.length) return x;
            x = value;
            return go
        }
        go.y = function(value) {
            if (!arguments.length) return y;
            y = value;
            return go
        }
        go.group = function(value) {
            if (!arguments.length) return group;
            group = value;
            return go
        }
        go.label = function(value) {
            if (!arguments.length) return label;
            label = value;
            return go
        }
        go.size = function(value) {
            if (!arguments.length) return size;
            size = value;
            return go
        }
        go.shape = function(value) {
            if (!arguments.length) return shape;
            shape = value;
            return go
        }
        go.lm = function(value) {
            if (!arguments.length) return lm;
            lm = value;
            return go
        }
        go.xjitter = function(value) {
            if (!arguments.length) return xjitter;
            xjitter = value;
            return go
        }
        go.yjitter = function(value) {
            if (!arguments.length) return yjitter;
            yjitter = value;
            return go
        }
        go.xlabel = function(value) {
            if (!arguments.length) return xlabel;
            xlabel = value;
            return go
        }
        go.ylabel = function(value) {
            if (!arguments.length) return ylabel;
            ylabel = value;
            return go
        }
        go.legend = function(value) {
            if (!arguments.length) return legend;
            legend = value;
            return go
        }
        go.tooltip = function(value) {
            if (!arguments.length) return tooltip;
            tooltip = value;
            return go
        }

        return go;
    };

    // pie chart
    quorra.pie = function() {
        /**
        quorra.pie()

        Pie chart. Code for generating this type of plot was inspired from:
        http://bl.ocks.org/mbostock/3887235
        */

        // attributes
        var radius = "auto";
        var inner = "auto";
        var width = "auto";
        var height = "auto";
        var margin = {"top": 20, "bottom": 20, "left": 20, "right": 20};
        var color = d3.scale.category10();
        var x = function(d, i) { return d.x; };
        var group = function(d, i){ return (typeof d.group == "undefined") ? i : d.group; };
        var label = function(d, i){ return (typeof d.label == "undefined") ? i : d.label[0]; };
        var aggregate = function(x){ return(x[0]); }
        var legend = true;
        var tooltip = d3.select("body").append("div")
                .attr("id", "pie-tooltip")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("opacity", 0);

        // generator
        function go(selection){
            // format selection
            if (typeof selection == "string") selection = d3.select(selection);

            // if height/width are auto, determine them from selection
            var w = (width == "auto") ? (parseInt(selection.style("width")) - margin.left - margin.right) : width;
            var h = (height == "auto") ? (parseInt(selection.style("height")) - margin.top - margin.bottom) : height;
            var r = (radius == "auto") ? (Math.max(w, h)) : radius;
            var ir = (inner == "auto") ? 0 : inner;

            // aggregate data
            var data = selection.data()[0];
            var newdata = [];
            var gps = _.unique(_.map(data, function(d){ return( d.group ); }));
            for (var i in gps){
                var subdat = _.filter(data, function(d){ return d.group == gps[i]; });
                newdata.push({
                    x: aggregate(_.map(subdat, function(d){ return d.x; })),
                    group: gps[i],
                    label: _.map(subdat, function(d){ return d.label; })
                });
            }

            // initialize canvas
            var arc = d3.svg.arc()
                .outerRadius(r)
                .innerRadius(ir);

            var pie = d3.layout.pie()
                .sort(null)
                .value(function(d){ return d.x; });

            var svg = selection.append("svg")
                .attr("class", "quorra-pie")
                .attr("width", w + margin.left + margin.right)
                .attr("height", h + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + (w + margin.left + margin.right) / 2 + "," + (h + margin.top + margin.bottom) / 2 + ")");

            // plot
            var g = svg.selectAll(".arc")
                .data(pie(newdata))
                .enter().append("g")
                .attr("class", "arc");

            g.append("path")
                .attr("d", arc)
                .style("fill", function(d, i) { return color(group(d, i)); })
                .style("opacity", 0.75)
                .on("mouseover", function(d, i){
                    d3.select(this).style("opacity", 0.25);
                    if (tooltip == false) { return 0; }
                    tooltip.html(label(d.data, i))
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }).on("mousemove", function(d){
                    if (tooltip == false) { return 0; }
                    tooltip
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }).on("mouseout", function(d){
                    d3.select(this).style("opacity", 0.75);
                    if (tooltip == false) { return 0; }
                    tooltip.style("opacity", 0);
                });

            // legend (if specified)
            if (legend) {
                g.append("text")
                    .attr("class", "axis")
                    .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
                    .attr("dy", ".35em")
                    .style("text-anchor", "middle")
                    .text(function(d) { return label(d.data, i); });
            }
        }

        // getters/setters
        go.width = function(value) {
            if (!arguments.length) return width;
            width = value;
            return go;
        };
        go.height = function(value) {
            if (!arguments.length) return height;
            height = value;
            return go;
        };
        go.radius = function(value) {
            if (!arguments.length) return radius;
            radius = value;
            return go;
        };
        go.inner = function(value) {
            if (!arguments.length) return inner;
            inner = value;
            return go;
        };
        go.margin = function(value) {
            if (!arguments.length) return margin;
            margin = value;
            return go;
        };
        go.color = function(value) {
            if (!arguments.length) return color;
            color = value;
            return go
        }
        go.x = function(value) {
            if (!arguments.length) return x;
            x = value;
            return go
        }
        go.group = function(value) {
            if (!arguments.length) return group;
            group = value;
            return go
        }
        go.label = function(value) {
            if (!arguments.length) return label;
            label = value;
            return go
        }
        go.aggregate = function(value) {
            if (!arguments.length) return aggregate;
            aggregate = value;
            return go
        }
        go.legend = function(value) {
            if (!arguments.length) return legend;
            legend = value;
            return go
        }
        go.tooltip = function(value) {
            if (!arguments.length) return tooltip;
            tooltip = value;
            return go
        }

        return go;
    };
    // bar
    // histogram
    // density plot
    // boxplot
    // line plot
    // venn diagram

    // expose internals to global namespace
    window.quorra = quorra;
})();
